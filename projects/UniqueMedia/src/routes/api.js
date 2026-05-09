const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts, rebuildDuplicateGroups } = require('../db');
const { scanDirectory, getScanStatus } = require('../services/scanner');
const { moveFile, listDirectory, testConnection } = require('../services/ssh-manager');
const { listDirectoryWithCounts, expandDirectory, countFiles } = require('../services/tree-browser');
const sharp = require('sharp');
const { getConnectOptions } = require('../services/ssh-conn');

const router = express.Router();

// In-memory scan state tracker
const activeScans = new Map();

// ==================== SERVERS ====================

// Add/update server
router.post('/servers', (req, res) => {
  const { id, name, host, port, username, password } = req.body;
  const serverId = id || uuidv4();
  stmts.insertServer.run(serverId, name, host, port || 22, username, password);
  res.json({ id: serverId, name, host, port: port || 22, username });
});

// List all servers
router.get('/servers', (req, res) => {
  const servers = stmts.getAllServers.all();
  res.json(servers);
});

// Delete server and its files
router.delete('/servers/:id', (req, res) => {
  const server = stmts.getServer.run(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });

  stmts.deleteServer.run(req.params.id);
  stmts.deleteFileByServer.run(req.params.id); // Need to add this
  res.json({ ok: true });
});

// Test connection
router.post('/servers/:id/test', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    await testConnection(server);
    res.json({ ok: true, message: 'Connection successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SCANNING ====================

// Start scan
router.post('/scan/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { path: scanPath } = req.body;
    if (!scanPath) return res.status(400).json({ error: 'Scan path required' });

    // Cancel any active scan for this server
    const scanId = req.params.serverId;
    if (activeScans.has(scanId)) {
      activeScans.get(scanId).cancelled = true;
    }

    const scanState = {
      status: 'running',
      total: 0,
      scanned: 0,
      filesAdded: 0,
      errors: 0,
      current: 'Starting...',
      path: scanPath,
      cancelled: false,
      startedAt: Date.now(),
    };
    activeScans.set(scanId, scanState);

    // Start scan in background
    scanDirectory(server, scanPath, (progress) => {
      scanState.status = progress.status || 'running';
      scanState.total = progress.total;
      scanState.scanned = progress.scanned;
      scanState.filesAdded = progress.filesAdded;
      scanState.errors = progress.errors;
      scanState.current = progress.current;
    }).then((results) => {
      scanState.status = 'complete';
      scanState.filesAdded = results.filesAdded;
      scanState.errors = results.errors;
      scanState.duplicatesFound = results.duplicatesFound;
      scanState.completedAt = Date.now();
      console.log(`[Scan] Complete: ${results.filesAdded} files, ${results.duplicatesFound} dup groups, ${results.errors} errors`);
    }).catch((err) => {
      scanState.status = 'error';
      scanState.error = err.message;
      console.error('[Scan Error]', err.message);
    });

    res.json({ started: true, serverId: scanId, path: scanPath });
  } catch (err) {
    console.error('[Scan Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Get scan progress
router.get('/scan/:serverId', (req, res) => {
  const scanState = activeScans.get(req.params.serverId);
  if (!scanState) {
    return res.json({ status: 'idle', total: 0, scanned: 0, filesAdded: 0 });
  }
  res.json(scanState);
});

// ==================== MEDIA ====================

// Stream file from remote server via SSH
router.get('/file/:fileId', async (req, res) => {
  try {
    const file = stmts.getFile.run(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const server = stmts.getServer.run(file.server_id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const Client = require('ssh2').Client;
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return res.status(500).json({ error: err.message });
        sftp.stat(file.file_path, (statErr, stat) => {
          if (statErr) {
            conn.end();
            return res.status(404).json({ error: 'File not found on server' });
          }
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Type', getMimeType(file.file_name));
          sftp.createReadStream(file.file_path).pipe(res);
          res.on('finish', () => conn.end());
          res.on('close', () => conn.end());
        });
      });
    });
    conn.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
    conn.connect(getConnectOptions(server));
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Generate lightweight thumbnail (JPEG, max 160x160, quality 70)
// Uses cached local thumbnails if available, otherwise generates on-demand via SSH
router.get('/thumb/:fileId', async (req, res) => {
  try {
    const file = stmts.getFile.run(req.params.fileId);
    if (!file || file.media_type !== 'image') {
      return res.status(404).json({ error: 'Image not found' });
    }

    const server = stmts.getServer.run(file.server_id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    // Check for cached thumbnail first
    const fs = require('fs');
    const path = require('path');
    const cacheDir = path.join(__dirname, '..', '.thumb-cache');
    const cacheFile = path.join(cacheDir, req.params.fileId + '.jpg');
    if (fs.existsSync(cacheFile)) {
      const buf = fs.readFileSync(cacheFile);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.send(buf);
    }

    const w = Math.min(parseInt(req.query.w) || 160, 320);
    const h = Math.min(parseInt(req.query.h) || 160, 320);

    const Client = require('ssh2').Client;
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) return res.status(500).json({ error: err.message });
        const stream = sftp.createReadStream(file.file_path);
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', async () => {
          try {
            const buf = Buffer.concat(chunks);
            const img = await sharp(buf)
              .resize(w, h, { fit: 'cover' })
              .jpeg({ quality: 70 })
              .toBuffer();
            // Cache it
            try {
              fs.mkdirSync(cacheDir, { recursive: true });
              fs.writeFileSync(cacheFile, img);
            } catch (e) { /* ignore cache errors */ }
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.send(img);
          } catch (e) {
            sendPlaceholderThumb(res, file.file_name);
          }
          conn.end();
        });
        stream.on('error', () => {
          conn.end();
          sendPlaceholderThumb(res, file.file_name);
        });
      });
    });
    conn.on('error', () => {
      sendPlaceholderThumb(res, file.file_name);
    });
    conn.connect(getConnectOptions(server));
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

function sendPlaceholderThumb(res, filename) {
  // Lightweight inline SVG placeholder
  const name = (filename || '?').split('/').pop().substring(0, 12);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <rect width="160" height="160" fill="#1a1a2e"/>
    <text x="80" y="70" text-anchor="middle" fill="#555" font-size="32">📷</text>
    <text x="80" y="100" text-anchor="middle" fill="#888" font-size="10" font-family="sans-serif">${name}</text>
  </svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(svg);
}

function getMimeType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
    heic: 'image/heic', heif: 'image/heif',
  };
  return map[ext] || 'application/octet-stream';
}

// ==================== FILES ====================

// Search files
router.get('/files', (req, res) => {
  const { q, server_id, media_type, limit } = req.query;
  const limitNum = Math.min(parseInt(limit) || 200, 1000);

  let results;
  if (q) {
    const searchPattern = `%${q}%`;
    results = stmts.searchFiles.all(searchPattern, searchPattern, searchPattern, limitNum);
  } else if (server_id) {
    results = stmts.getFilesByServer.all(server_id);
  } else if (media_type) {
    results = stmts.getFilesByMediaType.all(media_type); // Need to add
  } else {
    results = stmts.getAllFiles.limit(limitNum).all(); // Need to add
  }

  res.json(results);
});

// Get file by ID
router.get('/files/:id', (req, res) => {
  const file = stmts.getFile.run(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json(file);
});

// ==================== DUPLICATES ====================

// Get all duplicate groups
router.get('/duplicates', (req, res) => {
  const groups = stmts.getDuplicateGroups.all();
  res.json(groups);
});

// Get files in a duplicate group
router.get('/duplicates/:checksum', (req, res) => {
  const files = stmts.getDuplicateGroupWithFiles.all(req.params.checksum);
  res.json(files);
});

// Get all duplicates with their files
router.get('/duplicates/all', (req, res) => {
  const files = stmts.getAllDuplicates.all();
  // Group by checksum
  const groups = {};
  for (const file of files) {
    if (!groups[file.checksum]) {
      groups[file.checksum] = {
        checksum: file.checksum,
        file_count: file.file_count,
        total_size: file.total_size,
        media_type: file.media_type,
        files: [],
      };
    }
    groups[file.checksum].files.push(file);
  }
  res.json(Object.values(groups));
});

// ==================== FILE OPERATIONS ====================

// Move a file
router.post('/files/:id/move', async (req, res) => {
  try {
    const file = stmts.getFile.run(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const server = stmts.getServer.run(file.server_id);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { destPath } = req.body;
    if (!destPath) return res.status(400).json({ error: 'Destination path required' });

    const result = await moveFile(server, file.file_path, destPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file record
router.delete('/files/:id', (req, res) => {
  const file = stmts.getFile.run(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  stmts.deleteFile.run(req.params.id);
  rebuildDuplicateGroups();
  res.json({ ok: true });
});

// ==================== DIRECTORY BROWSING ====================

// List remote directory
router.get('/browse/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { path: browsePath = '/' } = req.query;
    const entries = await listDirectory(server, browsePath);
    res.json({ path: browsePath, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get root-level directories with media counts (lazy tree root)
router.get('/tree/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { path: browsePath = '/' } = req.query;
    const tree = await listDirectoryWithCounts(server, browsePath);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expand a directory node (lazy load children)
router.get('/tree-expand/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { path: dirPath } = req.query;
    if (!dirPath) return res.status(400).json({ error: 'Path required' });

    const children = await expandDirectory(server, dirPath);
    res.json(children);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test SSH connection
router.post('/test-connection/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const Client = require('ssh2').Client;
    const result = await new Promise((resolve, reject) => {
      const conn = new Client();
      conn.on('ready', () => { conn.end(); resolve({ ok: true }); });
      conn.on('error', (err) => reject(new Error(err.message)));
      conn.connect(getConnectOptions(server));
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Count files in a directory
router.get('/count/:serverId', async (req, res) => {
  try {
    const server = stmts.getServer.run(req.params.serverId);
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { path: browsePath = '/' } = req.query;
    const counts = await countFiles(server, browsePath);
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== STATS ====================

router.get('/stats', (req, res) => {
  const fileCount = stmts.getFileCount.run().count;
  const dupGroups = stmts.getDuplicateGroups.all();
  const totalDupes = dupGroups.reduce((sum, g) => sum + g.file_count, 0);
  const wastedSpace = dupGroups.reduce((sum, g) => sum + (g.file_count - 1) * (g.total_size / g.file_count), 0);

  // Media type breakdown
  const breakdown = {};
  const typeCounts = stmts.getFileTypeBreakdown.all(); // Need to add
  for (const row of typeCounts) {
    breakdown[row.media_type] = row.count;
  }

  res.json({
    totalFiles: fileCount,
    duplicateGroups: dupGroups.length,
    totalDuplicateFiles: totalDupes,
    wastedSpace: formatBytes(wastedSpace),
    wastedSpaceBytes: wastedSpace,
    mediaBreakdown: breakdown,
  });
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = router;
