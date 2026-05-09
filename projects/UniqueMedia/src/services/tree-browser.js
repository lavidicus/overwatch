const Client = require('ssh2').Client;

/**
 * Get a directory tree up to `depth` levels, with file counts per directory.
 * Returns: { path, name, isDir, children[], mediaCount, totalFiles }
 */
function getDirectoryTree(server, remotePath, depth = 2) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('error', (err) => reject(err));
    conn.on('ready', () => {
      // Use find to get directories up to depth, then count media files in each
      const mediaExts = ['jpg','jpeg','png','gif','bmp','webp','tiff','tif','heic','heif',
                         'mp4','mov','avi','mkv','webm','flv','wmv','m4v','mpeg','mpg',
                         'mp3','wav','flac','aac','ogg','wma','m4a'];
      const extPattern = mediaExts.map(e => `-iname "*.${e}"`).join(' -o ');

      // Get all directories up to depth
      const findCmd = `find "${remotePath}" -maxdepth ${depth} -type d 2>/dev/null | sort`;

      conn.exec(findCmd, (err, stream) => {
        if (err) { conn.end(); return reject(err); }

        let output = '';
        stream.on('data', (chunk) => { output += chunk; });
        stream.on('close', (code) => {
          if (code !== 0) { conn.end(); return reject(new Error(`Find failed: ${output}`)); }

          const dirs = output.trim().split('\n').filter(Boolean);
          if (dirs.length === 0) { conn.end(); return resolve({ path: remotePath, name: remotePath.split('/').pop(), isDir: true, children: [], mediaCount: 0 }); }

          // Count media files in each directory
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

            // Build tree structure
            const root = buildTree(dirs, counts, remotePath);
            resolve(root);
          });
        });
      });
    });

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 20000,
    });
  });
}

function buildTree(dirs, counts, rootPath) {
  // Create a map: path -> { mediaCount, children: [] }
  const nodeMap = {};

  for (let i = 0; i < dirs.length; i++) {
    const dirPath = dirs[i];
    nodeMap[dirPath] = {
      path: dirPath,
      name: dirPath.split('/').filter(Boolean).pop() || '/',
      isDir: true,
      children: [],
      mediaCount: counts[i] || 0,
    };
  }

  // Link children to parents
  for (const dirPath of dirs) {
    const node = nodeMap[dirPath];
    if (!node) continue;

    const parentPath = dirPath.substring(0, dirPath.lastIndexOf('/')) || '/';
    if (parentPath === rootPath) continue; // root's parent is itself

    const parent = nodeMap[parentPath];
    if (parent) {
      parent.children.push(node);
    }
  }

  // Return root node
  const rootNode = nodeMap[rootPath];
  if (!rootNode) {
    return { path: rootPath, name: rootPath.split('/').pop() || '/', isDir: true, children: [], mediaCount: counts[0] || 0 };
  }
  return rootNode;
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
    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 20000,
    });
  });
}

module.exports = { getDirectoryTree, countFiles };
