#!/usr/bin/env node
// Real-time Systems Dashboard Server
// Collects data via SSH, pushes to browser via WebSocket
// Access at: http://localhost:3000

const { execFile } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const SCRIPT_PATH = '/home/localadmin/.openclaw/workspace/skills/daily-systems-status/scripts/collect-once.sh';
const TOKENS_SCRIPT = '/home/localadmin/.openclaw/workspace/skills/daily-systems-status/scripts/daily-token-count.sh';

let lastData = null;
let collecting = false;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real-time Systems Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e4e4e4;
            min-height: 100vh;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .header h1 { font-size: 1.8em; font-weight: 700; }
        .header-controls { display: flex; gap: 10px; align-items: center; }
        .status { font-size: 0.9em; opacity: 0.9; padding: 5px 15px; border-radius: 20px; }
        .status.connected { background: #28a745; }
        .status.disconnected { background: #dc3545; }
        .status.connecting { background: #ffc107; color: #333; }
        .btn {
            color: white; border: none; padding: 8px 16px; border-radius: 20px;
            font-size: 0.9em; font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-sync { background: rgba(255,255,255,0.2); }
        .gpu-select {
            background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3);
            padding: 6px 12px; border-radius: 5px; font-size: 0.85em; cursor: pointer;
        }
        .gpu-select option { background: #1a1a2e; color: #e4e4e4; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .card {
            background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 20px;
            backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .card-tall {
            min-height: 420px;
        }
        .card h2 { color: #667eea; font-size: 1.3em; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .card h3 { color: #a0a0a0; font-size: 0.85em; margin: 18px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #b0b0b0; font-size: 0.9em; }
        .metric-value { font-weight: 700; font-size: 1.1em; color: #667eea; }
        .metric-value.temp { color: #ff6b6b; }
        .metric-value.power { color: #feca57; }
        .metric-value.ram { color: #54a0ff; }
        .metric-value.gpu { color: #5f27cd; }
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 10px 0; }
        .mini-card { background: rgba(102, 126, 234, 0.1); padding: 10px; border-radius: 5px; text-align: center; }
        .mini-label { font-size: 0.8em; color: #b0b0b0; margin-bottom: 5px; }
        .mini-value { font-size: 1.2em; font-weight: 700; color: #667eea; }
        .timestamp { font-size: 0.85em; color: #888; margin-top: 10px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 0.85em; }
        .gpu-header { display: flex; align-items: center; justify-content: space-between; }
        .tokens-list { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🖥️ Real-time Systems Dashboard</h1>
        <div class="header-controls">
            <button id="sync-btn" class="btn btn-sync">🔄 Sync</button>
            <div id="status" class="status connecting">Connecting...</div>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <h2>🔥 TS Proxmox Host</h2>
            <h3>Temperatures</h3>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">CPU 1</div><div class="mini-value temp" id="ts-cpu1">--</div></div>
                <div class="mini-card"><div class="mini-label">CPU 2</div><div class="mini-value temp" id="ts-cpu2">--</div></div>
                <div class="mini-card"><div class="mini-label">System</div><div class="mini-value temp" id="ts-sys">--</div></div>
                <div class="mini-card"><div class="mini-label">PCH</div><div class="mini-value temp" id="ts-pch">--</div></div>
                <div class="mini-card"><div class="mini-label">Peripheral</div><div class="mini-value temp" id="ts-perip">--</div></div>
            </div>
            <h3>Fans</h3>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">FAN1</div><div class="mini-value" id="ts-fan1">--</div></div>
                <div class="mini-card"><div class="mini-label">FAN2</div><div class="mini-value" id="ts-fan2">--</div></div>
                <div class="mini-card"><div class="mini-label">FAN5</div><div class="mini-value" id="ts-fan5">--</div></div>
            </div>
            <h3>SAS Drive Temps</h3>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">Drive 0</div><div class="mini-value temp" id="ts-drive0">--</div></div>
                <div class="mini-card"><div class="mini-label">Drive 1</div><div class="mini-value temp" id="ts-drive1">--</div></div>
                <div class="mini-card"><div class="mini-label">Drive 2</div><div class="mini-value temp" id="ts-drive2">--</div></div>
                <div class="mini-card"><div class="mini-label">Drive 3</div><div class="mini-value temp" id="ts-drive3">--</div></div>
            </div>
            <div class="timestamp">Last update: <span id="ts-time">--</span></div>
        </div>

        <div class="card">
            <h2>⚡ Fast-Store (NVMe)</h2>
            <h3>NVMe Drive Temps (4x Crucial P3 Plus 1TB)</h3>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">nvme0</div><div class="mini-value temp" id="ts-nvme0">--</div></div>
                <div class="mini-card"><div class="mini-label">nvme1</div><div class="mini-value temp" id="ts-nvme1">--</div></div>
                <div class="mini-card"><div class="mini-label">nvme2</div><div class="mini-value temp" id="ts-nvme2">--</div></div>
                <div class="mini-card"><div class="mini-label">nvme3</div><div class="mini-value temp" id="ts-nvme3">--</div></div>
            </div>
            <div class="metric"><span class="metric-label">Pool</span><span class="metric-value">fast-store (RAIDZ1)</span></div>
            <div class="metric"><span class="metric-label">Capacity</span><span class="metric-value">3.62 TiB</span></div>
        </div>

        <div class="card">
            <h2>🚀 Node2 VM</h2>
            <h3>System</h3>
            <div class="metric"><span class="metric-label">RAM Used</span><span class="metric-value ram" id="n2-ram-used">--</span></div>
            <div class="metric"><span class="metric-label">RAM Available</span><span class="metric-value ram" id="n2-ram-avail">--</span></div>
            <div class="metric"><span class="metric-label">Root FS</span><span class="metric-value" id="n2-root">--</span></div>
            <div class="metric"><span class="metric-label">llama.cpp Status</span><span class="metric-value" id="n2-llama-status">--</span></div>
            <div class="metric"><span class="metric-label">llama.cpp Memory</span><span class="metric-value gpu" id="n2-llama-mem">--</span></div>

            <div class="gpu-header">
                <h3>GPU Status (2x P6000)</h3>
                <select id="gpu-selector" class="gpu-select">
                    <option value="both">Both GPUs</option>
                    <option value="0">GPU 0</option>
                    <option value="1">GPU 1</option>
                </select>
            </div>
            <div class="metric"><span class="metric-label">GPU Temp</span><span class="metric-value gpu" id="n2-gpu-temp">--</span></div>
            <div class="metric"><span class="metric-label">GPU VRAM</span><span class="metric-value gpu" id="n2-gpu-mem">--</span></div>
            <div class="metric"><span class="metric-label">GPU Power</span><span class="metric-value power" id="n2-gpu-power">--</span></div>

            <h3>Power &amp; Cost</h3>
            <div class="metric"><span class="metric-label">Total GPU Power</span><span class="metric-value power" id="n2-total-power">--</span></div>
            <div class="metric"><span class="metric-label">Est. Daily Energy</span><span class="metric-value" id="n2-kwh">--</span></div>
            <div class="metric"><span class="metric-label">Est. Daily Cost</span><span class="metric-value" id="n2-cost">--</span></div>
        </div>

        <div class="card card-tall">
            <h2>📈 GPU Utilization (node2)</h2>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">GPU 0</div><div class="mini-value" id="gpu0-util-current">--</div></div>
                <div class="mini-card"><div class="mini-label">GPU 1</div><div class="mini-value" id="gpu1-util-current">--</div></div>
            </div>
            <canvas id="gpu-util-chart" width="600" height="200" style="width:100%;height:200px;margin-top:10px;display:block;"></canvas>
        </div>

        <div class="card card-tall">
            <h2>📊 Token Usage (per day)</h2>
            <h3>Today</h3>
            <div class="metric"><span class="metric-label">Tokens Today</span><span class="metric-value" id="token-today">--</span></div>
            <div class="metric"><span class="metric-label">Input Tokens</span><span class="metric-value ram" id="token-input">--</span></div>
            <div class="metric"><span class="metric-label">Output Tokens</span><span class="metric-value gpu" id="token-output">--</span></div>
            <div class="metric"><span class="metric-label">Models Used</span><span class="metric-value" id="token-models">--</span></div>
            <h3>llama.cpp (node2) Real-time</h3>
            <div class="metrics-grid">
                <div class="mini-card"><div class="mini-label">Input tok/s</div><div class="mini-value" id="llama-input-tps">--</div></div>
                <div class="mini-card"><div class="mini-label">Output tok/s</div><div class="mini-value" id="llama-output-tps">--</div></div>
            </div>
            <div class="metric"><span class="metric-label">Requests (5min)</span><span class="metric-value" id="llama-requests">--</span></div>
            <h3>Recent (most-recent first)</h3>
            <div class="tokens-list" id="token-list">--</div>
        </div>
    </div>

    <div class="footer">
        Auto-updates every 30s &middot; Last sync: <span id="last-update">--</span>
    </div>

    <script>
        const statusEl  = document.getElementById('status');
        const syncBtn   = document.getElementById('sync-btn');
        const gpuSel    = document.getElementById('gpu-selector');
        let lastPayload = null;
        let ws, reconnectTimer;

        // ---- WebSocket (use page host so it works from any hostname) ----
        function connect() {
            const proto = location.protocol === 'https:' ? 'wss' : 'ws';
            ws = new WebSocket(proto + '://' + location.host);

            ws.onopen = () => {
                statusEl.textContent = 'Connected';
                statusEl.className  = 'status connected';
            };
            ws.onclose = () => {
                statusEl.textContent = 'Reconnecting…';
                statusEl.className  = 'status disconnected';
                reconnectTimer = setTimeout(connect, 3000);
            };
            ws.onerror = () => {};          // onclose fires right after
            ws.onmessage = (e) => {
                try {
                    lastPayload = JSON.parse(e.data);
                    render(lastPayload);
                } catch(err) { console.error('parse', err); }
            };
        }
        connect();

        // ---- Sync button → ask server to collect NOW ----
        syncBtn.addEventListener('click', () => {
            syncBtn.disabled = true;
            syncBtn.textContent = '⏳ Syncing…';
            if (ws && ws.readyState === 1) ws.send('sync');
            setTimeout(() => { syncBtn.disabled = false; syncBtn.textContent = '🔄 Sync'; }, 3000);
        });

        // ---- GPU selector → re-render from cached data ----
        gpuSel.addEventListener('change', () => { if (lastPayload) render(lastPayload); });

        // ---- Render ----
        function $(id) { return document.getElementById(id); }
        function fmt(v, suffix) {
            if (v == null || v === '' || v === 'N/A') return '--';
            const n = parseFloat(v);
            return (isNaN(n) ? v : Math.round(n)) + suffix;
        }

        function render(d) {
            $('last-update').textContent = new Date(d.timestamp).toLocaleString();
            $('ts-time').textContent     = new Date(d.timestamp).toLocaleString();

            // TS
            $('ts-cpu1').textContent  = fmt(d.ts.cpu1,  '°C');
            $('ts-cpu2').textContent  = fmt(d.ts.cpu2,  '°C');
            $('ts-sys').textContent   = fmt(d.ts.sys,   '°C');
            $('ts-pch').textContent   = fmt(d.ts.pch,   '°C');
            $('ts-perip').textContent = fmt(d.ts.perip, '°C');
            $('ts-fan1').textContent  = fmt(d.ts.fan1,  ' RPM');
            $('ts-fan2').textContent  = fmt(d.ts.fan2,  ' RPM');
            $('ts-fan5').textContent  = fmt(d.ts.fan5,  ' RPM');
            // Drive temperatures
            $('ts-drive0').textContent  = fmt(d.ts.drive0_temp, '°C');
            $('ts-drive1').textContent  = fmt(d.ts.drive1_temp, '°C');
            $('ts-drive2').textContent  = fmt(d.ts.drive2_temp, '°C');
            $('ts-drive3').textContent  = fmt(d.ts.drive3_temp, '°C');
            // NVMe temperatures
            $('ts-nvme0').textContent  = fmt(d.ts.nvme0_temp, '°C');
            $('ts-nvme1').textContent  = fmt(d.ts.nvme1_temp, '°C');
            $('ts-nvme2').textContent  = fmt(d.ts.nvme2_temp, '°C');
            $('ts-nvme3').textContent  = fmt(d.ts.nvme3_temp, '°C');

            // Node2 system
            const n = d.node2;
            $('n2-ram-used').textContent   = n.ram_used  || '--';
            $('n2-ram-avail').textContent  = n.ram_avail || '--';
            $('n2-root').textContent       = n.root_pct ? n.root_pct + '% (' + n.root_used + '/' + n.root_total + ')' : '--';
            $('n2-llama-status').textContent = n.llama_status === 'active' ? '✓ Running' : (n.llama_status || '--');
            $('n2-llama-mem').textContent   = fmt(n.llama_mem, ' GB');

            // GPU (based on selector)
            const sel = gpuSel.value;
            if (sel === 'both') {
                $('n2-gpu-temp').textContent  = fmt(n.gpu0_temp,'°C') + ' / ' + fmt(n.gpu1_temp,'°C');
                $('n2-gpu-mem').textContent   = fmt(n.gpu0_mem,'') + '/' + fmt(n.gpu0_total,'') + ' · ' + fmt(n.gpu1_mem,'') + '/' + fmt(n.gpu1_total,'') + ' MiB';
                $('n2-gpu-power').textContent = fmt(n.gpu0_power,'W') + ' / ' + fmt(n.gpu1_power,'W');
            } else {
                const g = sel === '0' ? 'gpu0' : 'gpu1';
                $('n2-gpu-temp').textContent  = fmt(n[g+'_temp'], '°C');
                $('n2-gpu-mem').textContent   = fmt(n[g+'_mem'],'') + '/' + fmt(n[g+'_total'],'') + ' MiB';
                $('n2-gpu-power').textContent = fmt(n[g+'_power'], 'W');
            }

            // Power
            $('n2-total-power').textContent = fmt(n.total_power, 'W');
            // Display kWh with 3 decimals (don't round to integer)
            const kwh = parseFloat(n.daily_kwh || '0');
            $('n2-kwh').textContent = isNaN(kwh) ? '--' : kwh.toFixed(3) + ' kWh';
            $('n2-cost').textContent        = n.daily_cost ? '$' + n.daily_cost : '--';

            // Llama tok/s metrics (node2 real-time)
            if (d.node2) {
                const i = d.node2;
                $('llama-input-tps').textContent = i.llama_input_tps ? parseFloat(i.llama_input_tps).toFixed(1) + ' tok/s' : '--';
                $('llama-output-tps').textContent = i.llama_output_tps ? parseFloat(i.llama_output_tps).toFixed(1) + ' tok/s' : '--';
                $('llama-requests').textContent = i.llama_requests != null ? i.llama_requests : '--';
            }

            // GPU utilization graph
            if (d.node2 && Array.isArray(d.node2.gpu_util_history) && d.node2.gpu_util_history.length > 0) {
                const hist = d.node2.gpu_util_history;
                $('gpu0-util-current').textContent = (d.node2.gpu0_util != null ? Math.round(d.node2.gpu0_util) + '%' : '--');
                $('gpu1-util-current').textContent = (d.node2.gpu1_util != null ? Math.round(d.node2.gpu1_util) + '%' : '--');
                drawGpuChart(hist);
            } else {
                $('gpu0-util-current').textContent = '--';
                $('gpu1-util-current').textContent = '--';
            }

            // Token stats (if present)
            if (d.token_stats && Array.isArray(d.token_stats)) {
                const today = d.token_stats[0] || null;
                $('token-today').textContent = today ? (today.total_tokens.toLocaleString()) : '--';
                $('token-input').textContent  = today ? (today.input_tokens.toLocaleString()) : '--';
                $('token-output').textContent = today ? (today.output_tokens.toLocaleString()) : '--';
                $('token-models').textContent = today ? (today.model_count.toLocaleString()) : '--';
                const listEl = document.getElementById('token-list');
                listEl.innerHTML = '';
                d.token_stats.slice(0,7).forEach(item => {
                    const el = document.createElement('div');
                    el.textContent = item.date + ': ' + item.total_tokens.toLocaleString() + ' tokens (' + item.model_count + ' calls)';
                    listEl.appendChild(el);
                });
            }
        }

        // ---- GPU Utilization Chart ----
        let lastGpuData = null;

        function drawGpuChart(data) {
            const canvas = document.getElementById('gpu-util-chart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            // Size canvas to its rendered CSS width
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const W = Math.round(rect.width);
            const H = 200;

            canvas.width = W * dpr;
            canvas.height = H * dpr;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);

            ctx.clearRect(0, 0, W, H);

            // Determine how many points to show (fit in canvas)
            const maxPoints = 60;
            const pts = data.length > maxPoints ? data.slice(-maxPoints) : data;
            const n = pts.length;
            if (n === 0) return;

            const pad = { top: 20, right: 15, bottom: 30, left: 40 };
            const chartW = W - pad.left - pad.right;
            const chartH = H - pad.top - pad.bottom;

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = pad.top + (chartH / 4) * i;
                ctx.beginPath();
                ctx.moveTo(pad.left, y);
                ctx.lineTo(W - pad.right, y);
                ctx.stroke();
                // Label
                const val = 100 - (100 / 4) * i;
                ctx.fillStyle = '#666';
                ctx.font = '11px -apple-system, sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(Math.round(val) + '%', pad.left - 6, y + 4);
            }

            // Helper: map util value to canvas x,y
            const stepX = chartW / Math.max(n - 1, 1);

            function pointToXY(i, val) {
                return {
                    x: pad.left + i * stepX,
                    y: pad.top + chartH * (1 - val / 100)
                };
            }

            // Draw lines + fill
            function drawSeries(key, color, fillColor) {
                const coords = pts.map((p, i) => pointToXY(i, p[key] ?? 0));
                if (coords.length < 2) return;

                // Fill
                ctx.beginPath();
                ctx.moveTo(coords[0].x, coords[0].y);
                for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y);
                ctx.lineTo(coords[coords.length - 1].x, pad.top + chartH);
                ctx.lineTo(coords[0].x, pad.top + chartH);
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Stroke
                ctx.beginPath();
                ctx.moveTo(coords[0].x, coords[0].y);
                for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                ctx.stroke();

                // End dot
                const last = coords[coords.length - 1];
                ctx.beginPath();
                ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label at end
                ctx.fillStyle = color;
                ctx.font = 'bold 12px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(Math.round(coords[coords.length - 1].y === undefined ? 0 : (1 - coords[coords.length - 1].y / (pad.top + chartH)) * 100) + '%', last.x + 8, last.y + 4);
            }

            drawSeries('gpu0_util', '#667eea', 'rgba(102,126,234,0.12)');
            drawSeries('gpu1_util', '#f093fb', 'rgba(240,147,251,0.12)');

            // Legend
            ctx.font = '11px -apple-system, sans-serif';
            ctx.fillStyle = '#667eea';
            ctx.fillRect(pad.left + 10, H - 16, 10, 10);
            ctx.fillText('GPU 0', pad.left + 24, H - 7);
            ctx.fillStyle = '#f093fb';
            ctx.fillRect(pad.left + 80, H - 16, 10, 10);
            ctx.fillText('GPU 1', pad.left + 94, H - 7);

            // Time label
            if (pts.length > 0) {
                const firstTs = new Date(pts[0].ts || 0);
                const lastTs = new Date(pts[n - 1].ts || 0);
                const fmtTime = (d) => d.toTimeString().slice(0, 5);
                ctx.fillStyle = '#555';
                ctx.font = '10px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(fmtTime(firstTs) + '  —  ' + fmtTime(lastTs), W / 2, H - 8);
            }

            lastGpuData = data;
        }
    </script>
</body>
</html>`;

// ---- HTTP server ----
const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// ---- WebSocket server (no path — accepts on /) ----
const wss = new WebSocket.Server({ server });

function broadcast(json) {
    const msg = JSON.stringify(json);
    for (const c of wss.clients) {
        if (c.readyState === WebSocket.OPEN) c.send(msg);
    }
}

// Fetch token stats (runs the aggregator script)
function fetchTokenStats(callback) {
    execFile('bash', [TOKENS_SCRIPT], { timeout: 30000 }, (err, stdout, stderr) => {
        if (err) { console.error('[tokens] error:', err.message); return callback(null); }
        try {
            const stats = JSON.parse(stdout.trim());
            return callback(stats);
        } catch (e) {
            console.error('[tokens] parse error:', e.message);
            return callback(null);
        }
    });
}

wss.on('connection', (socket) => {
    console.log('[ws] client connected');
    // Send cached data immediately
    if (lastData) socket.send(JSON.stringify(lastData));

    socket.on('message', (raw) => {
        const txt = raw.toString().trim();
        if (txt === 'sync') {
            console.log('[ws] manual sync requested');
            collectOnce();
        }
    });
});

// ---- Data collection (runs script once, parses JSON output) ----
function collectOnce() {
    if (collecting) return;
    collecting = true;
    execFile('bash', [SCRIPT_PATH], { timeout: 45000 }, (err, stdout, stderr) => {
        collecting = false;
        if (err) { console.error('[collect] error:', err.message); return; }
        try {
            const json = JSON.parse(stdout.trim());
            // Attach token stats (best-effort)
            fetchTokenStats((stats) => {
                if (stats) json.token_stats = stats;

                // Normalize GPU util: if current readouts are zero but history contains recent non-zero
                try {
                    if (json.node2 && Array.isArray(json.node2.gpu_util_history)) {
                        const hist = json.node2.gpu_util_history;
                        // find last non-null numeric gpu0_util/gpu1_util
                        if ((json.node2.gpu0_util === 0 || json.node2.gpu0_util === null) && hist.length) {
                            for (let i = hist.length - 1; i >= 0; --i) {
                                const v = hist[i].gpu0_util;
                                if (typeof v === 'number' && !isNaN(v) && v > 0) { json.node2.gpu0_util = v; break; }
                            }
                        }
                        if ((json.node2.gpu1_util === 0 || json.node2.gpu1_util === null) && hist.length) {
                            for (let i = hist.length - 1; i >= 0; --i) {
                                const v = hist[i].gpu1_util;
                                if (typeof v === 'number' && !isNaN(v) && v > 0) { json.node2.gpu1_util = v; break; }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[collect] gpu util normalization failed', e);
                }

                lastData = json;
                console.log('[collect] ok @', json.timestamp);
                broadcast(json);
            });
        } catch (e) {
            console.error('[collect] parse error:', e.message, 'raw:', stdout.substring(0, 200));
        }
    });
}

// Collect immediately, then every 30s
collectOnce();
setInterval(collectOnce, 30000);

server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Dashboard running at http://0.0.0.0:' + PORT);
});
