const Client = require('ssh2').Client;
const { db, stmts } = require('../db');

/**
 * Move a file on the remote server
 */
function moveFile(server, sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('error', (err) => reject(err));
    conn.on('ready', () => {
      // Create destination directory if needed
      const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
      conn.exec(`mkdir -p "${destDir}" && mv "${sourcePath}" "${destPath}"`, (err, stream) => {
        if (err) { conn.end(); return reject(err); }

        let output = '';
        let errorOutput = '';
        stream.on('data', (chunk) => { output += chunk; });
        stream.stderr.on('data', (chunk) => { errorOutput += chunk; });

        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) {
            reject(new Error(`Move failed: ${errorOutput || output}`));
          } else {
            // Update registry
            stmts.updateFilePath.run(destPath, stmts.getFile.path(sourcePath)?.id);
            // Actually we need the file ID, let me fix this
            const file = stmts.getFileByPath.run(sourcePath);
            if (file) {
              stmts.updateFilePath.run(destPath, file.id);
            }
            resolve({ sourcePath, destPath });
          }
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

/**
 * List directory contents on remote server
 */
function listDirectory(server, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('error', (err) => reject(err));
    conn.on('ready', () => {
      conn.exec(`ls -la "${remotePath}" 2>/dev/null`, (err, stream) => {
        if (err) { conn.end(); return reject(err); }

        let output = '';
        stream.on('data', (chunk) => { output += chunk; });
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) return reject(new Error(`List failed: ${output}`));

          const lines = output.trim().split('\n').slice(1); // Skip total line
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

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 20000,
    });
  });
}

/**
 * Test SSH connection
 */
function testConnection(server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('Connection timed out'));
    }, 10000);

    conn.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    conn.on('ready', () => {
      clearTimeout(timeout);
      conn.end();
      resolve(true);
    });

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 10000,
    });
  });
}

module.exports = { moveFile, listDirectory, testConnection };
