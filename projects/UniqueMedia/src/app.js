const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const previewRoutes = require('./routes/preview');

const app = express();
const PORT = process.env.PORT || 3847;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api', apiRoutes);
app.use('/api', previewRoutes);

// SPA fallback - serve index.html for all non-API routes
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.includes('.')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  } else {
    next();
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   UniqueMedia - Duplicate Manager    ║`);
  console.log(`  ║   http://localhost:${PORT}                   ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});

module.exports = app;
