/**
 * GGUF File Introspection Utility
 *
 * Reads GGUF binary headers to extract model metadata without loading the model.
 * Based on GGUF format specification: https://github.com/ggerganov/ggml/blob/master/docs/gguf.md
 *
 * Supports both local files and remote files via SSH.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface GGUFMetadata {
  name: string;
  architecture: string;
  parameterCount: string; // e.g., "35B", "8B"
  quantization: string; // e.g., "Q4_K_M", "Q8_K"
  sizeBytes: number;
  sizeGB: number;
  fileType: string;
  tensorCount: number;
  kvCount: number;
  contextLength?: number;
  embeddingLength?: number;
  blockCount?: number;
  feedForwardLength?: number;
  attentionHeadCount?: number;
  ropeDimensionCount?: number;
  isVisionModel?: boolean;
  mmprojFiles?: string[]; // Companion mmproj files detected
  mmprojPath?: string;    // Primary mmproj path (for backwards compat)
}

/**
 * Shared SSH setup — write key to temp file if needed, return SSH args.
 */
function buildSSHArgs(
  credentials: { hostname: string; port: number; username: string; sshKey?: string; password?: string }
): string[] {
  const sshArgs: string[] = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=10',
    '-p', credentials.port.toString(),
  ];

  if (credentials.sshKey) {
    const tempKeyFile = path.join(os.tmpdir(), `ssh_key_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.writeFileSync(tempKeyFile, credentials.sshKey, { mode: 0o600 });
    sshArgs.push('-i', tempKeyFile);

    // Cleanup after command completes
    setTimeout(() => {
      try { fs.unlinkSync(tempKeyFile); } catch { /* ignore */ }
    }, 30000);
  } else {
    // Fallback to default SSH key
    const defaultKey = path.join(os.homedir(), '.ssh', 'id_rsa');
    if (fs.existsSync(defaultKey)) {
      sshArgs.push('-i', defaultKey);
    }
  }

  return sshArgs;
}

/**
 * Build full SSH target string.
 */
function sshTarget(credentials: { hostname: string; username: string }): string {
  return `${credentials.username}@${credentials.hostname}`;
}

/**
 * Run a command on a remote system via SSH.
 */
function runRemoteSSH(
  credentials: { hostname: string; port: number; username: string; sshKey?: string },
  command: string
): string {
  const MAX_BUFFER = 50 * 1024 * 1024;
  const sshArgs = buildSSHArgs(credentials);
  const targetStr = sshTarget(credentials);
  const cmdFile = path.join(os.tmpdir(), `ov_cmd_${Date.now()}.sh`);
  const remoteFile = `/tmp/ov_cmd_${Date.now()}_${Math.random().toString(36).slice(2)}.sh`;

  try {
    fs.writeFileSync(cmdFile, `#!/bin/bash\n${command}\n`, { mode: 0o755 });

    // Build SCP options (SCP uses -P for port, SSH uses -p)
    const scpBase = ['-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-P', credentials.port.toString()];
    // Extract the key path from sshArgs for SCP
    const keyIdx = sshArgs.indexOf('-i');
    if (keyIdx >= 0) scpBase.push('-i', sshArgs[keyIdx + 1]);

    execSync(`scp ${scpBase.join(' ')} ${cmdFile} ${targetStr}:${remoteFile}`, { timeout: 15000 });
    const result = execSync(`ssh ${sshArgs.join(' ')} ${targetStr} bash ${remoteFile}`, {
      timeout: 30000, encoding: 'utf8', maxBuffer: MAX_BUFFER,
    }).trim();
    try { execSync(`ssh ${sshArgs.join(' ')} ${targetStr} rm -f ${remoteFile}`, { timeout: 5000 }); } catch {}
    return result;
  } finally {
    try { fs.unlinkSync(cmdFile); } catch {}
  }
}

/**
 * Remote Python GGUF header parser — runs on the remote host over SSH.
 * Extracts ALL standard GGUF metadata fields by parsing the binary KV map.
 */
function remoteGGUFInspect(
  credentials: { hostname: string; port: number; username: string; sshKey?: string },
  filePath: string
): string {
  // Build a shell script that creates a Python parser on the remote host via heredoc.
  // Writing to a file completely avoids shell quoting issues.
  const shellScript = `#!/bin/bash
python3 - <<'PYEOF' "${filePath}"
import struct,sys,json
def ru64(f):return struct.unpack('<Q',f.read(8))[0]
def ru32(f):return struct.unpack('<I',f.read(4))[0]
def rs(f):
 l=ru64(f);return f.read(l).decode('utf-8',errors='ignore')
def rv(f,t):
 if t==0:return struct.unpack('<B',f.read(1))[0]
 elif t==1:return struct.unpack('<b',f.read(1))[0]
 elif t==2:return struct.unpack('<H',f.read(2))[0]
 elif t==3:return struct.unpack('<h',f.read(2))[0]
 elif t==4:return struct.unpack('<I',f.read(4))[0]
 elif t==5:return struct.unpack('<i',f.read(4))[0]
 elif t==6:return struct.unpack('<f',f.read(4))[0]
 elif t==7:return bool(struct.unpack('<B',f.read(1))[0])
 elif t==8:return rs(f)
 elif t==9:
  at=ru32(f);al=ru64(f);return[rv(f,at)for _ in range(al)]
 elif t==10:return ru64(f)
 elif t==11:return struct.unpack('<q',f.read(8))[0]
 elif t==12:return struct.unpack('<d',f.read(8))[0]
 else:return str(t)
try:
 with open(sys.argv[1],'rb')as f:
  m=f.read(4)
  if m!=b'GGUF':print(json.dumps({'error':'Not GGUF'}));sys.exit(0)
  v=ru32(f);tc=ru64(f);kc=ru64(f);md={}
  for _ in range(kc):
   k=rs(f);vt=ru32(f);val=rv(f,vt)
   if isinstance(val,float)and val!=val:val=0.0
   md[k]=val
  print(json.dumps({'version':v,'tensor_count':tc,'kv_count':kc,'metadata':md},default=str))
except Exception as e:print(json.dumps({'error':str(e)}))
PYEOF
`;

  return runRemoteSSH(credentials, shellScript);
}

// ─── GGUF file_type numeric enum → quantization name ───
// From ggml-common.h (GGML_TYPE_COUNT / GGUF file_type values)
const GGUF_FILE_TYPE_MAP: Record<number, string> = {
  0: 'ALL_F32',
  1: 'MOSTLY_F16',
  2: 'MOSTLY_Q4_0',
  3: 'MOSTLY_Q4_1',
  4: 'MOSTLY_Q4_1_SOME_F16',
  5: 'MOSTLY_Q4_2',
  6: 'MOSTLY_Q4_3',
  7: 'MOSTLY_Q8_0',
  8: 'MOSTLY_Q5_0',
  9: 'MOSTLY_Q5_1',
  10: 'MOSTLY_Q2_K',
  11: 'MOSTLY_Q3_K_S',
  12: 'MOSTLY_Q3_K_M',
  13: 'MOSTLY_Q3_K_L',
  14: 'MOSTLY_Q4_K_S',
  15: 'MOSTLY_Q4_K_M',
  16: 'MOSTLY_Q5_K_S',
  17: 'MOSTLY_Q5_K_M',
  18: 'MOSTLY_Q6_K',
};

/**
 * Map GGUF numeric file_type to a quantization label.
 */
function fileTypeName(fileType: any): string | undefined {
  if (typeof fileType === 'number') {
    return GGUF_FILE_TYPE_MAP[fileType];
  }
  if (typeof fileType === 'string') {
    return fileType;
  }
  return undefined;
}

// ─── Key-value map for common GGUF fields ───

const KEY_MAP: Record<string, string> = {
  'general.name': 'name',
  'general.architecture': 'architecture',
  'general.parameter_count': 'parameter_count',
  'general.file_type': 'file_type',
  'general.quantization_version': 'quant_version',
  'llama.context_length': 'context_length',
  'llama.embedding_length': 'embedding_length',
  'llama.block_count': 'block_count',
  'llama.feed_forward_length': 'feed_forward_length',
  'llama.attention.head_count': 'attention_head_count',
  'llama.attention.head_count_kv': 'attention_head_count_kv',
  'llama.attention.layer_norm_rms_epsilon': 'attention_norm_epsilon',
  'llama.rope.freq_base': 'rope_freq_base',
  'llama.rope.dimension_count': 'rope_dimension_count',
  'clip.context_length': 'clip_context_length',
  'clip.vision.embedding_length': 'clip_embedding_length',
  'clip.vision.block_count': 'clip_block_count',
  'clip.vision.num_heads': 'clip_num_heads',
  'bert.context_length': 'bert_context_length',
  'gpt2.context_length': 'gpt2_context_length',
  'bloom.context_length': 'bloom_context_length',
};

/**
 * Inspect a GGUF file by reading its binary header.
 *
 * @param filePath - Absolute path to the GGUF file (local or remote)
 * @param systemId - Optional remote system ID (resolved in route handler)
 * @param sshCredentials - Optional SSH credentials for remote files
 */
export async function inspectGGUFFile(
  filePath: string,
  sshCredentials?: { hostname: string; port: number; username: string; sshKey?: string; password?: string }
): Promise<GGUFMetadata> {
  let sizeBytes: number;
  let sizeGB: number;

  // Get file size
  if (sshCredentials) {
    try {
      const sizeOutput = runRemoteSSH(sshCredentials, `stat -c %s "${filePath}" 2>/dev/null || stat -f %z "${filePath}" 2>/dev/null`);
      sizeBytes = parseInt(sizeOutput) || 0;
    } catch {
      sizeBytes = 0;
    }
  } else {
    const stat = fs.statSync(filePath);
    sizeBytes = stat.size;
  }

  sizeGB = Math.round((sizeBytes / (1024 * 1024 * 1024)) * 100) / 100;

  // ── Remote inspection ──
  if (sshCredentials) {
    const result = remoteGGUFInspect(sshCredentials, filePath);
    try {
      const data = JSON.parse(result);
      if (data.error) {
        console.log(`Remote inspection error: ${data.error}, falling back to filename`);
        return parseFromFilename(filePath, sizeBytes, sizeGB);
      }

      // Also scan for companion mmproj files on the remote system
      try {
        const dir = path.dirname(filePath);
        const baseName = path.basename(filePath, '.gguf');
        const candidates = [
          `${baseName}.mmproj.gguf`,
          `mmproj-${baseName}.gguf`,
          'mmproj.gguf',
          `${baseName}-mmproj.gguf`,
        ];
        const remoteMmprojCheck = runRemoteSSH(sshCredentials,
          `for f in ${candidates.join(' ')}; do [ -f "${dir}/$f" ] && echo "${dir}/$f"; done`
        );
        const mmprojPaths = remoteMmprojCheck.split('\n').filter(Boolean);
        if (mmprojPaths.length > 0) {
          data.metadata._remote_mmproj_check = mmprojPaths;
        }
      } catch {
        // mmproj scan failed, not critical
      }

      return parseGGUFMetadata(data, filePath, sizeBytes, sizeGB);
    } catch {
      console.log('Remote inspection returned invalid JSON, falling back to filename');
      return parseFromFilename(filePath, sizeBytes, sizeGB);
    }
  }

  // ── Local inspection ──
  // Write Python GGUF parser to a temp file to avoid shell escaping issues.
  const localPythonScript = path.join(os.tmpdir(), `gguf_inspect_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);

  try {
    // Only extract essential metadata keys to avoid huge JSON output (>10MB for tokenizer vocab data).
    // Full metadata dump can exceed Node's maxBuffer and crash the process.
    const ESSENTIAL_KEYS = [
      'general.name', 'general.architecture', 'general.type',
      'general.parameter_count', 'general.file_type',
      'general.quantization_version',
      'llama.context_length', 'llama.embedding_length', 'llama.block_count',
      'llama.feed_forward_length', 'llama.attention.head_count',
      'llama.attention.head_count_kv', 'llama.attention.layer_norm_rms_epsilon',
      'llama.rope.freq_base', 'llama.rope.dimension_count',
      'clip.context_length', 'clip.vision.embedding_length', 'clip.vision.block_count',
      'clip.vision.num_heads', 'bert.context_length', 'gpt2.context_length',
      'bloom.context_length',
    ];

    const pythonScript = `#!/usr/bin/env python3
import struct, sys, json

ESSENTIAL_KEYS = ${JSON.stringify(ESSENTIAL_KEYS)}

def ru64(f): return struct.unpack('<Q', f.read(8))[0]
def ru32(f): return struct.unpack('<I', f.read(4))[0]

def rv(f, t):
    if t == 0: return struct.unpack('<B', f.read(1))[0]
    elif t == 1: return struct.unpack('<b', f.read(1))[0]
    elif t == 2: return struct.unpack('<H', f.read(2))[0]
    elif t == 3: return struct.unpack('<h', f.read(2))[0]
    elif t == 4: return struct.unpack('<I', f.read(4))[0]
    elif t == 5: return struct.unpack('<i', f.read(4))[0]
    elif t == 6: return struct.unpack('<f', f.read(4))[0]
    elif t == 7: return bool(struct.unpack('<B', f.read(1))[0])
    elif t == 8:
        l = ru64(f); return f.read(l).decode('utf-8', errors='ignore')
    elif t == 9:
        at = ru32(f); al = ru64(f); return [rv(f, at) for _ in range(al)]
    elif t == 10: return ru64(f)
    elif t == 11: return struct.unpack('<q', f.read(8))[0]
    elif t == 12: return struct.unpack('<d', f.read(8))[0]
    else: return str(t)

def skip_value(f, t):
    """Skip a value without storing it (saves memory)."""
    if t == 0: f.read(1)
    elif t == 1: f.read(1)
    elif t == 2: f.read(2)
    elif t == 3: f.read(2)
    elif t == 4: f.read(4)
    elif t == 5: f.read(4)
    elif t == 6: f.read(4)
    elif t == 7: f.read(1)
    elif t == 8:
        l = ru64(f); f.read(l)
    elif t == 9:
        at = ru32(f); al = ru64(f)
        for _ in range(al): skip_value(f, at)
    elif t == 10: f.read(8)
    elif t == 11: f.read(8)
    elif t == 12: f.read(8)
    else: pass

try:
    with open(sys.argv[1], 'rb') as f:
        m = f.read(4)
        if m != b'GGUF':
            print(json.dumps({'error': 'Not GGUF'}))
            sys.exit(0)
        v = ru32(f); tc = ru64(f); kc = ru64(f); md = {}
        for _ in range(kc):
            k = rv(f, 8)
            vt = ru32(f)
            if k in ESSENTIAL_KEYS:
                val = rv(f, vt)
                if isinstance(val, float) and val != val: val = 0.0
                md[k] = val
            else:
                skip_value(f, vt)
        print(json.dumps({'version': v, 'tensor_count': tc, 'kv_count': kc, 'metadata': md}, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
    fs.writeFileSync(localPythonScript, pythonScript, { mode: 0o755 });

    const { spawn: spawnProc } = await import('child_process');

    // Use spawn instead of execSync to avoid ENOBUFS issues on some systems
    let output = '';
    let stderr = '';
    await new Promise<void>((resolve, reject) => {
      const proc = spawnProc('python3', [localPythonScript, filePath]);
      proc.stdout.on('data', (d: Buffer) => { output += d.toString(); });
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Python exited with code ${code}: ${stderr.slice(-500)}`));
      });
      proc.on('error', reject);
      setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('Python timeout (30s)')); }, 30000);
    });
    output = output.trim();

    if (output && output !== '{}') {
      const data = JSON.parse(output);
      if (data.error) {
        console.log(`GGUF inspection error: ${data.error}, falling back to filename`);
        return parseFromFilename(filePath, sizeBytes, sizeGB);
      }
      return parseGGUFMetadata(data, filePath, sizeBytes, sizeGB);
    }
  } catch (err) {
    console.log('Python GGUF parsing failed, using filename-based detection');
  } finally {
    try { fs.unlinkSync(localPythonScript); } catch { /* ignore cleanup */ }
  }


  // Ultimate fallback: extract info from filename
  return parseFromFilename(filePath, sizeBytes, sizeGB);
}

/**
 * Parse GGUF metadata from JSON data (local or remote).
 */
function parseGGUFMetadata(
  data: any,
  filePath: string,
  sizeBytes: number,
  sizeGB: number
): GGUFMetadata {
  const metadata = data.metadata || {};

  const rawArchitecture = metadata['general.architecture'] || 'unknown';
  const archLower = rawArchitecture.toLowerCase();
  const name = (metadata['general.name'] as string) || path.basename(filePath, '.gguf');
  const paramCountRaw = metadata['general.parameter_count'];
  const fileType = metadata['general.file_type'] || 'unknown';

  // Extract quantization
  let quantization = 'unknown';

  // 1. Try file_type enum (numeric or string like "MOSTLY_Q8_0")
  const ftName = fileTypeName(fileType);
  if (ftName) {
    const enumMatch = ftName.match(/(Q[0-9]+_[A-Z0-9]+)/i);
    if (enumMatch) quantization = enumMatch[1];
  }

  // 2. If numeric file_type didn't yield a Q-label, try string match
  if (quantization === 'unknown' && typeof fileType === 'string') {
    const qtMatch = fileType.match(/(Q[0-9]+_[A-Z0-9_]+)/i);
    if (qtMatch) quantization = qtMatch[1];
  }

  // 3. Fallback: extract from filename
  if (quantization === 'unknown') {
    const fnQt = path.basename(filePath).match(/(Q[0-9]+_[A-Z0-9]+)/i);
    if (fnQt) quantization = fnQt[1];
  }

  // Detect vision models
  let isVisionModel = archLower.includes('clip') || archLower.includes('llava') ||
                         archLower.includes('mllama') || archLower.includes('qwen2vl') ||
                         archLower.includes('llama4');

  // Find companion mmproj files — use flexible glob-style matching.
  // mmproj files don't always match the base model name exactly (quantization differs).
  const mmprojFiles: string[] = [];
  const dir = path.dirname(filePath);
  const baseName = path.basename(filePath, '.gguf');

  // First try exact candidates
  const exactCandidates = [
    path.join(dir, `${baseName}.mmproj.gguf`),
    path.join(dir, `mmproj-${baseName}.gguf`),
    path.join(dir, `mmproj-${archLower}.gguf`),
    path.join(dir, 'mmproj.gguf'),
    path.join(dir, `${baseName}-mmproj.gguf`),
  ];

  for (const candidate of exactCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        mmprojFiles.push(candidate);
      }
    } catch { /* remote path */ }
  }

  // If no exact match, try glob-style: any file starting with mmproj- or containing mmproj in same dir
  if (mmprojFiles.length === 0) {
    try {
      const entries = fs.readdirSync(dir);
      const mmprojGlob = entries
        .filter(f => f.endsWith('.gguf') && (f.startsWith('mmproj-') || f.includes('-mmproj') || f === 'mmproj.gguf') && f !== path.basename(filePath))
        .map(f => path.join(dir, f));
      for (const p of mmprojGlob) {
        if (!mmprojFiles.includes(p)) mmprojFiles.push(p);
      }
    } catch { /* ignore readdir errors */ }
  }

  // For remote files, also check via SSH
  if (data.metadata && data.metadata._remote_mmproj_check) {
    const remoteMmprojs = data.metadata._remote_mmproj_check as string[];
    for (const remotePath of remoteMmprojs) {
      if (!mmprojFiles.includes(remotePath)) {
        mmprojFiles.push(remotePath);
      }
    }
  }

  // Update isVisionModel based on mmproj file presence (even if architecture name doesn't indicate it)
  if (mmprojFiles.length > 0) {
    isVisionModel = true;
  }

  return {
    name,
    architecture: rawArchitecture,
    parameterCount: formatParameterCount(paramCountRaw, filePath),
    quantization,
    sizeBytes,
    sizeGB,
    fileType: typeof fileType === 'string' ? fileType : String(fileType),
    tensorCount: data.tensor_count || 0,
    kvCount: data.kv_count || 0,
    contextLength: (metadata['llama.context_length'] as number) || undefined,
    embeddingLength: (metadata['llama.embedding_length'] as number) || undefined,
    blockCount: (metadata['llama.block_count'] as number) || undefined,
    feedForwardLength: (metadata['llama.feed_forward_length'] as number) || undefined,
    attentionHeadCount: (metadata['llama.attention.head_count'] as number) || undefined,
    ropeDimensionCount: metadata['llama.rope.dimension_count'] as number | undefined,
    isVisionModel,
    mmprojFiles: mmprojFiles.length > 0 ? mmprojFiles : undefined,
    mmprojPath: mmprojFiles.length > 0 ? mmprojFiles[0] : undefined,
  };
}

/**
 * Parse gguf-inspect CLI JSON output (legacy local).
 */
function parseGGUFInspect(data: any, filePath: string, sizeBytes: number, sizeGB: number): GGUFMetadata {
  const metadata = data.metadata || {};

  const architecture = metadata['general.architecture'] || 'unknown';
  const name = metadata['general.name'] || path.basename(filePath, '.gguf');
  const paramCount = metadata['general.parameter_count'] || 'unknown';
  const fileType = metadata['general.file_type'] || 'unknown';

  let quantization = 'unknown';
  const ftName = fileTypeName(fileType);
  if (ftName) {
    const enumMatch = ftName.match(/(Q[0-9]+_[A-Z0-9]+)/i);
    if (enumMatch) quantization = enumMatch[1];
  }
  if (quantization === 'unknown' && typeof fileType === 'string') {
    const qtMatch = fileType.match(/(Q[0-9]+_[A-Z0-9_]+)/i);
    if (qtMatch) quantization = qtMatch[1];
  }
  if (quantization === 'unknown') {
    const fnQt = path.basename(filePath).match(/(Q[0-9]+_[A-Z0-9]+)/i);
    if (fnQt) quantization = fnQt[1];
  }

  const isVisionModel = architecture.toLowerCase().includes('clip') || architecture.toLowerCase().includes('llava');
  let mmprojPath: string | undefined;

  if (isVisionModel) {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, '.gguf');
    const possibleMmproj = [
      path.join(dir, `${baseName}.mmproj.gguf`),
      path.join(dir, `mmproj-${baseName}.gguf`),
      path.join(dir, 'mmproj.gguf'),
    ];

    for (const candidate of possibleMmproj) {
      if (fs.existsSync(candidate)) {
        mmprojPath = candidate;
        break;
      }
    }
  }

  return {
    name,
    architecture,
    parameterCount: formatParameterCount(paramCount, filePath),
    quantization,
    sizeBytes,
    sizeGB,
    fileType,
    tensorCount: data.tensor_count || 0,
    kvCount: data.kv_count || 0,
    contextLength: metadata['llama.context_length'] as number | undefined,
    embeddingLength: metadata['llama.embedding_length'] as number | undefined,
    blockCount: metadata['llama.block_count'] as number | undefined,
    attentionHeadCount: metadata['llama.attention.head_count'] as number | undefined,
    isVisionModel,
    mmprojPath,
    mmprojFiles: mmprojPath ? [mmprojPath] : undefined,
  };
}

/**
 * Parse basic GGUF data from inline Python (legacy local).
 */
function parseBasicGGUF(data: any, filePath: string, sizeBytes: number, sizeGB: number): GGUFMetadata {
  const meta = data.metadata || {};
  const filename = path.basename(filePath);

  return {
    name: path.basename(filename, '.gguf'),
    architecture: 'unknown',
    parameterCount: 'unknown',
    quantization: extractQuantFromFilename(filename),
    sizeBytes,
    sizeGB,
    fileType: 'unknown',
    tensorCount: data.tensor_count || 0,
    kvCount: data.kv_count || 0,
  };
}

/**
 * Extract metadata from filename when binary parsing fails.
 */
function parseFromFilename(filePath: string, sizeBytes: number, sizeGB: number): GGUFMetadata {
  const filename = path.basename(filePath);
  const quantization = extractQuantFromFilename(filename);
  const parameters = extractParametersFromFilename(filename);

  const fnLower = filename.toLowerCase();
  const isVisionModel = fnLower.includes('llava') ||
                        fnLower.includes('bakllava') ||
                        fnLower.includes('moondream') ||
                        fnLower.includes('mllama') ||
                        fnLower.includes('qwen2vl');

  return {
    name: path.basename(filename, '.gguf'),
    architecture: 'unknown',
    parameterCount: parameters,
    quantization,
    sizeBytes,
    sizeGB,
    fileType: 'unknown',
    tensorCount: 0,
    kvCount: 0,
    isVisionModel,
  };
}

/**
 * Extract quantization type from filename.
 */
function extractQuantFromFilename(filename: string): string {
  const patterns = [
    /(Q[0-9]+_[A-Z0-9_]+)/i, // Q4_K_M, Q8_0, Q8_K, etc. (include digits after underscore)
    /(Q[0-9]+)/i,             // Q4, Q8, etc.
    /(F16|BF16)/i,            // F16, BF16
    /([0-9]bit)/i,            // 4bit, 8bit, etc.
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return 'unknown';
}

/**
 * Extract parameter count from filename.
 */
function extractParametersFromFilename(filename: string): string {
  const match = filename.match(/(\d+(?:\.\d+)?)(b|m)/i);
  if (match) {
    const value = match[1];
    const unit = match[2].toLowerCase();
    return unit === 'b' ? `${value}B` : `${value}M`;
  }

  return 'unknown';
}

/**
 * Format parameter count from various input formats.
 * Falls back to filename extraction when header data is missing.
 */
function formatParameterCount(input: any, filePath?: string): string {
  if (!input) {
    // Fallback to filename
    if (filePath) {
      return extractParametersFromFilename(path.basename(filePath));
    }
    return 'unknown';
  }

  if (typeof input === 'string') {
    if (input.match(/^\d+[BM]$/i)) return input.toUpperCase();
    const num = parseFloat(input);
    if (!isNaN(num)) {
      return formatNumberToParams(num);
    }
  }

  if (typeof input === 'number') {
    return formatNumberToParams(input);
  }

  // Try filename fallback
  if (filePath) {
    return extractParametersFromFilename(path.basename(filePath));
  }

  return 'unknown';
}

/**
 * Convert a numeric parameter count to a human-readable string.
 */
function formatNumberToParams(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`.replace('.0T', 'T');
  if (num >= 1e9) {
    const val = num / 1e9;
    if (Number.isInteger(val)) return `${val}B`;
    return `${val.toFixed(1)}B`;
  }
  if (num >= 1e6) {
    const val = num / 1e6;
    if (Number.isInteger(val)) return `${val}M`;
    return `${val.toFixed(1)}M`;
  }
  return `${num}K`;
}

// ─── Exported scanning functions (unchanged from Phase 1) ───

/**
 * Scan a directory for GGUF files (local or via SSH).
 */
export async function scanForGGUFiles(
  systemId: string,
  basePath: string = '/opt/models/gguf',
  sshCredentials?: { hostname: string; port: number; username: string; sshKey?: string; password?: string }
): Promise<{ path: string; filename: string; sizeGB: number }[]> {
  const results: { path: string; filename: string; sizeGB: number }[] = [];

  if (!sshCredentials) {
    try {
      const output = execSync(`find "${basePath}" -name "*.gguf" -type f 2>/dev/null`).toString().trim();
      if (!output) return results;

      const files = output.split('\n').filter(f => f.trim());
      for (const file of files) {
        try {
          const stat = fs.statSync(file);
          results.push({
            path: file,
            filename: path.basename(file),
            sizeGB: Math.round((stat.size / (1024 * 1024 * 1024)) * 100) / 100,
          });
        } catch { /* skip unreadable */ }
      }
    } catch (err) {
      console.error('Local GGUF scan failed:', err);
    }
  } else {
    try {
      const sshArgs = buildSSHArgs(sshCredentials);
      const cmd = [...sshArgs, sshTarget(sshCredentials), `find "${basePath}" -name "*.gguf" -type f 2>/dev/null`];
      const output = execSync(`ssh ${cmd.join(' ')}`).toString().trim();

      if (!output) return results;

      const files = output.split('\n').filter(f => f.trim());
      for (const file of files) {
        try {
          const sizeCmd = [...sshArgs, sshTarget(sshCredentials), `stat -c %s "${file}" 2>/dev/null || stat -f %z "${file}" 2>/dev/null`];
          const sizeOutput = execSync(`ssh ${sizeCmd.join(' ')}`).toString().trim();
          const sizeBytes = parseInt(sizeOutput) || 0;

          results.push({
            path: file,
            filename: path.basename(file),
            sizeGB: Math.round((sizeBytes / (1024 * 1024 * 1024)) * 100) / 100,
          });
        } catch { /* skip */ }
      }
    } catch (err) {
      console.error('Remote GGUF scan failed:', err);
    }
  }

  return results;
}

/**
 * Scan filesystem tree recursively (for browser-like navigation).
 */
export async function scanFilesystemTree(
  basePath: string = '/',
  _systemId?: string,
  sshCredentials?: { hostname: string; port: number; username: string; sshKey?: string; password?: string }
): Promise<{ name: string; path: string; isDir: boolean; size?: number }[]> {
  const results: { name: string; path: string; isDir: boolean; size?: number }[] = [];

  if (!sshCredentials) {
    try {
      const entries = fs.readdirSync(basePath, { withFileTypes: true });

      for (const entry of entries.slice(0, 100)) {
        if (entry.name.startsWith('.') && entry.name !== '..') continue;

        const entryPath = path.join(basePath, entry.name);

        try {
          if (entry.isDirectory()) {
            results.push({
              name: entry.name,
              path: entryPath,
              isDir: true,
            });
          } else {
            const stat = fs.statSync(entryPath);
            if (entryPath.endsWith('.gguf')) {
              results.push({
                name: entry.name,
                path: entryPath,
                isDir: false,
                size: stat.size,
              });
            }
          }
        } catch { /* skip unreadable */ }
      }
    } catch (err) {
      console.error('Local tree scan failed:', err);
    }
  } else {
    try {
      const sshArgs = buildSSHArgs(sshCredentials);
      const cmd = [...sshArgs, sshTarget(sshCredentials), `ls -la "${basePath}" 2>/dev/null | head -100`];
      const output = execSync(`ssh ${cmd.join(' ')}`).toString().trim();

      const lines = output.split('\n').slice(1);

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue;

        const permissions = parts[0];
        const name = parts.slice(8).join(' ');
        if (name.startsWith('.') && name !== '..') continue;

        const isDir = permissions.startsWith('d');
        const size = parseInt(parts[4]) || 0;
        const entryPath = path.join(basePath, name);

        if (isDir || name.endsWith('.gguf')) {
          results.push({
            name,
            path: entryPath,
            isDir,
            size: isDir ? undefined : size,
          });
        }
      }
    } catch (err) {
      console.error('Remote tree scan failed:', err);
    }
  }

  return results;
}
