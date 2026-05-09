const Client = require('ssh2').Client;
const crypto = require('crypto');
const { stmts, rebuildDuplicateGroups } = require('../db');

// Supported media extensions
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'heic', 'heif', 'svg', 'ico']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', 'mpeg', 'mpg', '3gp']);
const AUDIO_EXTS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']);

const ALL_MEDIA = new Set([...IMAGE_EXTS, ...VIDEO_EXTS, ...AUDIO_EXTS]);

function getMediaType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  return null;
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', tiff: 'image/tiff', tif: 'image/tiff',
    heic: 'image/heic', heif: 'image/heif', svg: 'image/svg+xml', ico: 'image/x-icon',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm', flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv', m4v: 'video/x-m4v', mpeg: 'video/mpeg', mpg: 'video/mpeg',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
    ogg: 'audio/ogg', wma: 'audio/x-ms-wma', m4a: 'audio/mp4',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Scan a remote directory recursively over SSH and register files
 * @param {Object} server - { id, host, port, username, password }
 * @param {string} remotePath - Path to scan
 * @param {Function} onProgress - Callback({ scanned, total, current })
 * @returns {Promise<{ filesAdded: number, duplicatesFound: number }>}
 */
function scanDirectory(server, remotePath, onProgress) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    conn.on('ready', () => {
      console.log(`[Scanner] Connected to ${server.host}`);

      // Step 1: Find all media files recursively
      const findCmd = `find "${remotePath}" -type f \\( ${
        [...ALL_MEDIA].map(ext => `-iname "*.${ext}"`).join(' -o ')
      } \\) -printf "%s\\t%p\\n" 2>/dev/null | head -100000`;

      conn.exec(findCmd, (err, stream) => {
        if (err) return reject(err);

        let rawData = '';
        stream.on('data', (chunk) => { rawData += chunk; });

        stream.on('close', (code) => {
          if (code !== 0) {
            conn.end();
            return reject(new Error(`Scan command failed with code ${code}`));
          }

          // Parse file list: size\tpath
          const fileEntries = rawData.trim().split('\n')
            .filter(line => line.trim())
            .map(line => {
              const [sizeStr, filePath] = line.split('\t');
              if (!filePath) return null;
              const fileName = filePath.split('/').pop();
              const mediaType = getMediaType(fileName);
              if (!mediaType) return null; // Skip non-media
              return {
                size: parseInt(sizeStr) || 0,
                filePath: filePath.trim(),
                fileName,
                mediaType,
                mimeType: getMimeType(fileName),
              };
            })
            .filter(Boolean);

          console.log(`[Scanner] Found ${fileEntries.length} media files`);

          // Step 2: Compute checksums for each file
          const results = { filesAdded: 0, duplicatesFound: 0 };
          let index = 0;

          function processNext() {
            if (index >= fileEntries.length) {
              // All done - rebuild duplicate groups
              const dupes = rebuildDuplicateGroups();
              results.duplicatesFound = dupes;

              conn.end();
              resolve(results);
              return;
            }

            // Batch process: compute checksums in small batches
            const batch = fileEntries.slice(index, index + 5);
            index += batch.length;

            const checksumPromises = batch.map(entry =>
              computeChecksum(conn, entry.filePath)
            );

            Promise.all(checksumPromises)
              .then(results => {
                // Insert into database
                const insertBatch = db.prepare(`
                  INSERT OR REPLACE INTO files (server_id, file_path, file_name, file_size, checksum, media_type, mime_type, scanned_at)
                  VALUES (@server_id, @file_path, @file_name, @file_size, @checksum, @media_type, @mime_type, datetime('now'))
                `);

                const insertMany = db.transaction((entries) => {
                  for (const entry of entries) {
                    insertBatch.run(entry);
                  }
                });

                const dbEntries = batch.map((entry, i) => ({
                  server_id: server.id,
                  file_path: entry.filePath,
                  file_name: entry.fileName,
                  file_size: entry.size,
                  checksum: results[i],
                  media_type: entry.mediaType,
                  mime_type: entry.mimeType,
                }));

                insertMany(dbEntries);
                results.filesAdded += batch.length;

                // Progress callback
                if (onProgress) {
                  onProgress({
                    scanned: index,
                    total: fileEntries.length,
                    current: batch[batch.length - 1]?.fileName,
                  });
                }

                // Continue with next batch
                setImmediate(processNext);
              })
              .catch(err => {
                console.error(`[Scanner] Checksum error:`, err.message);
                setImmediate(processNext); // Skip failed files
              });
          }

          processNext();
        });
      });
    });

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
      keepaliveCountMax: 5,
    });
  });
}

function computeChecksum(conn, remotePath) {
  return new Promise((resolve, reject) => {
    // Use sha256sum on the remote server for speed
    conn.exec(`sha256sum "${remotePath}" 2>/dev/null`, (err, stream) => {
      if (err) return reject(err);

      let output = '';
      stream.on('data', (chunk) => { output += chunk; });
      stream.on('close', (code) => {
        if (code !== 0) {
          // Fallback: if sha256sum fails, generate a hash from size+path
          return resolve('unavailable');
        }
        const hash = output.trim().split(' ')[0];
        resolve(hash || 'unknown');
      });
    });
  });
}

module.exports = { scanDirectory, getMediaType, getMimeType, IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS };
