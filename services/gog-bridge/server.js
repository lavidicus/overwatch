#!/usr/bin/env node
/**
 * gog-bridge — HTTP bridge for the gog CLI
 *
 * Lets n8n workflows (and other HTTP clients) invoke gog commands
 * without needing direct shell access.
 *
 * Endpoints:
 *   POST /gmail/search      — Search Gmail
 *   POST /gmail/send         — Send email
 *   POST /gmail/messages     — List messages (unthreaded)
 *   POST /calendar/events    — List calendar events
 *   POST /calendar/create    — Create calendar event
 *   POST /drive/search       — Search Drive files
 *   POST /contacts/list      — List contacts
 *   POST /sheets/get         — Read a sheet range
 *   POST /sheets/append      — Append to a sheet
 *   POST /sheets/update      — Update a sheet range
 *   POST /sheets/metadata    — Get sheet metadata
 *   GET  /health             — Health check
 *   GET  /auth               — Show authenticated accounts
 */

import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const GOG_BIN = '/usr/local/bin/gog';
const GOG_ACCOUNT = process.env.GOG_ACCOUNT || 'ops@claw-sync.com';
const PORT = parseInt(process.env.PORT || '18790', 10);

// --- Helpers ---

/** Run gog CLI and return parsed JSON */
async function runGog(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  const result = await execFileAsync(GOG_BIN, args, {
    maxBuffer: 5 * 1024 * 1024, // 5MB
    timeout: 30000,
    env,
  });
  if (result.stderr) {
    // Some gog commands write warnings to stderr but still succeed
    console.warn('[gog-bridge] stderr:', result.stderr.trim());
  }
  if (result.stdout) {
    try {
      return JSON.parse(result.stdout);
    } catch {
      return { raw: result.stdout };
    }
  }
  return { success: true };
}

/** Wrap a handler with error handling */
function handler(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req);
      res.json(result);
    } catch (err) {
      console.error(`[gog-bridge] Error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

// --- Routes ---

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gog-bridge', version: '1.0.0', account: GOG_ACCOUNT });
});

// Auth status
app.get('/auth', handler(async () => {
  const result = await runGog(['auth', 'list', '--json']);
  return result;
}));

// Gmail: search threads
app.post('/gmail/search', handler(async (req) => {
  const { query, max = 10, account } = req.body;
  if (!query) throw new Error('Missing query');
  const args = ['gmail', 'search', query, '--max', String(max), '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Gmail: list unthreaded messages
app.post('/gmail/messages', handler(async (req) => {
  const { query, max = 20, account } = req.body;
  if (!query) throw new Error('Missing query');
  const args = ['gmail', 'messages', 'search', query, '--max', String(max), '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Gmail: send email
app.post('/gmail/send', handler(async (req) => {
  const { to, subject, body, bodyFile, bodyHtml, account, replyToMessageId, draft } = req.body;
  if (!to || !subject) throw new Error('Missing to or subject');

  const args = ['gmail', 'send', '--to', to, '--subject', subject, '--json'];
  if (account) args.push('--account', account);
  if (replyToMessageId) args.push('--reply-to-message-id', replyToMessageId);
  if (draft) args.push('--draft');

  if (body) args.push('--body', body);
  if (bodyFile) args.push('--body-file', bodyFile);
  if (bodyHtml) args.push('--body-html', bodyHtml);

  return await runGog(args);
}));

// Calendar: list events
app.post('/calendar/events', handler(async (req) => {
  const { calendarId = 'primary', from, to, account } = req.body;
  if (!from || !to) throw new Error('Missing from/to (ISO dates)');
  const args = ['calendar', 'events', calendarId, '--from', from, '--to', to, '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Calendar: create event
app.post('/calendar/create', handler(async (req) => {
  const { calendarId = 'primary', summary, from, to, account, eventColor } = req.body;
  if (!summary || !from || !to) throw new Error('Missing summary, from, or to');
  const args = ['calendar', 'create', calendarId, '--summary', summary, '--from', from, '--to', to, '--json'];
  if (account) args.push('--account', account);
  if (eventColor) args.push('--event-color', String(eventColor));
  return await runGog(args);
}));

// Drive: search files
app.post('/drive/search', handler(async (req) => {
  const { query, max = 10, account } = req.body;
  if (!query) throw new Error('Missing query');
  const args = ['drive', 'search', query, '--max', String(max), '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Contacts: list
app.post('/contacts/list', handler(async (req) => {
  const { max = 20, account } = req.body;
  const args = ['contacts', 'list', '--max', String(max), '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Sheets: get range
app.post('/sheets/get', handler(async (req) => {
  const { sheetId, range, account } = req.body;
  if (!sheetId || !range) throw new Error('Missing sheetId or range');
  const args = ['sheets', 'get', sheetId, range, '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Sheets: append
app.post('/sheets/append', handler(async (req) => {
  const { sheetId, range, valuesJson, account } = req.body;
  if (!sheetId || !range || !valuesJson) throw new Error('Missing sheetId, range, or valuesJson');
  const args = ['sheets', 'append', sheetId, range, '--values-json', JSON.stringify(valuesJson), '--input', 'USER_ENTERED', '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Sheets: update range
app.post('/sheets/update', handler(async (req) => {
  const { sheetId, range, valuesJson, account } = req.body;
  if (!sheetId || !range || !valuesJson) throw new Error('Missing sheetId, range, or valuesJson');
  const args = ['sheets', 'update', sheetId, range, '--values-json', JSON.stringify(valuesJson), '--input', 'USER_ENTERED', '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// Sheets: metadata
app.post('/sheets/metadata', handler(async (req) => {
  const { sheetId, account } = req.body;
  if (!sheetId) throw new Error('Missing sheetId');
  const args = ['sheets', 'metadata', sheetId, '--json'];
  if (account) args.push('--account', account);
  return await runGog(args);
}));

// --- Catch-all for unknown endpoints ---
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    availableEndpoints: [
      'GET  /health',
      'GET  /auth',
      'POST /gmail/search',
      'POST /gmail/messages',
      'POST /gmail/send',
      'POST /calendar/events',
      'POST /calendar/create',
      'POST /drive/search',
      'POST /contacts/list',
      'POST /sheets/get',
      'POST /sheets/append',
      'POST /sheets/update',
      'POST /sheets/metadata',
    ],
  });
});

// --- Start ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[gog-bridge] Listening on 0.0.0.0:${PORT}`);
  console.log(`[gog-bridge] Account: ${GOG_ACCOUNT}`);
  console.log(`[gog-bridge] gog binary: ${GOG_BIN}`);
});
