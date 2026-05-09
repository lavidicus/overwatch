const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'registry.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
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

// --- Queries (use .get() for single row, .all() for many, .run() for mutations) ---
const queries = {
  // Servers
  insertServer: 'INSERT OR REPLACE INTO servers (id, name, host, port, username, password) VALUES (?, ?, ?, ?, ?, ?)',
  getServer: 'SELECT * FROM servers WHERE id = ?',
  getAllServers: 'SELECT id, name, host, port, username, created_at FROM servers',
  deleteServer: 'DELETE FROM servers WHERE id = ?',

  // Files
  insertFile: 'INSERT INTO files (server_id, file_path, file_name, file_size, checksum, media_type, mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
  getFile: 'SELECT * FROM files WHERE id = ?',
  getFilesByChecksum: 'SELECT * FROM files WHERE checksum = ?',
  getFilesByServer: 'SELECT * FROM files WHERE server_id = ? ORDER BY file_path',
  getFilesByPath: 'SELECT * FROM files WHERE file_path LIKE ? ORDER BY file_path',
  searchFiles: 'SELECT * FROM files WHERE file_name LIKE ? OR file_path LIKE ? OR media_type LIKE ? ORDER BY file_path LIMIT ?',
  updateFilePath: 'UPDATE files SET file_path = ? WHERE id = ?',
  deleteFile: 'DELETE FROM files WHERE id = ?',
  getFileCount: 'SELECT COUNT(*) as count FROM files',
  getFilesByServerAndPath: 'SELECT * FROM files WHERE server_id = ? AND file_path LIKE ? ORDER BY file_path',
  getFileByPath: 'SELECT * FROM files WHERE file_path = ?',
  deleteFileByServer: 'DELETE FROM files WHERE server_id = ?',
  getFileTypeBreakdown: 'SELECT media_type, COUNT(*) as count FROM files GROUP BY media_type',
  getAllFiles: 'SELECT * FROM files ORDER BY file_path',
  getFilesByMediaType: 'SELECT * FROM files WHERE media_type = ? ORDER BY file_path',

  // Duplicate groups
  upsertDuplicateGroup: 'INSERT INTO duplicate_groups (checksum, file_count, total_size) VALUES (?, ?, ?) ON CONFLICT(checksum) DO UPDATE SET file_count = excluded.file_count, total_size = excluded.total_size',
  getDuplicateGroups: 'SELECT * FROM duplicate_groups WHERE file_count > 1 ORDER BY total_size DESC',
  getDuplicateGroupWithFiles: 'SELECT f.*, dg.id as group_id, dg.file_count, dg.total_size FROM files f JOIN duplicate_groups dg ON f.checksum = dg.checksum WHERE dg.checksum = ?',
  getAllDuplicates: 'SELECT f.*, dg.id as group_id, dg.file_count, dg.total_size FROM files f JOIN duplicate_groups dg ON f.checksum = dg.checksum WHERE dg.file_count > 1 ORDER BY dg.checksum, f.file_path',
};

// Execute a query with proper method selection
function q(sql, params = []) {
  const stmt = db.prepare(sql);
  if (sql.trim().startsWith('SELECT')) {
    if (params.length === 0) return stmt.get();
    return stmt.get(...params);
  }
  if (params.length === 0) return stmt.run();
  return stmt.run(...params);
}

function qAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length === 0) return stmt.all();
  return stmt.all(...params);
}

// Re-export as stmts for backward compat with existing code
const stmts = {};
for (const [name, sql] of Object.entries(queries)) {
  const isSelect = sql.trim().startsWith('SELECT');
  stmts[name] = {
    run: (...args) => {
      const stmt = db.prepare(sql);
      return isSelect ? stmt.get(...args) : stmt.run(...args);
    },
    all: (...args) => {
      const stmt = db.prepare(sql);
      return stmt.all(...args);
    },
    get: (...args) => {
      const stmt = db.prepare(sql);
      return stmt.get(...args);
    },
    limit: (n) => {
      const stmt = db.prepare(sql);
      return { all: (...args) => stmt.all(...args).slice(0, n) };
    },
  };
}

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

  db.prepare('DELETE FROM duplicate_groups').run();
  for (const [checksum, info] of Object.entries(groups)) {
    if (info.count > 1) {
      db.prepare('INSERT INTO duplicate_groups (checksum, file_count, total_size) VALUES (?, ?, ?) ON CONFLICT(checksum) DO UPDATE SET file_count = excluded.file_count, total_size = excluded.total_size')
        .run(checksum, info.count, info.size);
    }
  }

  return Object.keys(groups).filter(k => groups[k].count > 1).length;
}

module.exports = { db, stmts, rebuildDuplicateGroups, q, qAll };
