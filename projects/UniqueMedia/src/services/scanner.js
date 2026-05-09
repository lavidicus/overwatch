const Client = require('ssh2').Client;
const { stmts, rebuildDuplicateGroups, db } = require('../db');

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

function scanDirectory(server, remotePath, onProgress) {
  return new Promise((resolve, reject) => {
    const results = { filesAdded: 0, duplicatesFound: 0, errors: 0 };

    function report(status, scanned, total, current, filesAdded, errors) {
      if (onProgress) {
        onProgress({
          status,
          scanned,
          total,
          current,
          filesAdded: filesAdded ?? results.filesAdded,
          errors: errors ?? results.errors,
        });
      }
    }

    const conn = new Client();

    conn.on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    conn.on('ready', () => {
      console.log(`[Scanner] Connected to ${server.host}, scanning ${remotePath}`);
      report('finding', 0, 0, 'Finding media files...', 0, 0);

      const findCmd = `find "${remotePath}" -type f \\( ${
        [...ALL_MEDIA].map(ext => `-iname "*.${ext}"`).join(' -o ')
      } \\) -printf "%s\\t%p\\n" 2>/dev/null | head -100000`;

      conn.exec(findCmd, (err, stream) => {
        if (err) {
          report('error', 0, 0, err.message, 0, 0);
          return reject(err);
        }

        let rawData = '';
        stream.on('data', (chunk) => { rawData += chunk; });

        stream.on('close', (code) => {
          if (code !== 0) {
            conn.end();
            return reject(new Error(`Scan command failed with code ${code}`));
          }

          const fileEntries = rawData.trim().split('\n')
            .filter(line => line.trim())
            .map(line => {
              const [sizeStr, filePath] = line.split('\t');
              if (!filePath) return null;
              const fileName = filePath.split('/').pop();
              const mediaType = getMediaType(fileName);
              if (!mediaType) return null;
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
          report('checksumming', 0, fileEntries.length, 'Starting checksums...', 0, 0);

          if (fileEntries.length === 0) {
            conn.end();
            return resolve({ filesAdded: 0, duplicatesFound: 0, errors: 0 });
          }

          let index = 0;
          let errors = 0;
          const BATCH_SIZE = 3;

          const insertBatch = db.prepare(`
            INSERT OR IGNORE INTO files (server_id, file_path, file_name, file_size, checksum, media_type, mime_type, scanned_at)
            VALUES (@server_id, @file_path, @file_name, @file_size, @checksum, @media_type, @mime_type, datetime('now'))
          `);

          const insertMany = db.transaction((entries) => {
            for (const entry of entries) {
              insertBatch.run(entry);
            }
          });

          function processNext() {
            if (index >= fileEntries.length) {
              const dupes = rebuildDuplicateGroups();
              results.duplicatesFound = dupes;
              report('complete', fileEntries.length, fileEntries.length, 'Scan complete!', results.filesAdded, errors);
              console.log(`[Scanner] Done: ${results.filesAdded} files, ${dupes} dup groups, ${errors} errors`);
              conn.end();
              resolve(results);
              return;
            }

            const batch = fileEntries.slice(index, index + BATCH_SIZE);
            index += batch.length;

            const checksumTasks = batch.map(entry => {
              return new Promise((res) => {
                conn.exec(`sha256sum "${entry.filePath}" 2>/dev/null`, (err, s) => {
                  if (err) return res(null);
                  let out = '';
                  s.on('data', (c) => { out += c; });
                  s.on('close', (code) => {
                    if (code !== 0) return res(null);
                    const hash = out.trim().split(' ')[0];
                    res(hash || null);
                  });
                });
              });
            });

            Promise.all(checksumTasks).then(checksums => {
              const dbEntries = [];
              for (let i = 0; i < batch.length; i++) {
                const entry = batch[i];
                const checksum = checksums[i];
                if (checksum) {
                  dbEntries.push({
                    server_id: server.id,
                    file_path: entry.filePath,
                    file_name: entry.fileName,
                    file_size: entry.size,
                    checksum,
                    media_type: entry.mediaType,
                    mime_type: entry.mimeType,
                  });
                } else {
                  errors++;
                }
              }

              if (dbEntries.length > 0) {
                insertMany(dbEntries);
                results.filesAdded += dbEntries.length;
              }

              results.errors = errors;
              const current = batch[batch.length - 1]?.fileName || '';
              report('checksumming', index, fileEntries.length, current, results.filesAdded, errors);

              setImmediate(processNext);
            }).catch(err => {
              console.error(`[Scanner] Batch error:`, err.message);
              errors++;
              results.errors = errors;
              setImmediate(processNext);
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

function getScanStatus(serverId) {
  return { status: 'idle', scanned: 0, total: 0, current: '', error: null };
}

module.exports = { scanDirectory, getMediaType, getMimeType, IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS, getScanStatus };
