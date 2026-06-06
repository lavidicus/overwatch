import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { EncryptionService } from '../services/encryption.js';
import { spawn, execSync } from 'child_process';
import { runRemoteSSH } from '../utils/ssh.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/whatllm/systems
 * List all systems with hardware analysis
 */
router.get('/systems', authenticate, auditLog('LIST_HARDWARE_ANALYSIS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const systems = await prisma.remoteSystem.findMany({
      include: {
        hardwareInfo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = systems.map((s) => ({
      id: s.id,
      name: s.name,
      hostname: s.hostname,
      protocol: s.protocol,
      active: s.active,
      hardwareInfo: s.hardwareInfo,
    }));

    res.json({ systems: result });
  } catch (error) {
    console.error('List hardware analysis error:', error);
    res.status(500).json({ error: 'Failed to list hardware analysis' });
  }
});

/**
 * POST /api/whatllm/analyze/:systemId
 * Run WhichLLM analysis on a system
 */
router.post('/analyze/:systemId', authenticate, auditLog('ANALYZE_HARDWARE'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { systemId } = req.params as Record<string, string>;
    console.log(`[WhatLLM] Starting hardware analysis for system ${systemId}`);

    const system = await prisma.remoteSystem.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    console.log(`[WhatLLM] System protocol: ${system.protocol}`);

    let hardwareInfo: any = {};
    let recommendations: any[] = [];

    if (system.protocol === 'LOCAL') {
      console.log('[WhatLLM] Running local hardware analysis');
      const result = await analyzeLocalHardware();
      console.log('[WhatLLM] Local analysis result:', JSON.stringify(result, null, 2));
      hardwareInfo = result.hardwareInfo;
      recommendations = result.recommendations;
    } else {
      // Decrypt credentials for SSH
      let password: string | undefined;
      let sshKey: string | undefined;

      if (system.encryptedPassword) {
        const encrypted = JSON.parse(system.encryptedPassword);
        password = await EncryptionService.decrypt(encrypted);
      }

      if (system.encryptedKey) {
        const encrypted = JSON.parse(system.encryptedKey);
        sshKey = await EncryptionService.decrypt(encrypted);
      }

      const result = await analyzeRemoteHardware(
        system.hostname,
        system.port,
        system.username,
        password,
        sshKey
      );
      hardwareInfo = result.hardwareInfo;
      recommendations = result.recommendations;
    }

    // Upsert hardware info
    const hardware = await prisma.hardwareInfo.upsert({
      where: { systemId },
      create: {
        systemId,
        ...hardwareInfo,
        whatllmRecs: recommendations,
        analyzedAt: new Date(),
      },
      update: {
        ...hardwareInfo,
        whatllmRecs: recommendations,
        analyzedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Hardware analysis completed',
      hardware,
      recommendations,
    });
  } catch (error) {
    console.error('Analyze hardware error:', error);
    res.status(500).json({ error: 'Failed to analyze hardware' });
  }
});

/**
 * GET /api/whatllm/recommendations/:systemId
 * Get model recommendations for a system
 */
router.get('/recommendations/:systemId', authenticate, auditLog('GET_RECOMMENDATIONS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { systemId } = req.params as Record<string, string>;

    const hardware = await prisma.hardwareInfo.findUnique({
      where: { systemId },
    });

    if (!hardware) {
      return res.status(404).json({ error: 'No hardware analysis found for this system' });
    }

    const recommendations = hardware.whatllmRecs || [];

    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

/**
 * POST /api/whatllm/compare
 * Compare hardware across multiple systems
 */
router.post('/compare', authenticate, auditLog('COMPARE_HARDWARE'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { systemIds } = req.body;

    if (!Array.isArray(systemIds) || systemIds.length === 0) {
      return res.status(400).json({ error: 'systemIds array is required' });
    }

    const systems = await prisma.remoteSystem.findMany({
      where: { id: { in: systemIds } },
      include: {
        hardwareInfo: true,
      },
    });

    const comparison = systems.map((s) => ({
      id: s.id,
      name: s.name,
      hostname: s.hostname,
      hardwareInfo: s.hardwareInfo,
    }));

    res.json({ comparison });
  } catch (error) {
    console.error('Compare hardware error:', error);
    res.status(500).json({ error: 'Failed to compare hardware' });
  }
});

// Helper functions

async function analyzeLocalHardware(): Promise<{
  hardwareInfo: any;
  recommendations: any[];
}> {
  try {
    // CPU info
    let cpuModel = 'Unknown';
    let cpuCores = 0;
    let cpuThreads = 0;

    try {
      cpuModel = execSync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d":" -f2 | xargs').toString().trim();
      cpuCores = parseInt(execSync('grep "cpu cores" /proc/cpuinfo | head -1 | cut -d":" -f2 | xargs').toString().trim()) || 0;
      cpuThreads = parseInt(execSync('nproc').toString().trim()) || 0;
    } catch (cpuError) {
      console.error('CPU info error:', cpuError);
    }

    // RAM
    let ramGB = 0;
    try {
      const ramKB = parseInt(execSync('grep MemTotal /proc/meminfo | awk \'{print $2}\'').toString().trim());
      ramGB = Math.round((ramKB / 1024 / 1024) * 10) / 10;
    } catch (ramError) {
      console.error('RAM info error:', ramError);
    }

    // GPU info (NVIDIA)
    let gpuInfo: any[] = [];
    try {
      const nvidiaSmi = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader').toString().trim();
      gpuInfo = nvidiaSmi.split('\n').map((line: string) => {
        const [name, vram] = line.split(', ');
        return {
          name: name.trim(),
          vramGB: Math.round(parseInt(vram.trim()) / 1024),
        };
      });
    } catch (gpuError) {
      console.log('No NVIDIA GPU detected or nvidia-smi not available');
    }

    // OS and kernel
    let os = 'Unknown';
    let kernel = 'Unknown';
    let dockerVersion = 'Unknown';

    try {
      os = execSync('cat /etc/os-release | grep PRETTY_NAME | cut -d"=" -f2 | tr -d \'\'').toString().trim();
      kernel = execSync('uname -r').toString().trim();
      dockerVersion = execSync('docker --version 2>/dev/null | cut -d" " -f3 || echo "Unknown"').toString().trim();
    } catch (osError) {
      console.error('OS info error:', osError);
    }

    // Try to run whichllm CLI if available
    let recommendations: any[] = [];
    try {
      const output = execSync('whichllm --json 2>/dev/null || echo "{}"').toString().trim();
      const parsed = JSON.parse(output);
      recommendations = parsed.recommendations || [];
    } catch (whatllmError) {
      console.log('whichllm CLI not available, using basic recommendations');
    }

    // Generate basic recommendations if whichllm not available
    if (recommendations.length === 0) {
      recommendations = generateBasicRecommendations(cpuCores, ramGB, gpuInfo);
    }

    console.log('Hardware analysis result:', { cpuModel, cpuCores, cpuThreads, ramGB, gpuCount: gpuInfo.length });

    return {
      hardwareInfo: {
        cpuModel,
        cpuCores,
        cpuThreads,
        ramGB,
        gpuInfo,
        os,
        kernel,
        dockerVersion,
      },
      recommendations,
    };
  } catch (error: any) {
    console.error('analyzeLocalHardware error:', error);
    return {
      hardwareInfo: {},
      recommendations: [],
    };
  }
}

async function analyzeRemoteHardware(
  hostname: string,
  port: number,
  username: string,
  password?: string,
  sshKey?: string
): Promise<{
  hardwareInfo: any;
  recommendations: any[];
}> {
  // Run the same probes used for local analysis, but over SSH. Each command
  // is wrapped with `|| echo ""` / `|| true` so a single missing tool (e.g.
  // nvidia-smi on a CPU box) doesn't poison the whole session.
  //
  // We bundle everything into one remote bash invocation and parse the output
  // by marker lines, minimizing SSH round-trips.
  const credentials = { hostname, port, username, sshKey, password };

  const remoteScript = [
    'echo "---CPU_MODEL---"',
    'cat /proc/cpuinfo 2>/dev/null | grep "model name" | head -1 | cut -d":" -f2 | xargs || true',
    'echo "---CPU_CORES---"',
    'grep "cpu cores" /proc/cpuinfo 2>/dev/null | head -1 | cut -d":" -f2 | xargs || true',
    'echo "---CPU_THREADS---"',
    'nproc 2>/dev/null || true',
    'echo "---RAM_KB---"',
    "grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || true",
    'echo "---GPU---"',
    'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || true',
    'echo "---OS---"',
    'cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d"=" -f2 | tr -d \'"\' || true',
    'echo "---KERNEL---"',
    'uname -r 2>/dev/null || true',
    'echo "---DOCKER---"',
    'docker --version 2>/dev/null | cut -d" " -f3 || echo "Unknown"',
    'echo "---END---"',
  ].join('\n');

  try {
    const raw = runRemoteSSH(credentials, remoteScript);

    // Parse marker-separated sections
    const section = (name: string): string => {
      const re = new RegExp(`---${name}---\\r?\\n([\\s\\S]*?)\\r?\\n---`, 'm');
      const m = raw.match(re);
      return m ? m[1].trim() : '';
    };

    const cpuModel = section('CPU_MODEL') || 'Unknown';
    const cpuCores = parseInt(section('CPU_CORES'), 10) || 0;
    const cpuThreads = parseInt(section('CPU_THREADS'), 10) || 0;

    const ramKBStr = section('RAM_KB');
    const ramKB = parseInt(ramKBStr, 10);
    const ramGB = Number.isFinite(ramKB) && ramKB > 0
      ? Math.round((ramKB / 1024 / 1024) * 10) / 10
      : 0;

    const gpuRaw = section('GPU');
    const gpuInfo: any[] = gpuRaw
      ? gpuRaw
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && line.includes(','))
          .map((line) => {
            const [name, vram] = line.split(',').map((s) => s.trim());
            const vramMB = parseInt((vram || '').replace(/[^0-9]/g, ''), 10);
            return {
              name: name || 'Unknown GPU',
              vramGB: Number.isFinite(vramMB) ? Math.round(vramMB / 1024) : 0,
            };
          })
      : [];

    const os = section('OS') || 'Unknown';
    const kernel = section('KERNEL') || 'Unknown';
    const dockerVersion = section('DOCKER') || 'Unknown';

    const recommendations = generateBasicRecommendations(cpuCores, ramGB, gpuInfo);

    console.log('[WhatLLM] Remote hardware analysis result:', {
      hostname,
      cpuModel,
      cpuCores,
      cpuThreads,
      ramGB,
      gpuCount: gpuInfo.length,
      os,
      kernel,
    });

    return {
      hardwareInfo: {
        cpuModel,
        cpuCores,
        cpuThreads,
        ramGB,
        gpuInfo,
        os,
        kernel,
        dockerVersion,
      },
      recommendations,
    };
  } catch (error: any) {
    console.error('[WhatLLM] analyzeRemoteHardware error:', error?.message || error);
    return {
      hardwareInfo: {
        cpuModel: 'Unknown (SSH failed)',
        cpuCores: 0,
        cpuThreads: 0,
        ramGB: 0,
        gpuInfo: [],
        os: 'Unknown',
        kernel: 'Unknown',
        dockerVersion: 'Unknown',
      },
      recommendations: [],
    };
  }
}

function generateBasicRecommendations(
  cpuCores: number,
  ramGB: number,
  gpuInfo: any[]
): any[] {
  const recommendations: any[] = [];

  const totalVram = gpuInfo.reduce((sum, gpu) => sum + (gpu.vramGB || 0), 0);

  // GPU-based recommendations
  if (totalVram >= 48) {
    recommendations.push({
      type: 'GPU',
      category: 'Large Models',
      models: [
        { name: 'Qwen3.6-35B', quantization: 'Q4_K_M', vramRequired: 20 },
        { name: 'Llama-3.1-70B', quantization: 'Q4_K_S', vramRequired: 42 },
      ],
      reason: `${totalVram}GB VRAM available - can run large models`,
    });
  } else if (totalVram >= 24) {
    recommendations.push({
      type: 'GPU',
      category: 'Medium Models',
      models: [
        { name: 'Llama-3.1-8B', quantization: 'F16', vramRequired: 16 },
        { name: 'Mistral-7B', quantization: 'Q8_K', vramRequired: 8 },
      ],
      reason: `${totalVram}GB VRAM available - good for medium models`,
    });
  } else if (totalVram > 0) {
    recommendations.push({
      type: 'GPU',
      category: 'Small Models',
      models: [
        { name: 'Phi-3-mini', quantization: 'Q4_K_M', vramRequired: 2 },
        { name: 'Gemma-2B', quantization: 'Q6_K', vramRequired: 2 },
      ],
      reason: `${totalVram}GB VRAM available - suitable for small models`,
    });
  }

  // CPU-based recommendations
  if (ramGB >= 64) {
    recommendations.push({
      type: 'CPU',
      category: 'Large CPU Models',
      models: [
        { name: 'Llama-3.1-70B', quantization: 'Q2_K', vramRequired: 0, ramRequired: 48 },
        { name: 'Qwen3.6-35B', quantization: 'Q4_K_M', vramRequired: 0, ramRequired: 24 },
      ],
      reason: `${ramGB}GB RAM - can run large models on CPU`,
    });
  } else if (ramGB >= 32) {
    recommendations.push({
      type: 'CPU',
      category: 'Medium CPU Models',
      models: [
        { name: 'Llama-3.1-8B', quantization: 'Q8_K', vramRequired: 0, ramRequired: 10 },
        { name: 'Mistral-7B', quantization: 'Q6_K', vramRequired: 0, ramRequired: 6 },
      ],
      reason: `${ramGB}GB RAM - good for medium CPU models`,
    });
  } else {
    recommendations.push({
      type: 'CPU',
      category: 'Small CPU Models',
      models: [
        { name: 'Phi-3-mini', quantization: 'Q4_K_M', vramRequired: 0, ramRequired: 4 },
        { name: 'TinyLlama-1.1B', quantization: 'Q8_K', vramRequired: 0, ramRequired: 2 },
      ],
      reason: `${ramGB}GB RAM - limited to small models`,
    });
  }

  return recommendations;
}

export default router;
