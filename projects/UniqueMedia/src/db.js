const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'registry.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    media_type TEXT NOT NULL,
    mime_type TEXT,
    scanned_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS duplicate_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    checksum TEXT NOT NULL UNIQUE,
    file_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_files_checksum ON files(checksum);
  CREATE INDEX IF NOT EXISTS idx_files_server ON files(server_id);
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(file_path);
  CREATE INDEX IF NOT EXISTS idx_files_media_type ON files(media_type);
`);

// Prepared statements for performance
const stmts = {
  // Servers
  insertServer: db.prepare(`
    INSERT OR REPLACE INTO servers (id, name, host, port, username, password)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getServer: db.prepare('SELECT * FROM servers WHERE id = ?'),
  getAllServers: db.prepare('SELECT id, name, host, port, username, created_at FROM servers'),
  deleteServer: db.prepare('DELETE FROM servers WHERE id = ?'),

  // Files
  insertFile: db.prepare(`
    INSERT INTO files (server_id, file_path, file_name, file_size, checksum, media_type, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  getFile: db.prepare('SELECT * FROM files WHERE id = ?'),
  getFilesByChecksum: db.prepare('SELECT * FROM files WHERE checksum = ?'),
  getFilesByServer: db.prepare('SELECT * FROM files WHERE server_id = ? ORDER BY file_path'),
  getFilesByPath: db.prepare('SELECT * FROM files WHERE file_path LIKE ? ORDER BY file_path'),
  searchFiles: db.prepare(`
    SELECT * FROM files
    WHERE file_name LIKE ? OR file_path LIKE ? OR media_type LIKE ?
    ORDER BY file_path
    LIMIT ?
  `),
  updateFilePath: db.prepare('UPDATE files SET file_path = ? WHERE id = ?'),
  deleteFile: db.prepare('DELETE FROM files WHERE id = ?'),
  getFileCount: db.prepare('SELECT COUNT(*) as count FROM files'),
  getFilesByServerAndPath: db.prepare('SELECT * FROM files WHERE server_id = ? AND file_path LIKE ? ORDER BY file_path'),
  getFileByPath: db.prepare('SELECT * FROM files WHERE file_path = ?'),
  deleteFileByServer: db.prepare('DELETE FROM files WHERE server_id = ?'),
  getFileTypeBreakdown: db.prepare('SELECT media_type, COUNT(*) as count FROM files GROUP BY media_type'),
  getAllFiles: db.prepare('SELECT * FROM files ORDER BY file_path'),
  getFilesByMediaType: db.prepare('SELECT * FROM files WHERE media_type = ? ORDER BY file_path'),

  // Duplicate groups (no FK to files.checksum since it's not a PK)
  upsertDuplicateGroup: db.prepare(`
    INSERT INTO duplicate_groups (checksum, file_count, total_size)
    VALUES (?, ?, ?)
    ON CONFLICT(checksum) DO UPDATE SET
      file_count = excluded.file_count,
      total_size = excluded.total_size
  `),
  getDuplicateGroups: db.prepare('SELECT * FROM duplicate_groups WHERE file_count > 1 ORDER BY total_size DESC'),
  getDuplicateGroupWithFiles: db.prepare(`
    SELECT f.*, dg.id as group_id, dg.file_count, dg.total_size
    FROM files f
    JOIN duplicate_groups dg ON f.checksum = dg.checksum
    WHERE dg.checksum = ?
  `),
  getAllDuplicates: db.prepare(`
    SELECT f.*, dg.id as group_id, dg.file_count, dg.total_size
    FROM files f
    JOIN duplicate_groups dg ON f.checksum = dg.checksum
    WHERE dg.file_count > 1
    ORDER BY dg.checksum, f.file_path
  `),
};

// Rebuild duplicate groups from current file registry
function rebuildDuplicateGroups() {
  const groups = {};
  const allFiles = db.prepare('SELECT checksum, file_size FROM files').all();

  for (const file of allFiles) {
    if (!groups[file.checksum]) {
      groups[file.checksum] = { count: 0, size: 0 };
    }
    groups[file.checksum].count++;
    groups[file.checksum].size += file.file_size;
  }

  // Clear and rebuild
  db.prepare('DELETE FROM duplicate_groups').run();
  for (const [checksum, info] of Object.entries(groups)) {
    if (info.count > 1) {
      stmts.upsertDuplicateGroup.run(checksum, info.count, info.size);
    }
  }

  return Object.keys(groups).filter(k => groups[k].count > 1).length;
}

module.exports = { db, stmts, rebuildDuplicateGroups };
