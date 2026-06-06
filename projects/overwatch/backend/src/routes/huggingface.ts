import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { spawn } from 'child_process';
import { notify } from '../services/notification.js';
import { EncryptionService } from '../services/encryption.js';

const router = Router();
const prisma = new PrismaClient();

const HF_API_BASE = 'https://huggingface.co/api';

/**
 * GET /api/hf/search
 * Search HuggingFace models by query and optional tags.
 */
router.get('/search', authenticate, auditLog('HF_SEARCH'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const {
      q,
      limit,
      sort,
      direction,
      author,
      pipeline_tag,
      library,
      tags,
    } = req.query as Record<string, string | undefined>;

    if (!q && !author && !pipeline_tag) {
      return res.status(400).json({ error: 'At least one search parameter (q, author, or pipeline_tag) is required' });
    }

    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (author) params.set('author', author);
    if (pipeline_tag) params.set('pipeline_tag', pipeline_tag);
    if (library) params.set('library', library);
    if (tags) params.set('tags', tags);
    if (sort) params.set('sort', sort);
    if (direction) params.set('direction', direction);
    const limitNum = Math.min(Number.parseInt(limit || '20', 10) || 20, 100);
    params.set('limit', String(limitNum));

    const url = `${HF_API_BASE}/models?${params.toString()}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `HF API error: ${response.statusText}` });
    }

    const models = await response.json() as any[];

    // Format results for frontend
    const formatted = models.map((m) => ({
      id: m.id,
      name: m.id.split('/').pop() || m.id,
      author: m.author,
      likes: m.likes || 0,
      downloads: m.downloads || 0,
      tags: m.tags || [],
      pipeline_tag: m.pipeline_tag,
      library: m.library,
      safetensors: m.safetensors,
      size: formatModelSize(m),
      lastModified: m.lastModified,
      private: m.private,
      siblings: m.siblings?.map((s: any) => s.rfilename) || [],
      ggufFiles: m.siblings?.filter((s: any) => s.rfilename?.endsWith('.gguf')) || [],
    }));

    res.json({ models: formatted, count: formatted.length });
  } catch (error: any) {
    console.error('HF search error:', error.message);
    res.status(500).json({ error: 'Failed to search HuggingFace', details: error.message });
  }
});

/**
 * GET /api/hf/models/:repoId
 * Get detailed info about a specific HF model.
 * Note: repoId may contain slashes, so we use a catch-all pattern.
 */
router.get('/models/*repoPath', authenticate, auditLog('HF_MODEL_DETAILS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    // path-to-regexp v8 (Express 5) returns catch-all as array
    const repoPath = Array.isArray(req.params.repoPath) ? req.params.repoPath.join('/') : req.params.repoPath;
    const repoId = decodeURIComponent(repoPath);

    const [modelResp, cardsResp] = await Promise.all([
      fetch(`${HF_API_BASE}/models/${repoId}`, { signal: AbortSignal.timeout(15000) }),
      fetch(`${HF_API_BASE}/models/${repoId}/tree/main`, { signal: AbortSignal.timeout(15000) }),
    ]);

    if (!modelResp.ok) {
      return res.status(modelResp.status).json({ error: `HF API error: ${modelResp.statusText}` });
    }

    const model = await modelResp.json() as any;
    const cards: any[] = cardsResp.ok ? (await cardsResp.json() as any[]) : [];

    // Extract GGUF files from the file tree
    const ggufFiles = cards
      .filter((c) => c.type === 'file' && c.path?.endsWith('.gguf'))
      .map((c) => ({
        path: c.path,
        size: c.size,
        sizeGB: c.size ? Math.round((c.size / (1024 * 1024 * 1024)) * 100) / 100 : 0,
        lfs: c.lfs,
      }));

    // Detect mmproj files
    const mmprojFiles = cards
      .filter((c) => c.type === 'file' && c.path?.match(/mmproj.*\.gguf$/i))
      .map((c) => ({
        path: c.path,
        size: c.size,
        sizeGB: c.size ? Math.round((c.size / (1024 * 1024 * 1024)) * 100) / 100 : 0,
      }));

    // Also get from siblings if tree failed
    const siblingsGguf = (model.siblings || [])
      .filter((s: any) => s.rfilename?.endsWith('.gguf'))
      .map((s: any) => ({
        path: s.rfilename,
        size: s.size,
        sizeGB: s.size ? Math.round((s.size / (1024 * 1024 * 1024)) * 100) / 100 : 0,
      }));

    res.json({
      id: model.id,
      author: model.author,
      private: model.private,
      tags: model.tags || [],
      pipeline_tag: model.pipeline_tag,
      library: model.library,
      likes: model.likes || 0,
      downloads: model.downloads || 0,
      sha: model.sha,
      lastModified: model.lastModified,
      createdAt: model.created_at,
      cards: cards.slice(0, 200),
      ggufFiles: ggufFiles.length > 0 ? ggufFiles : siblingsGguf,
      mmprojFiles,
      hasGGUF: ggufFiles.length > 0 || siblingsGguf.length > 0,
    });
  } catch (error: any) {
    console.error('HF model details error:', error.message);
    res.status(500).json({ error: 'Failed to get model details', details: error.message });
  }
});

/**
 * POST /api/hf/download
 * Queue a download of a GGUF file from HuggingFace to a remote system.
 */
router.post('/download', authenticate, auditLog('HF_DOWNLOAD'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = z.object({
      repoId: z.string().min(1),
      filename: z.string().min(1), // Specific GGUF filename
      systemId: z.string().uuid(),
      targetPath: z.string().min(1).default('/opt/models/gguf'),
    }).parse(req.body);

    const system = await prisma.remoteSystem.findUnique({
      where: { id: body.systemId },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Create HFDownload record
    const download = await prisma.hFDownload.create({
      data: {
        systemId: body.systemId,
        modelId: body.repoId,
        fileName: body.filename,
        status: 'QUEUED',
        progress: 0,
      },
    });

    // Start download asynchronously
    (async () => {
      try {
        await executeHFDownload(download.id, system, body.repoId, body.filename, body.targetPath);
      } catch (err: any) {
        console.error(`HF download ${download.id} failed:`, err.message);
        await prisma.hFDownload.update({
          where: { id: download.id },
          data: {
            status: 'FAILED',
            error: err.message,
          },
        }).catch(() => {});
        notify.systemHealth(body.systemId, false, `HF download failed: ${err.message}`);
      }
    })();

    res.status(201).json({
      message: `Download queued: ${body.filename} → ${body.targetPath}`,
      downloadId: download.id,
      status: 'QUEUED',
      targetPath: body.targetPath,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('HF download error:', error.message);
    res.status(500).json({ error: 'Failed to queue download', details: error.message });
  }
});

/**
 * GET /api/hf/downloads
 * List all downloads with optional filters.
 * MUST come before /downloads/:id wildcard.
 */
router.get('/downloads', authenticate, auditLog('HF_LIST_DOWNLOADS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { systemId, status } = req.query as Record<string, string | undefined>;

    const where: any = {};
    if (systemId) where.systemId = systemId;
    if (status) where.status = status;

    const downloads = await prisma.hFDownload.findMany({
      where,
      include: {
        system: {
          select: { id: true, name: true, hostname: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ downloads });
  } catch (error: any) {
    console.error('List downloads error:', error.message);
    res.status(500).json({ error: 'Failed to list downloads', details: error.message });
  }
});

/**
 * GET /api/hf/downloads/:id
 * Get a specific download's status.
 */
router.get('/downloads/:id', authenticate, auditLog('HF_DOWNLOAD_STATUS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const download = await prisma.hFDownload.findUnique({
      where: { id: req.params.id as string },
      include: {
        system: {
          select: { id: true, name: true, hostname: true },
        },
      },
    });

    if (!download) {
      return res.status(404).json({ error: 'Download not found' });
    }

    res.json({ download });
  } catch (error: any) {
    console.error('Get download error:', error.message);
    res.status(500).json({ error: 'Failed to get download', details: error.message });
  }
});

/**
 * POST /api/hf/downloads/:id/cancel
 * Cancel a queued or downloading download.
 */
router.post('/downloads/:id/cancel', authenticate, auditLog('HF_CANCEL_DOWNLOAD'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const download = await prisma.hFDownload.findUnique({
      where: { id: req.params.id as string },
    });

    if (!download) {
      return res.status(404).json({ error: 'Download not found' });
    }

    if (download.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel a completed download' });
    }

    await prisma.hFDownload.update({
      where: { id: download.id },
      data: { status: 'FAILED', error: 'Cancelled by user' },
    });

    res.json({ message: 'Download cancelled' });
  } catch (error: any) {
    console.error('Cancel download error:', error.message);
    res.status(500).json({ error: 'Failed to cancel download', details: error.message });
  }
});

// ─── Helpers ───

function formatModelSize(model: any): string {
  if (model.siblings) {
    const totalBytes = model.siblings.reduce((sum: number, s: any) => sum + (s.size || 0), 0);
    if (totalBytes > 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (totalBytes > 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(0)} MB`;
    }
  }
  return 'Unknown';
}

/**
 * Execute HF download via SSH using `huggingface-cli` or `wget`.
 */
async function executeHFDownload(
  downloadId: string,
  system: any,
  repoId: string,
  filename: string,
  targetPath: string
): Promise<void> {
  if (system.protocol === 'LOCAL') {
    // Local download using huggingface-cli
    await localHFDownload(downloadId, repoId, filename, targetPath);
    return;
  }

  // SSH download
  let sshKey: string | undefined;

  if (system.encryptedKey) {
    const encrypted = JSON.parse(system.encryptedKey);
    sshKey = await EncryptionService.decrypt(encrypted);
  }

  await remoteHFDownload(
    downloadId,
    system.hostname,
    system.port,
    system.username,
    repoId,
    filename,
    targetPath,
    sshKey
  );
}

async function localHFDownload(
  downloadId: string,
  repoId: string,
  filename: string,
  targetPath: string
): Promise<void> {
  // Ensure target directory exists
  const { execSync } = await import('child_process');
  try {
    execSync(`mkdir -p "${targetPath}"`);
  } catch { /* ignore */ }

  // Try huggingface-cli first, fall back to direct wget
  let downloadCmd: string;
  try {
    // Try huggingface-cli download
    execSync(`huggingface-cli download "${repoId}" "${filename}" --local-dir "${targetPath}" --resume-download 2>&1`, {
      timeout: 3600000, // 1 hour max
    });
  } catch {
    // Fall back to wget
    downloadCmd = `wget -O "${targetPath}/${filename}" "https://huggingface.co/${repoId}/resolve/main/${filename}" --content-disposition --progress=bar:force 2>&1`;
    execSync(downloadCmd, { timeout: 3600000 });
  }

  // Mark complete
  const stat = (await import('fs')).statSync(`${targetPath}/${filename}`);
  await prisma.hFDownload.update({
    where: { id: downloadId },
    data: {
      status: 'COMPLETED',
      progress: 100,
      sizeTotal: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
      sizeDownloaded: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
      completedAt: new Date(),
    },
  });
}

async function remoteHFDownload(
  downloadId: string,
  hostname: string,
  port: number,
  username: string,
  repoId: string,
  filename: string,
  targetPath: string,
  sshKey?: string
): Promise<void> {
  const { execSync } = await import('child_process');
  const pathModule = await import('path');
  const osModule = await import('os');
  const fsModule = await import('fs');

  // Build SSH args
  const sshArgs: string[] = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=10',
    '-p', port.toString(),
  ];

  if (sshKey) {
    const tempKeyFile = pathModule.default.join(osModule.default.tmpdir(), `ssh_key_hf_${Date.now()}`);
    fsModule.default.writeFileSync(tempKeyFile, sshKey, { mode: 0o600 });
    sshArgs.push('-i', tempKeyFile);

    setTimeout(() => {
      try { fsModule.unlinkSync(tempKeyFile); } catch { /* ignore */ }
    }, 3600000);
  }

  const target = `${username}@${hostname}`;

  // Build the download command for remote execution
  const sshCmdBase = `ssh ${sshArgs.join(' ')}`;

  // Create target directory
  try {
    execSync(`${sshCmdBase} ${target} "mkdir -p '${targetPath}'"`, { timeout: 30000 });
  } catch { /* ignore */ }

  // Use huggingface-cli if available on remote, otherwise wget
  const checkHfCli = `${sshCmdBase} ${target} "which huggingface-cli 2>/dev/null && echo YES || echo NO"`;
  let hasHfCli = false;
  try {
    const result = execSync(checkHfCli, { timeout: 15000 }).toString().trim();
    hasHfCli = result === 'YES';
  } catch { /* assume no */ }

  const downloadCmd = hasHfCli
    ? `huggingface-cli download '${repoId}' '${filename}' --local-dir '${targetPath}' --resume-download 2>&1`
    : `wget -O '${targetPath}/${filename}' 'https://huggingface.co/${repoId}/resolve/main/${filename}' --content-disposition --progress=bar:force 2>&1`;

  // Update to DOWNLOADING
  await prisma.hFDownload.update({
    where: { id: downloadId },
    data: { status: 'DOWNLOADING', startedAt: new Date(), progress: 0 },
  });

  // Execute download with streaming output
  const { spawn: spawnChild } = await import('child_process');
  const sshProcess = spawnChild('ssh', [...sshArgs, target, downloadCmd], {
    timeout: 3600000,
  });

  let output = '';
  sshProcess.stdout.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    output += line + '\n';

    // Try to parse progress from wget output (e.g., "1.50 GiB  12.3MiB/s")
    const progressMatch = line.match(/(\d+(?:\.\d+)?)\s*(%)|(\d+(?:\.\d+)?)\s*%|Completed/);
    if (progressMatch) {
      let pct: number | undefined;
      if (progressMatch[1]) {
        pct = Math.min(100, parseFloat(progressMatch[1]));
      }
      if (progressMatch[3]) {
        pct = Math.min(100, parseFloat(progressMatch[3]));
      }
      if (progressMatch[0]?.includes('Completed')) {
        pct = 100;
      }
      if (pct !== undefined && pct > 0) {
        prisma.hFDownload.update({
          where: { id: downloadId },
          data: { progress: Math.round(pct * 10) / 10 },
        }).catch(() => {});
      }
    }

    // Emit real-time log
    notify.installationLog('hf:' + downloadId, line, line.includes('Error') ? 'error' : 'info');
  });

  sshProcess.stderr.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line) {
      notify.installationLog('hf:' + downloadId, line, 'error');
    }
  });

  await new Promise<void>((resolve, reject) => {
    sshProcess.on('close', (code) => {
      if (code === 0) {
        // Verify file exists and get size
        const verifyCmd = `${sshCmdBase} ${target} "stat -c %s '${targetPath}/${filename}' 2>/dev/null || stat -f %z '${targetPath}/${filename}' 2>/dev/null"`;
        try {
          const sizeStr = execSync(verifyCmd, { timeout: 15000 }).toString().trim();
          const sizeBytes = parseInt(sizeStr) || 0;
          const sizeMB = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;

          prisma.hFDownload.update({
            where: { id: downloadId },
            data: {
              status: 'COMPLETED',
              progress: 100,
              sizeTotal: sizeMB,
              sizeDownloaded: sizeMB,
              completedAt: new Date(),
            },
          }).catch(() => {});
        } catch { /* size check failed, still mark complete */ }

        prisma.hFDownload.update({
          where: { id: downloadId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            completedAt: new Date(),
          },
        }).catch(() => {});

        resolve();
      } else {
        reject(new Error(`Download failed with code ${code}: ${output.slice(-500)}`));
      }
    });
    sshProcess.on('error', reject);
  });
}

export default router;
