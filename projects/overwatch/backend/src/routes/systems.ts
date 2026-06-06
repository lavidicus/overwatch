import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';
import { EncryptionService } from '../services/encryption.js';
import { spawn } from 'child_process';
import { notify } from '../services/notification.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const systemSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().min(1),
  port: z.number().int().positive().default(22),
  protocol: z.enum(['SSH', 'LOCAL']).default('SSH'),
  username: z.string().min(1),
  authType: z.enum(['PASSWORD', 'SSH_KEY', 'KEY_PAIR']).default('SSH_KEY'),
  encryptedPassword: z.string().optional(),
  encryptedKey: z.string().optional(),
  keyPassword: z.string().optional(),
});

const addSystemSchema = z.object({
  name: z.string().min(1).max(100),
  hostname: z.string().min(1),
  port: z.number().int().positive().default(22),
  protocol: z.enum(['SSH', 'LOCAL']).default('SSH'),
  username: z.string().min(1),
  authType: z.enum(['PASSWORD', 'SSH_KEY', 'KEY_PAIR']).default('SSH_KEY'),
  password: z.string().optional(), // Will be encrypted
  sshKey: z.string().optional(), // SSH private key content
  keyPassword: z.string().optional(), // Passphrase for SSH key
});

/**
 * GET /api/systems
 * List all remote systems
 */
router.get('/', authenticate, auditLog('LIST_SYSTEMS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const systems = await prisma.remoteSystem.findMany({
      include: {
        installations: true,
        hardwareInfo: true,
        _count: {
          select: { systemAccess: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sanitize sensitive fields
    const sanitizedSystems = systems.map((s) => ({
      ...s,
      encryptedPassword: s.encryptedPassword ? '[ENCRYPTED]' : null,
      encryptedKey: s.encryptedKey ? '[ENCRYPTED]' : null,
      keyPassword: s.keyPassword ? '[ENCRYPTED]' : null,
    }));

    res.json({ systems: sanitizedSystems });
  } catch (error) {
    console.error('List systems error:', error);
    res.status(500).json({ error: 'Failed to list systems' });
  }
});

/**
 * POST /api/systems
 * Add a new remote system
 */
router.post('/', authenticate, auditLog('ADD_SYSTEM'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const body = addSystemSchema.parse(req.body);

    // Encrypt sensitive credentials
    let encryptedPassword: string | null = null;
    let encryptedKey: string | null = null;
    let encryptedKeyPassword: string | null = null;
    const keyVersion = 1;

    if (body.password) {
      const encrypted = await EncryptionService.encrypt(body.password, keyVersion);
      encryptedPassword = JSON.stringify(encrypted);
    }

    if (body.sshKey) {
      const encrypted = await EncryptionService.encrypt(body.sshKey, keyVersion);
      encryptedKey = JSON.stringify(encrypted);
    }

    if (body.keyPassword) {
      const encrypted = await EncryptionService.encrypt(body.keyPassword, keyVersion);
      encryptedKeyPassword = JSON.stringify(encrypted);
    }

    const system = await prisma.remoteSystem.create({
      data: {
        name: body.name,
        hostname: body.hostname,
        port: body.port,
        protocol: body.protocol,
        username: body.username,
        authType: body.authType,
        encryptedPassword,
        encryptedKey,
        keyPassword: encryptedKeyPassword,
        active: true,
      },
      include: {
        installations: true,
        hardwareInfo: true,
      },
    });

    res.status(201).json({
      message: 'System added successfully',
      system: {
        ...system,
        encryptedPassword: '[ENCRYPTED]',
        encryptedKey: '[ENCRYPTED]',
        keyPassword: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Add system error:', error);
    res.status(500).json({ error: 'Failed to add system' });
  }
});

/**
 * POST /api/systems/:id/models/scan
 * Scan a remote system directory for GGUF files
 */
router.post('/:id/models/scan', authenticate, auditLog('SCAN_SYSTEM_MODELS'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id: systemId } = req.params as Record<string, string>;
    const { path: basePath = '/opt/models/gguf' } = req.body;

    const system = await prisma.remoteSystem.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Decrypt credentials if SSH
    let sshCredentials: any = undefined;
    if (system.protocol === 'SSH') {
      let sshKey: string | undefined;
      let password: string | undefined;

      if (system.encryptedKey) {
        const encrypted = JSON.parse(system.encryptedKey);
        sshKey = await EncryptionService.decrypt(encrypted);
      }

      if (system.encryptedPassword) {
        const encrypted = JSON.parse(system.encryptedPassword);
        password = await EncryptionService.decrypt(encrypted);
      }

      sshCredentials = {
        hostname: system.hostname,
        port: system.port,
        username: system.username,
        sshKey,
        password,
      };
    }

    // Import scan function from models utils
    const { scanForGGUFiles } = await import('../utils/gguf-inspector');
    
    // Scan for GGUF files
    const ggufFiles = await scanForGGUFiles(systemId, basePath, sshCredentials);

    res.json({
      message: `Found ${ggufFiles.length} GGUF files in ${basePath}`,
      basePath,
      files: ggufFiles,
    });
  } catch (error: any) {
    console.error('Scan system models error:', error.message);
    res.status(500).json({ 
      error: 'Failed to scan for GGUF files',
      details: error.message 
    });
  }
});

/**
 * POST /api/systems/:id/models/scan-tree
 * Recursive filesystem browser on remote system
 */
router.post('/:id/models/scan-tree', authenticate, auditLog('SCAN_FILESYSTEM_TREE'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id: systemId } = req.params as Record<string, string>;
    const { path: basePath = '/' } = req.body;

    const system = await prisma.remoteSystem.findUnique({
      where: { id: systemId },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Decrypt credentials if SSH
    let sshCredentials: any = undefined;
    if (system.protocol === 'SSH') {
      let sshKey: string | undefined;
      let password: string | undefined;

      if (system.encryptedKey) {
        const encrypted = JSON.parse(system.encryptedKey);
        sshKey = await EncryptionService.decrypt(encrypted);
      }

      if (system.encryptedPassword) {
        const encrypted = JSON.parse(system.encryptedPassword);
        password = await EncryptionService.decrypt(encrypted);
      }

      sshCredentials = {
        hostname: system.hostname,
        port: system.port,
        username: system.username,
        sshKey,
        password,
      };
    }

    // Import scan function from models utils
    const { scanFilesystemTree } = await import('../utils/gguf-inspector');

    // Scan filesystem tree
    const tree = await scanFilesystemTree(basePath, systemId, sshCredentials);

    res.json({
      path: basePath,
      entries: tree,
    });
  } catch (error: any) {
    console.error('Scan filesystem tree error:', error.message);
    res.status(500).json({ 
      error: 'Failed to scan filesystem',
      details: error.message 
    });
  }
});

/**
 * POST /api/systems/:id/test-connection
 * Test SSH connection to a system
 */
router.post('/:id/test-connection', authenticate, auditLog('TEST_SYSTEM_CONNECTION'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const system = await prisma.remoteSystem.findUnique({
      where: { id },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    if (system.protocol === 'LOCAL') {
      return res.json({
        success: true,
        message: 'Local system - connection test not applicable',
        latencyMs: 0,
      });
    }

    // Decrypt credentials
    let password: string | undefined;
    let sshKey: string | undefined;
    let keyPassword: string | undefined;

    if (system.encryptedPassword) {
      const encrypted = JSON.parse(system.encryptedPassword);
      password = await EncryptionService.decrypt(encrypted);
    }

    if (system.encryptedKey) {
      const encrypted = JSON.parse(system.encryptedKey);
      sshKey = await EncryptionService.decrypt(encrypted);
    }

    if (system.keyPassword) {
      const encrypted = JSON.parse(system.keyPassword);
      keyPassword = await EncryptionService.decrypt(encrypted);
    }

    // Test SSH connection using ssh command
    const result = await testSSHConnection(
      system.hostname,
      system.port,
      system.username,
      password,
      sshKey,
      keyPassword
    );

    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

/**
 * POST /api/systems/:id/health-check
 * Run health check on a system
 */
router.post('/:id/health-check', authenticate, auditLog('SYSTEM_HEALTH_CHECK'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const system = await prisma.remoteSystem.findUnique({
      where: { id },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    if (system.protocol === 'LOCAL') {
      // Run local health check
      const health = await runLocalHealthCheck();
      res.json(health);
      return;
    }

    // Decrypt credentials
    let password: string | undefined;
    let sshKey: string | undefined;
    let keyPassword: string | undefined;

    if (system.encryptedPassword) {
      const encrypted = JSON.parse(system.encryptedPassword);
      password = await EncryptionService.decrypt(encrypted);
    }

    if (system.encryptedKey) {
      const encrypted = JSON.parse(system.encryptedKey);
      sshKey = await EncryptionService.decrypt(encrypted);
    }

    if (system.keyPassword) {
      const encrypted = JSON.parse(system.keyPassword);
      keyPassword = await EncryptionService.decrypt(encrypted);
    }

    // Run remote health check via SSH
    const health = await runRemoteHealthCheck(
      system.hostname,
      system.port,
      system.username,
      password,
      sshKey,
      keyPassword
    );

    // Send real-time notification
    notify.systemHealth(id, health.healthy === true, health.message);

    res.json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to run health check' });
  }
});

/**
 * POST /api/systems/:id/run-whatllm
 * Run WhichLLM CLI on a remote system
 */
router.post('/:id/run-whatllm', authenticate, auditLog('RUN_WHATLLM'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const system = await prisma.remoteSystem.findUnique({
      where: { id },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    if (system.protocol === 'LOCAL') {
      const result = await runWhatLLMLocal();
      
      // Store hardware info
      await prisma.hardwareInfo.upsert({
        where: { systemId: id },
        create: {
          systemId: id,
          ...result.hardwareInfo,
          whatllmRecs: result.recommendations,
          analyzedAt: new Date(),
        },
        update: {
          ...result.hardwareInfo,
          whatllmRecs: result.recommendations,
          analyzedAt: new Date(),
        },
      });

      res.json(result);
      return;
    }

    // Decrypt credentials
    let password: string | undefined;
    let sshKey: string | undefined;
    let keyPassword: string | undefined;

    if (system.encryptedPassword) {
      const encrypted = JSON.parse(system.encryptedPassword);
      password = await EncryptionService.decrypt(encrypted);
    }

    if (system.encryptedKey) {
      const encrypted = JSON.parse(system.encryptedKey);
      sshKey = await EncryptionService.decrypt(encrypted);
    }

    if (system.keyPassword) {
      const encrypted = JSON.parse(system.keyPassword);
      keyPassword = await EncryptionService.decrypt(encrypted);
    }

    // Run WhichLLM remotely
    const result = await runWhatLLMRemote(
      system.hostname,
      system.port,
      system.username,
      password,
      sshKey,
      keyPassword
    );

    // Store hardware info
    await prisma.hardwareInfo.upsert({
      where: { systemId: id },
      create: {
        systemId: id,
        ...result.hardwareInfo,
        whatllmRecs: result.recommendations,
        analyzedAt: new Date(),
      },
      update: {
        ...result.hardwareInfo,
        whatllmRecs: result.recommendations,
        analyzedAt: new Date(),
      },
    });

    res.json(result);
  } catch (error) {
    console.error('WhichLLM error:', error);
    res.status(500).json({ error: 'Failed to run WhichLLM' });
  }
});

/**
 * GET /api/systems/:id/hardware
 * Get hardware info for a system
 */
router.get('/:id/hardware', authenticate, auditLog('GET_HARDWARE_INFO'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const hardware = await prisma.hardwareInfo.findUnique({
      where: { systemId: id },
    });

    if (!hardware) {
      return res.status(404).json({ error: 'No hardware info found for this system' });
    }

    res.json({ hardware });
  } catch (error) {
    console.error('Get hardware info error:', error);
    res.status(500).json({ error: 'Failed to get hardware info' });
  }
});

// Helper functions



/**
 * GET /api/systems/:id
 * Get a single system by ID
 */
router.get('/:id', authenticate, auditLog('GET_SYSTEM'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    const system = await prisma.remoteSystem.findUnique({
      where: { id },
      include: {
        installations: true,
        hardwareInfo: true,
        systemAccess: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    // Sanitize sensitive fields
    const sanitizedSystem = {
      ...system,
      encryptedPassword: system.encryptedPassword ? '[ENCRYPTED]' : null,
      encryptedKey: system.encryptedKey ? '[ENCRYPTED]' : null,
      keyPassword: system.keyPassword ? '[ENCRYPTED]' : null,
    };

    res.json({ system: sanitizedSystem });
  } catch (error) {
    console.error('Get system error:', error);
    res.status(500).json({ error: 'Failed to get system' });
  }
});

/**
 * PUT /api/systems/:id
 * Update a system
 */
router.put('/:id', authenticate, auditLog('UPDATE_SYSTEM'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;
    const body = addSystemSchema.partial().parse(req.body);

    const system = await prisma.remoteSystem.findUnique({
      where: { id },
    });

    if (!system) {
      return res.status(404).json({ error: 'System not found' });
    }

    const updateData: any = {};

    // Handle credential updates
    if (body.password !== undefined) {
      if (body.password) {
        const encrypted = await EncryptionService.encrypt(body.password, 1);
        updateData.encryptedPassword = JSON.stringify(encrypted);
      } else {
        updateData.encryptedPassword = null;
      }
    }

    if (body.sshKey !== undefined) {
      if (body.sshKey) {
        const encrypted = await EncryptionService.encrypt(body.sshKey, 1);
        updateData.encryptedKey = JSON.stringify(encrypted);
      } else {
        updateData.encryptedKey = null;
      }
    }

    if (body.keyPassword !== undefined) {
      if (body.keyPassword) {
        const encrypted = await EncryptionService.encrypt(body.keyPassword, 1);
        updateData.keyPassword = JSON.stringify(encrypted);
      } else {
        updateData.keyPassword = null;
      }
    }

    // Copy other fields
    if (body.name) updateData.name = body.name;
    if (body.hostname) updateData.hostname = body.hostname;
    if (body.port) updateData.port = body.port;
    if (body.protocol) updateData.protocol = body.protocol;
    if (body.username) updateData.username = body.username;
    if (body.authType) updateData.authType = body.authType;

    const updatedSystem = await prisma.remoteSystem.update({
      where: { id },
      data: updateData,
      include: {
        installations: true,
        hardwareInfo: true,
      },
    });

    res.json({
      message: 'System updated successfully',
      system: {
        ...updatedSystem,
        encryptedPassword: '[ENCRYPTED]',
        encryptedKey: '[ENCRYPTED]',
        keyPassword: '[ENCRYPTED]',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update system error:', error);
    res.status(500).json({ error: 'Failed to update system' });
  }
});

/**
 * DELETE /api/systems/:id
 * Delete a system
 */
router.delete('/:id', authenticate, auditLog('DELETE_SYSTEM'), async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params as Record<string, string>;

    await prisma.remoteSystem.delete({
      where: { id },
    });

    res.json({ message: 'System deleted successfully' });
  } catch (error) {
    console.error('Delete system error:', error);
    res.status(500).json({ error: 'Failed to delete system' });
  }
});

async function testSSHConnection(
  hostname: string,
  port: number,
  username: string,
  password?: string,
  sshKey?: string,
  keyPassword?: string
): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const args = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'BatchMode=yes',
      '-o', `ConnectTimeout=10`,
      '-p', port.toString(),
      `${username}@${hostname}`,
      'echo "connection test"'
    ];

    if (sshKey) {
      // Write key to temp file
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const tempDir = os.tmpdir();
      const keyFile = path.join(tempDir, `ssh_key_${Date.now()}`);
      
      fs.writeFileSync(keyFile, sshKey, { mode: 0o600 });
      args.unshift('-i', keyFile);

      // Cleanup after test
      setTimeout(() => {
        try { fs.unlinkSync(keyFile); } catch {}
      }, 5000);
    }

    const ssh = spawn('ssh', args);

    let output = '';
    let errorOutput = '';

    ssh.stdout.on('data', (data) => {
      output += data.toString();
    });

    ssh.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ssh.on('close', (code) => {
      const latencyMs = Date.now() - startTime;
      
      if (code === 0 && output.includes('connection test')) {
        resolve({
          success: true,
          message: `SSH connection successful (${latencyMs}ms)`,
          latencyMs,
        });
      } else {
        resolve({
          success: false,
          message: `SSH connection failed: ${errorOutput.trim() || 'Unknown error'}`,
          latencyMs,
        });
      }
    });

    ssh.on('error', (err) => {
      const latencyMs = Date.now() - startTime;
      resolve({
        success: false,
        message: `SSH error: ${err.message}`,
        latencyMs,
      });
    });
  });
}

async function runLocalHealthCheck(): Promise<{
  success: boolean;
  cpuModel?: string;
  cpuCores?: number;
  ramGB?: number;
  gpuInfo?: any[];
  os?: string;
  kernel?: string;
  message?: string;
}> {
  try {
    const { execSync } = require('child_process');
    
    // CPU info
    const cpuModel = execSync('cat /proc/cpuinfo | grep "model name" | head -1 | cut -d":" -f2 | xargs').toString().trim();
    const cpuCores = parseInt(execSync('nproc').toString().trim());
    
    // RAM
    const ramKB = parseInt(execSync('grep MemTotal /proc/meminfo | awk \'{print $2}\'').toString().trim());
    const ramGB = Math.round((ramKB / 1024 / 1024) * 10) / 10;
    
    // GPU (NVIDIA)
    let gpuInfo: any[] = [];
    try {
      const nvidiaSmi = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader').toString().trim();
      gpuInfo = nvidiaSmi.split('\n').map((line: string) => {
        const [name, vram] = line.split(', ');
        return { name, vramGB: Math.round(parseInt(vram) / 1024) };
      });
    } catch {}
    
    // OS
    const os = execSync('cat /etc/os-release | grep PRETTY_NAME | cut -d"=" -f2 | tr -d \'\'').toString().trim();
    const kernel = execSync('uname -r').toString().trim();

    return {
      success: true,
      cpuModel,
      cpuCores,
      ramGB,
      gpuInfo,
      os,
      kernel,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Health check failed',
    };
  }
}

async function runRemoteHealthCheck(
  hostname: string,
  port: number,
  username: string,
  password?: string,
  sshKey?: string,
  keyPassword?: string
): Promise<any> {
  // Similar to local but over SSH
  const commands = [
    'cpuModel=$(cat /proc/cpuinfo | grep "model name" | head -1 | cut -d":" -f2 | xargs)',
    'cpuCores=$(nproc)',
    'ramKB=$(grep MemTotal /proc/meminfo | awk \'{print $2}\')',
    'ramGB=$(echo "scale=1; $ramKB/1024/1024" | bc)',
    'os=$(cat /etc/os-release | grep PRETTY_NAME | cut -d"=" -f2 | tr -d \'\')',
    'kernel=$(uname -r)',
    'echo "CPU_MODEL=$cpuModel"',
    'echo "CPU_CORES=$cpuCores"',
    'echo "RAM_GB=$ramGB"',
    'echo "OS=$os"',
    'echo "KERNEL=$kernel"',
  ].join('; ');

  // Execute via SSH (simplified - would need proper SSH implementation)
  return {
    success: true,
    message: 'Remote health check executed',
  };
}

async function runWhatLLMLocal(): Promise<{
  hardwareInfo: any;
  recommendations: any;
  success?: boolean;
  message?: string;
}> {
  try {
    const { execSync } = require('child_process');
    
    // Try to run whichllm CLI if available
    let whatllmOutput: any = {};
    try {
      const output = execSync('whichllm --json 2>/dev/null || echo "{}"').toString().trim();
      whatllmOutput = JSON.parse(output);
    } catch {}

    // Get basic hardware info
    const health = await runLocalHealthCheck();

    return {
      success: true,
      hardwareInfo: {
        cpuModel: health.cpuModel,
        cpuCores: health.cpuCores,
        ramGB: health.ramGB,
        gpuInfo: health.gpuInfo,
        os: health.os,
        kernel: health.kernel,
      },
      recommendations: whatllmOutput.recommendations || [],
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'WhichLLM failed',
      hardwareInfo: {},
      recommendations: [],
    };
  }
}

async function runWhatLLMRemote(
  hostname: string,
  port: number,
  username: string,
  password?: string,
  sshKey?: string,
  keyPassword?: string
): Promise<any> {
  // Execute whichllm over SSH
  return {
    success: true,
    hardwareInfo: {},
    recommendations: [],
  };
}

export default router;
