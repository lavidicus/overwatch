const express = require('express');
const Client = require('ssh2').Client;
const { Readable } = require('stream');
const { stmts } = require('../db');

const router = express.Router();

// Serve a remote file for preview
router.get('/file/:fileId', async (req, res) => {
  try {
    const file = stmts.getFile.run(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const server = stmts.getServer.run(file.server_id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    // Set content type
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.file_name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the file via SSH sftp
    const conn = new Client();
    conn.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: `SSH error: ${err.message}` });
      }
    });

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          if (!res.headersSent) res.status(500).json({ error: `SFTP error: ${err.message}` });
          return;
        }

        sftp.readFile(file.file_path, (err, remoteStream) => {
          if (err) {
            sftp.end();
            conn.end();
            if (!res.headersSent) res.status(500).json({ error: `Read error: ${err.message}` });
            return;
          }

          remoteStream.on('error', (streamErr) => {
            console.error(`[Preview] Stream error for ${file.file_path}:`, streamErr.message);
          });

          remoteStream.pipe(res);

          remoteStream.on('end', () => {
            sftp.end();
            conn.end();
          });
        });
      });
    });

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 10000,
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      conn.end();
    }, 30000);

  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Serve a thumbnail (smaller preview for grid view)
router.get('/thumb/:fileId', async (req, res) => {
  try {
    const file = stmts.getFile.run(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.media_type !== 'image') return res.status(400).json({ error: 'Not an image' });

    const server = stmts.getServer.run(file.server_id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const sharp = require('sharp');
    const width = parseInt(req.query.w) || 300;
    const height = parseInt(req.query.h) || 300;

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return res.status(500).json({ error: err.message }); }

        sftp.readFile(file.file_path, (err, stream) => {
          if (err) { sftp.end(); conn.end(); return res.status(500).json({ error: err.message }); }

          // Collect chunks then process with sharp
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('end', () => {
            sftp.end();
            conn.end();

            const buffer = Buffer.concat(chunks);
            sharp(buffer)
              .resize(width, height, { fit: 'cover' })
              .webp({ quality: 70 })
              .toBuffer()
              .then(output => {
                res.send(output);
              })
              .catch(err => {
                console.error(`[Thumb] Error processing ${file.file_name}:`, err.message);
                // Send original if thumbnail fails
                res.send(buffer);
              });
          });
        });
      });
    });

    conn.on('error', () => {
      if (!res.headersSent) res.status(500).json({ error: 'SSH connection failed' });
    });

    conn.connect({
      host: server.host,
      port: server.port || 22,
      username: server.username,
      password: server.password,
      readyTimeout: 10000,
    });

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
