// ===== UNIQUEMEDIA FRONTEND =====

const API = '/api';
let currentView = 'grid';
let currentPreviewFiles = [];
let currentPreviewIndex = 0;
let selectedDupFiles = new Set();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadDashboard();
  loadServers();
});

// ===== NAVIGATION =====
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'servers': loadServers(); break;
    case 'files': loadFiles(); break;
    case 'duplicates': loadDuplicates(); break;
    case 'scan': loadScanPage(); break;
  }
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [stats, servers, dupGroups] = await Promise.all([
      fetchJSON(`${API}/stats`),
      fetchJSON(`${API}/servers`),
      fetchJSON(`${API}/duplicates`),
    ]);

    document.getElementById('stat-files').textContent = stats.totalFiles;
    document.getElementById('stat-dupes').textContent = stats.duplicateGroups;
    document.getElementById('dash-total-files').textContent = stats.totalFiles;
    document.getElementById('dash-dup-groups').textContent = stats.duplicateGroups;
    document.getElementById('dash-wasted-space').textContent = stats.wastedSpace;
    document.getElementById('dash-servers').textContent = servers.length;

    // Media breakdown
    const breakdown = document.getElementById('media-breakdown');
    const colors = { image: '#58a6ff', video: '#bc8cff', audio: '#3fb950' };
    const maxCount = Math.max(...Object.values(stats.mediaBreakdown || {}).values(), 1);

    breakdown.innerHTML = Object.entries(stats.mediaBreakdown || {}).map(([type, count]) => `
      <div class="breakdown-bar">
        <span class="label">${type}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(count/maxCount)*100}%;background:${colors[type] || '#8b949e'}"></div>
        </div>
        <span class="count">${count}</span>
      </div>
    `).join('');

    // Recent duplicates
    const recent = document.getElementById('recent-duplicates');
    const recentGroups = dupGroups.slice(0, 5);
    if (recentGroups.length === 0) {
      recent.innerHTML = '<p style="color:var(--text-muted)">No duplicates found yet. Scan a server to get started.</p>';
    } else {
      recent.innerHTML = recentGroups.map(g => `
        <div class="file-list-row" onclick="viewDuplicateGroup('${g.checksum}')">
          <div class="file-details">
            <div class="file-name">${g.checksum.slice(0, 16)}...</div>
            <div class="file-path">${g.file_count} files · ${formatBytes(g.total_size)}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

// ===== SERVERS =====
async function loadServers() {
  try {
    const servers = await fetchJSON(`${API}/servers`);
    const list = document.getElementById('server-list');

    if (servers.length === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--text-muted)">
          <p>No servers configured yet.</p>
          <button class="btn btn-primary" onclick="showAddServerModal()" style="margin-top:12px">+ Add Server</button>
        </div>`;
      return;
    }

    list.innerHTML = servers.map(s => `
      <div class="server-card">
        <div class="server-info">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.username)}@${esc(s.host)}:${s.port} · Added ${new Date(s.created_at).toLocaleDateString()}</p>
        </div>
        <div class="server-actions">
          <button class="btn btn-sm" onclick="testServer('${s.id}')">Test</button>
          <button class="btn btn-sm btn-danger" onclick="deleteServer('${s.id}')">Delete</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Server load error:', err);
  }
}

function showAddServerModal() {
  const modal = document.getElementById('modal-content');
  modal.innerHTML = `
    <h3>Add Server</h3>
    <div class="form-group">
      <label>Name</label>
      <input type="text" id="srv-name" placeholder="My Media Server">
    </div>
    <div class="form-group">
      <label>Host</label>
      <input type="text" id="srv-host" placeholder="192.168.1.100">
    </div>
    <div class="form-group">
      <label>Port</label>
      <input type="number" id="srv-port" value="22">
    </div>
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="srv-user" placeholder="root">
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="srv-pass" placeholder="••••••••">
    </div>
    <div class="form-actions">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveServer()">Save</button>
    </div>
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function saveServer() {
  const server = {
    name: document.getElementById('srv-name').value,
    host: document.getElementById('srv-host').value,
    port: parseInt(document.getElementById('srv-port').value) || 22,
    username: document.getElementById('srv-user').value,
    password: document.getElementById('srv-pass').value,
  };

  if (!server.name || !server.host || !server.username || !server.password) {
    alert('Please fill in all fields');
    return;
  }

  await fetch(`${API}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(server),
  });

  closeModal();
  loadServers();
}

async function testServer(id) {
  try {
    const res = await fetchJSON(`${API}/servers/${id}/test`);
    if (res.ok) {
      alert('✓ Connection successful!');
    } else {
      const msg = res.error || 'Unknown error';
      if (msg.includes('authentication') || msg.includes('password') || msg.includes('All configured')) {
        alert('✗ Authentication failed.\n\nCheck that the password is correct.\nEdit this server to update credentials.');
      } else {
        alert('✗ ' + msg);
      }
    }
  } catch (err) {
    alert('Connection failed: ' + err.message);
  }
}

async function deleteServer(id) {
  if (!confirm('Delete this server and all its indexed files?')) return;
  await fetch(`${API}/servers/${id}`, { method: 'DELETE' });
  loadServers();
}

// ===== FILES =====
async function loadFiles() {
  try {
    const type = document.getElementById('file-filter-type')?.value || '';
    const q = document.getElementById('file-search')?.value || '';
    let url = `${API}/files?limit=200`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (type) url += `&media_type=${type}`;

    const files = await fetchJSON(url);
    renderFiles(files);
  } catch (err) {
    console.error('File load error:', err);
  }
}

function searchFiles() { loadFiles(); }

function renderFiles(files) {
  const grid = document.getElementById('file-grid');
  const list = document.getElementById('file-list-view');

  if (files.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">No files found. Scan a server first.</p>';
    list.innerHTML = '';
    return;
  }

  if (currentView === 'grid') {
    grid.classList.remove('hidden');
    list.classList.add('hidden');
    grid.innerHTML = files.map(f => `
      <div class="file-card" onclick="openPreview(${f.id}, ${JSON.stringify(files).replace(/"/g, '&quot;')}, ${files.indexOf(f)})">
        ${f.media_type === 'image' ? `<img class="thumb" src="${API}/thumb/${f.id}?w=160&h=160" loading="lazy" alt="">` : ''}
        ${f.media_type === 'video' ? `<img class="thumb" src="${API}/thumb/${f.id}?w=160&h=160" loading="lazy" alt="">` : ''}
        <span class="media-badge badge-${f.media_type}">${f.media_type}</span>
        <div class="file-info">
          <div class="file-name">${esc(f.file_name)}</div>
          <div class="file-meta">${formatBytes(f.file_size)}</div>
        </div>
      </div>
    `).join('');
  } else {
    grid.classList.add('hidden');
    list.classList.remove('hidden');
    list.innerHTML = files.map(f => `
      <div class="file-list-row" onclick="openPreview(${f.id})">
        ${f.media_type === 'image' ? `<img class="thumb-sm" src="${API}/thumb/${f.id}?w=80&h=80" loading="lazy">` : ''}
        ${f.media_type === 'video' ? `<img class="thumb-sm" src="${API}/thumb/${f.id}?w=80&h=80" loading="lazy">` : ''}
        ${f.media_type === 'audio' ? `<div class="thumb-sm" style="display:flex;align-items:center;justify-content:center">🎵</div>` : ''}
        <div class="file-details">
          <div class="file-name">${esc(f.file_name)}</div>
          <div class="file-path">${esc(f.file_path)}</div>
        </div>
        <span class="file-size">${formatBytes(f.file_size)}</span>
      </div>
    `).join('');
  }
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-toggle .btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadFiles();
}

// ===== DUPLICATES =====
async function loadDuplicates() {
  try {
    const type = document.getElementById('dup-filter-type')?.value || '';
    const allDupes = await fetchJSON(`${API}/duplicates/all`);
    const groups = type ? allDupes.filter(g => g.media_type === type) : allDupes;

    const container = document.getElementById('duplicate-groups');
    if (groups.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:20px">No duplicates found. Scan a server to find duplicates.</p>';
      return;
    }

    container.innerHTML = groups.map((group, gi) => `
      <div class="dup-group" id="dup-group-${gi}">
        <div class="dup-group-header" onclick="toggleDupGroup(${gi})">
          <div>
            <span class="checksum">${group.checksum.slice(0, 24)}...</span>
          </div>
          <div class="dup-info">
            <span class="count">${group.file_count} duplicates</span>
            <span class="size">${formatBytes(group.total_size)}</span>
          </div>
        </div>
        <div class="dup-group-files" id="dup-files-${gi}" style="display:none">
          ${group.files.map((f, fi) => `
            <div class="dup-file-card" id="dup-file-${gi}-${fi}" onclick="selectDupFile(${gi}, ${fi}, event)">
              ${f.media_type === 'image' ? `<img class="thumb" src="${API}/thumb/${f.id}?w=160&h=160" loading="lazy">` : ''}
              ${f.media_type === 'video' ? `<img class="thumb" src="${API}/thumb/${f.id}?w=160&h=160" loading="lazy">` : ''}
              <div class="dup-file-info">
                <div class="dup-file-name">${esc(f.file_name)}</div>
                <div class="dup-file-path">${esc(f.file_path)}</div>
                <div class="dup-file-size">${formatBytes(f.file_size)}</div>
              </div>
              <div class="dup-file-actions">
                <button class="btn btn-sm" style="color:var(--success)" onclick="event.stopPropagation();markKeep(${gi},${fi})">Keep</button>
                <button class="btn btn-sm" style="color:var(--warning)" onclick="event.stopPropagation();selectForMove(${gi},${fi})">Move</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="dup-group-footer" id="dup-footer-${gi}" style="display:none">
          <div class="dup-move-select">
            <label style="font-size:0.8rem;color:var(--text-secondary)">Move selected to:</label>
            <input type="text" id="dup-dest-${gi}" placeholder="/path/to/destination">
            <button class="btn btn-sm btn-primary" onclick="moveDupFiles(${gi})">Move</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Duplicate load error:', err);
  }
}

function toggleDupGroup(index) {
  const files = document.getElementById(`dup-files-${index}`);
  const footer = document.getElementById(`dup-footer-${index}`);
  const isHidden = files.style.display === 'none';
  files.style.display = isHidden ? 'grid' : 'none';
  footer.style.display = isHidden ? 'flex' : 'none';
}

function selectDupFile(groupIndex, fileIndex, event) {
  // Click on card selects it
  const card = document.getElementById(`dup-file-${groupIndex}-${fileIndex}`);
  card.classList.toggle('selected');
}

function markKeep(groupIndex, fileIndex) {
  const card = document.getElementById(`dup-file-${groupIndex}-${fileIndex}`);
  // Remove selected from all, mark this as keep
  card.parentElement.querySelectorAll('.dup-file-card').forEach(c => {
    c.classList.remove('selected', 'keep');
  });
  card.classList.add('keep');
}

function selectForMove(groupIndex, fileIndex) {
  const card = document.getElementById(`dup-file-${groupIndex}-${fileIndex}`);
  card.classList.toggle('selected');
}

// ===== SCAN =====
let currentScanServerId = null;

async function loadScanPage() {
  const servers = await fetchJSON(`${API}/servers`);
  const select = document.getElementById('scan-server');
  select.innerHTML = servers.map(s => `<option value="${s.id}">${s.name} (${s.host})</option>`).join('');
  if (servers.length > 0) {
    currentScanServerId = servers[0].id;
    loadTree();
  }
}

function onServerChange() {
  currentScanServerId = document.getElementById('scan-server').value;
  loadTree();
}

async function loadTree() {
  const serverId = document.getElementById('scan-server').value;
  const rootPath = (document.getElementById('tree-root').value || '/').replace(/\/+$/, '') || '/';
  const container = document.getElementById('tree-container');
  const statusEl = document.getElementById('tree-status');

  if (!serverId) {
    container.innerHTML = '<p style="color:var(--text-muted);padding:20px">Select a server first</p>';
    return;
  }

  currentScanServerId = serverId;
  container.innerHTML = '<p style="color:var(--text-secondary);padding:20px">Connecting and loading directories...</p>';
  statusEl.classList.add('hidden');

  try {
    const tree = await fetchJSON(`${API}/tree/${serverId}?path=${encodeURIComponent(rootPath)}`);
    if (!tree || !tree.children || tree.children.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);padding:20px">Empty directory or no subdirectories found</p>';
      return;
    }
    container.innerHTML = '';
    renderTreeNode(tree, serverId, container, 0);
  } catch (err) {
    statusEl.textContent = '⚠️ ' + err.message;
    statusEl.classList.remove('hidden');
    container.innerHTML = '<p style="color:var(--danger);padding:20px">Cannot connect. Check the server password in Servers → Edit.</p>';
  }
}

function renderTreeNode(node, serverId, parentEl, depth) {
  const div = document.createElement('div');
  div.className = 'tree-node';
  if (depth === 0) div.style.marginLeft = '0';
  else div.style.marginLeft = `${depth * 20}px`;

  // The folder row
  const row = document.createElement('div');
  row.className = 'tree-item';
  row.style.paddingLeft = `${8 + depth * 4}px`;

  const hasChildren = node.children && node.children.length > 0;
  const isLoading = node.children === null && !node.loaded;

  let icon = '📁';
  if (!hasChildren && !isLoading) icon = '📂';

  const countBadge = node.mediaCount > 0
    ? `<span class="tree-count has-media">${node.mediaCount} media</span>`
    : '';

  row.innerHTML = `
    <span class="tree-toggle" onclick="event.stopPropagation();toggleFolder(this, '${esc(node.path)}', '${esc(serverId)}')">${hasChildren || isLoading ? '▶' : ' '}</span>
    <span class="tree-icon">${icon}</span>
    <span class="tree-name" title="${esc(node.path)}">${esc(node.name || '/')}</span>
    ${countBadge}
  `;

  // Click row → select as scan path
  row.addEventListener('click', () => selectPath(node.path, serverId, row));

  div.appendChild(row);

  // Children container
  const childrenContainer = document.createElement('div');
  childrenContainer.className = 'tree-children';
  childrenContainer.style.display = 'none';

  if (hasChildren) {
    for (const child of node.children) {
      renderTreeNode(child, serverId, childrenContainer, depth + 1);
    }
    // Auto-expand root level
    if (depth === 0) childrenContainer.style.display = 'block';
  }

  div.appendChild(childrenContainer);
  parentEl.appendChild(div);
}

async function toggleFolder(toggleEl, dirPath, serverId) {
  const row = toggleEl.closest('.tree-item');
  const parentDiv = row.closest('.tree-node');
  const childrenContainer = parentDiv.querySelector('.tree-children');

  if (!childrenContainer) return;

  // Already loaded — just toggle visibility
  if (childrenContainer.style.display === 'block') {
    childrenContainer.style.display = 'none';
    toggleEl.textContent = '▶';
    return;
  }

  // If children are already rendered, just show them
  if (childrenContainer.children.length > 0) {
    childrenContainer.style.display = 'block';
    toggleEl.textContent = '▼';
    return;
  }

  // Lazy load children
  toggleEl.textContent = '⏳';
  childrenContainer.innerHTML = '<p style="color:var(--text-muted);padding:8px;font-size:0.8rem">Loading...</p>';
  childrenContainer.style.display = 'block';

  try {
    const children = await fetchJSON(`${API}/tree-expand/${serverId}?path=${encodeURIComponent(dirPath)}`);
    childrenContainer.innerHTML = '';
    for (const child of children) {
      renderTreeNode(child, serverId, childrenContainer, 0);
    }
    toggleEl.textContent = '▼';
  } catch (err) {
    childrenContainer.innerHTML = `<p style="color:var(--danger);padding:8px;font-size:0.8rem">${esc(err.message)}</p>`;
    toggleEl.textContent = '⚠';
  }
}

function selectPath(path, serverId, rowEl) {
  // Set as scan path
  document.getElementById('scan-path').value = path;

  // Highlight selected
  document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
  rowEl.classList.add('selected');

  // Show file count info (async, non-blocking)
  fetchJSON(`${API}/count/${serverId}?path=${encodeURIComponent(path)}`).then(info => {
    document.getElementById('path-info').classList.remove('hidden');
    document.getElementById('info-total').textContent = info.total.toLocaleString();
    document.getElementById('info-media').textContent = info.media.toLocaleString();
  }).catch(() => {});
}

async function startScan() {
  const serverId = document.getElementById('scan-server').value;
  const scanPath = document.getElementById('scan-path').value;

  if (!serverId) {
    alert('Please select a server');
    return;
  }
  if (!scanPath) {
    alert('Please select a path to scan (click a folder in the tree)');
    return;
  }

  const progress = document.getElementById('scan-progress');
  const results = document.getElementById('scan-results');
  const btn = event.currentTarget;

  // Show progress immediately, disable button
  progress.classList.remove('hidden');
  results.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Scanning...';

  document.getElementById('progress-text').textContent = 'Starting scan...';
  document.getElementById('progress-fill').style.width = '0%';
  document.getElementById('progress-count').textContent = '';

  try {
    const res = await fetchJSON(`${API}/scan/${serverId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: scanPath }),
    });

    console.log('[Scan] Started:', res);
    pollScanProgress(serverId);
  } catch (err) {
    console.error('[Scan] Failed:', err);
    document.getElementById('progress-text').textContent = 'Failed to start: ' + err.message;
    document.getElementById('progress-fill').style.width = '100%';
    document.getElementById('progress-fill').style.background = 'var(--danger)';
    btn.disabled = false;
    btn.textContent = 'Start Scan';
  }
}

async function pollScanProgress(serverId) {
  const fill = document.getElementById('progress-fill');
  const text = document.getElementById('progress-text');
  const count = document.getElementById('progress-count');

  for (let i = 0; i < 600; i++) {  // Up to 30 min
    await sleep(3000);
    try {
      const scan = await fetchJSON(`${API}/scan/${serverId}`);

      if (scan.status === 'idle') {
        text.textContent = 'Waiting for scan to start...';
        continue;
      }

      if (scan.total > 0) {
        const pct = Math.round((scan.scanned / scan.total) * 100);
        fill.style.width = `${pct}%`;
        text.textContent = `Checksumming: ${scan.scanned.toLocaleString()} / ${scan.total.toLocaleString()} files (${pct}%)`;
      } else {
        text.textContent = scan.current || 'Finding files...';
        fill.style.width = '5%';
      }

      if (scan.errors > 0) {
        count.textContent = `${scan.filesAdded} indexed, ${scan.errors} errors`;
      } else {
        count.textContent = `${scan.filesAdded} files indexed`;
      }

      if (scan.status === 'complete') {
        fill.style.width = '100%';
        fill.style.background = '';
        text.textContent = `Done! ${scan.filesAdded} files indexed, ${scan.duplicatesFound || 0} duplicate groups found`;
        count.textContent = scan.errors > 0 ? `${scan.errors} errors occurred` : '';
        const startBtn = document.querySelector('.scan-config .btn-lg');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Scan'; }
        loadDashboard();
        break;
      }

      if (scan.status === 'error') {
        fill.style.width = '100%';
        fill.style.background = 'var(--danger)';
        text.textContent = `Scan failed: ${scan.error || 'Unknown error'}`;
        const startBtn = document.querySelector('.scan-config .btn-lg');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Scan'; }
        break;
      }
    } catch (err) {
      // Ignore poll errors
    }
  }
}

// ===== PREVIEW =====
function openPreview(fileId, filesJson, index) {
  // If called from grid with files context
  if (filesJson && index !== undefined) {
    try {
      currentPreviewFiles = typeof filesJson === 'string' ? JSON.parse(filesJson) : filesJson;
      currentPreviewIndex = index;
    } catch {
      currentPreviewFiles = [];
      currentPreviewIndex = 0;
    }
  }

  showPreview(fileId);
}

async function showPreview(fileId) {
  const overlay = document.getElementById('preview-overlay');
  const content = document.getElementById('preview-content');
  const info = document.getElementById('preview-info');

  overlay.classList.remove('hidden');

  try {
    const file = await fetchJSON(`${API}/files/${fileId}`);

    if (file.media_type === 'image') {
      content.innerHTML = `<img src="${API}/file/${fileId}" alt="${esc(file.file_name)}">`;
    } else if (file.media_type === 'video') {
      content.innerHTML = `<video controls src="${API}/file/${fileId}"></video>`;
    } else if (file.media_type === 'audio') {
      content.innerHTML = `<audio controls src="${API}/file/${fileId}"></audio>`;
    } else {
      content.innerHTML = '<div style="font-size:4rem;text-align:center">📄</div>';
    }

    info.innerHTML = `
      <strong>${esc(file.file_name)}</strong><br>
      ${esc(file.file_path)} · ${formatBytes(file.file_size)} · ${file.media_type}
    `;
  } catch (err) {
    content.innerHTML = '<p style="color:var(--text-muted)">Failed to load preview</p>';
  }
}

function closePreview() {
  document.getElementById('preview-overlay').classList.add('hidden');
  // Stop any playing video
  const video = document.querySelector('#preview-content video');
  if (video) video.pause();
}

function navigatePreview(direction) {
  if (currentPreviewFiles.length === 0) return;
  currentPreviewIndex = (currentPreviewIndex + direction + currentPreviewFiles.length) % currentPreviewFiles.length;
  showPreview(currentPreviewFiles[currentPreviewIndex].id);
}

// Keyboard navigation for preview
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('preview-overlay');
  if (!overlay.classList.contains('hidden')) {
    if (e.key === 'Escape') closePreview();
    if (e.key === 'ArrowLeft') navigatePreview(-1);
    if (e.key === 'ArrowRight') navigatePreview(1);
  }
  if (e.key === 'Escape') closeModal();
});

// ===== MODAL =====
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// ===== UTILITIES =====
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
