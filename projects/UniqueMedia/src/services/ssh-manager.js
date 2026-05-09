const { connect, getConnectOptions } = require('./ssh-conn');
const { stmts } = require('../db');

/**
 * Move a file on the remote server
 */
async function moveFile(server, sourcePath, destPath) {
  const { conn, close } = await connect(server);
  return new Promise((resolve, reject) => {
    const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
    conn.exec(`mkdir -p "${destDir}" && mv "${sourcePath}" "${destPath}"`, (err, stream) => {
      if (err) { close(); return reject(err); }

      let output = '';
      let errorOutput = '';
      stream.on('data', (chunk) => { output += chunk; });
      stream.stderr.on('data', (chunk) => { errorOutput += chunk; });

      stream.on('close', (code) => {
        close();
        if (code !== 0) {
          reject(new Error(`Move failed: ${errorOutput || output}`));
        } else {
          const file = stmts.getFileByPath.run(sourcePath);
          if (file) stmts.updateFilePath.run(destPath, file.id);
          resolve({ sourcePath, destPath });
        }
      });
    });
  });
}

/**
 * List directory contents on remote server
 */
async function listDirectory(server, remotePath) {
  const { conn, close } = await connect(server);
  return new Promise((resolve, reject) => {
    conn.exec(`ls -la "${remotePath}" 2>/dev/null`, (err, stream) => {
      if (err) { close(); return reject(err); }

      let output = '';
      stream.on('data', (chunk) => { output += chunk; });
      stream.on('close', (code) => {
        close();
        if (code !== 0) return reject(new Error(`List failed: ${output}`));

        const lines = output.trim().split('\n').slice(1);
        const entries = lines.map(line => {
          const parts = line.split(/\s+/);
          if (parts.length < 9) return null;
          return {
            permissions: parts[0],
            isDir: parts[0].startsWith('d'),
            name: parts.slice(8).join(' '),
            size: parseInt(parts[4]) || 0,
            date: `${parts[5]} ${parts[6]} ${parts[7]}`,
          };
        }).filter(Boolean);

        resolve(entries);
      });
    });
  });
}

/**
 * Test SSH connection
 */
async function testConnection(server) {
  const { conn, close } = await connect(server);
  close();
  return true;
}

module.exports = { moveFile, listDirectory, testConnection };
