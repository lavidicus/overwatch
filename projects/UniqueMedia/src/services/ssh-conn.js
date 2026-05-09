const fs = require('fs');
const path = require('path');
const Client = require('ssh2').Client;

/**
 * Build ssh2 connect options from a server record.
 * Tries password first, then falls back to default SSH key paths
 * (~/.ssh/id_rsa, ~/.ssh/id_ed25519) if no password is set.
 */
function getConnectOptions(server) {
  const opts = {
    host: server.host,
    port: server.port || 22,
    username: server.username,
    readyTimeout: server.readyTimeout || 15000,
  };

  // Password auth (explicit or from server record)
  if (server.password) {
    opts.password = server.password;
  }

  // Try default SSH keys if no password
  const home = process.env.HOME || '';
  const keyPaths = [
    path.join(home, '.ssh', 'id_rsa'),
    path.join(home, '.ssh', 'id_ed25519'),
    path.join(home, '.ssh', 'id_ecdsa'),
  ];

  for (const kp of keyPaths) {
    if (fs.existsSync(kp)) {
      if (!opts.privateKey) {
        opts.privateKey = fs.readFileSync(kp);
      }
    }
  }

  return opts;
}

/**
 * Create and connect an ssh2 Client, returns promise that resolves with (conn, close).
 */
function connect(server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const close = () => { try { conn.end(); } catch (e) {} };

    conn.on('error', (err) => {
      close();
      reject(err);
    });

    conn.on('ready', () => {
      resolve({ conn, close });
    });

    conn.connect(getConnectOptions(server));
  });
}

module.exports = { getConnectOptions, connect };
