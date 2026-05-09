const Client = require('ssh2').Client;
const { getConnectOptions } = require('./ssh-conn');

/**
 * List one directory level — returns entries with media file counts.
 */
function listDirectoryWithCounts(server, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('error', (err) => reject(err));
    conn.on('ready', () => {
      // Get immediate subdirectories
      conn.exec(`find "${remotePath}" -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort`, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        let output = '';
        stream.on('data', (chunk) => { output += chunk; });
        stream.on('close', (code) => {
          if (code !== 0) { conn.end(); return reject(new Error(`Find failed: ${output}`)); }

          const dirs = output.trim().split('\n').filter(Boolean);
          if (dirs.length === 0) {
            conn.end();
            return resolve({ path: remotePath, name: remotePath.split('/').filter(Boolean).pop() || '/', children: [], mediaCount: 0 });
          }

          // Count media files in each subdirectory (immediate children only)
          const mediaExts = ['jpg','jpeg','png','gif','bmp','webp','tiff','tif','heic','heif',
                             'mp4','mov','avi','mkv','webm','flv','wmv','m4v','mpeg','mpg',
                             'mp3','wav','flac','aac','ogg','wma','m4a'];
          const extPattern = mediaExts.map(e => `-iname "*.${e}"`).join(' -o ');

          const countPromises = dirs.map(dirPath => {
            return new Promise((res) => {
              conn.exec(`find "${dirPath}" -maxdepth 1 -type f \\( ${extPattern} \\) 2>/dev/null | wc -l`, (err, s) => {
                if (err) return res(0);
                let out = '';
                s.on('data', (c) => { out += c; });
                s.on('close', () => res(parseInt(out.trim()) || 0));
              });
            });
          });

          Promise.all(countPromises).then(counts => {
            conn.end();
            const children = dirs.map((dirPath, i) => ({
              path: dirPath,
              name: dirPath.split('/').filter(Boolean).pop() || '/',
              isDir: true,
              children: null, // Lazy load on click
              loaded: false,
              mediaCount: counts[i] || 0,
            }));

            resolve({
              path: remotePath,
              name: remotePath.split('/').filter(Boolean).pop() || '/',
              isDir: true,
              children,
              mediaCount: counts.reduce((a, b) => a + b, 0),
            });
          });
        });
      });
    });
    conn.connect(getConnectOptions(server));
  });
}

/**
 * Expand a single directory node by loading its children.
 */
function expandDirectory(server, dirPath) {
  return listDirectoryWithCounts(server, dirPath).then(result => {
    return result.children;
  });
}

/**
 * Count total files and media files in a directory recursively
 */
function countFiles(server, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('error', (err) => reject(err));
    conn.on('ready', () => {
      const mediaExts = ['jpg','jpeg','png','gif','bmp','webp','tiff','tif','heic','heif',
                         'mp4','mov','avi','mkv','webm','flv','wmv','m4v','mpeg','mpg',
                         'mp3','wav','flac','aac','ogg','wma','m4a'];
      const extPattern = mediaExts.map(e => `-iname "*.${e}"`).join(' -o ');

      conn.exec(`echo "TOTAL:"; find "${remotePath}" -type f 2>/dev/null | wc -l; echo "MEDIA:"; find "${remotePath}" -type f \\( ${extPattern} \\) 2>/dev/null | wc -l`, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        let output = '';
        stream.on('data', (chunk) => { output += chunk; });
        stream.on('close', (code) => {
          conn.end();
          const lines = output.trim().split('\n');
          const total = parseInt(lines[1]) || 0;
          const media = parseInt(lines[3]) || 0;
          resolve({ total, media, path: remotePath });
        });
      });
    });
    conn.connect(getConnectOptions(server));
  });
}

module.exports = { listDirectoryWithCounts, expandDirectory, countFiles };
