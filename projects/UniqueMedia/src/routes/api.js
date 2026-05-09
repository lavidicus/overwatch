const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { stmts, rebuildDuplicateGroups } = require('../db');
const { scanDirectory } = require('../services/scanner');
const { moveFile, listDirectory, testConnection } = require('../services/ssh-manager');

const router = express.Router();

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

    // Respond immediately, scan runs in background
    res.json({ started: true, serverId: req.params.serverId, path: scanPath });

    const results = await scanDirectory(server, scanPath, (progress) => {
      // Could emit via WebSocket in future
      console.log(`[Scan] ${progress.scanned}/${progress.total} - ${progress.current}`);
    });

    console.log(`[Scan] Complete: ${results.filesAdded} files, ${results.duplicatesFound} duplicate groups`);
  } catch (err) {
    console.error('[Scan Error]', err);
  }
});

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

// ==================== STATS ====================

router.get('/stats', (req, res) => {
  const fileCount = stmts.getFileCount.get().count;
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
