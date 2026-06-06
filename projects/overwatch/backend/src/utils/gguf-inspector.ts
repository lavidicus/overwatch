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

  // Try using gguf-inspect CLI first (most accurate)
  try {
    const output = execSync(`gguf-inspect "${filePath}" --json 2>/dev/null || echo '{}'`).toString().trim();
    if (output && output !== '{}') {
      const data = JSON.parse(output);
      return parseGGUFInspect(data, filePath, sizeBytes, sizeGB);
    }
  } catch {
    console.log('gguf-inspect not available, falling back to manual parsing');
  }

  // Fallback: Python GGUF header parser (local)
  try {
    const escaped = filePath.replace(/'/g, "'\\''");
    const output = execSync(`python3 -c "
import struct, sys, json

def read_uint64(f): return struct.unpack('<Q', f.read(8))[0]
def read_uint32(f): return struct.unpack('<I', f.read(4))[0]

def read_value(f, value_type):
    if value_type == 0: return struct.unpack('<B', f.read(1))[0]
    elif value_type == 1: return struct.unpack('<b', f.read(1))[0]
    elif value_type == 2: return struct.unpack('<H', f.read(2))[0]
    elif value_type == 3: return struct.unpack('<h', f.read(2))[0]
    elif value_type == 4: return struct.unpack('<I', f.read(4))[0]
    elif value_type == 5: return struct.unpack('<i', f.read(4))[0]
    elif value_type == 6: return struct.unpack('<f', f.read(4))[0]
    elif value_type == 7: return bool(struct.unpack('<B', f.read(1))[0])
    elif value_type == 8:
        length = read_uint64(f)
        return f.read(length).decode('utf-8', errors='ignore')
    elif value_type == 9:
        arr_type = read_uint32(f)
        arr_len = read_uint64(f)
        return [read_value(f, arr_type) for _ in range(arr_len)]
    elif value_type == 10: return read_uint64(f)
    elif value_type == 11: return struct.unpack('<q', f.read(8))[0]
    elif value_type == 12: return struct.unpack('<d', f.read(8))[0]
    else: return f'<unknown_{value_type}>'

try:
    with open('${escaped}', 'rb') as f:
        magic = f.read(4)
        if magic != b'GGUF': print(json.dumps({\"error\": \"Not GGUF\"})); sys.exit(0)
        version = read_uint32(f)
        tensor_count = read_uint64(f)
        kv_count = read_uint64(f)
        metadata = {}
        for _ in range(kv_count):
            key_len = read_uint64(f)
            key = f.read(key_len).decode('utf-8', errors='ignore')
            value_type = read_uint32(f)
            value = read_value(f, value_type)
            metadata[key] = value
        print(json.dumps({\"version\": version, \"tensor_count\": tensor_count, \"kv_count\": kv_count, \"metadata\": metadata}))
except Exception as e:
    print(json.dumps({\"error\": str(e)}))
" 2>/dev/null || echo '{}'`).toString().trim();

    if (output && output !== '{}') {
      const data = JSON.parse(output);
      if (data.error) {
        return parseFromFilename(filePath, sizeBytes, sizeGB);
      }
      return parseGGUFMetadata(data, filePath, sizeBytes, sizeGB);
    }
  } catch {
    console.log('Python parsing failed, using filename-based detection');
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
  if (fileType && typeof fileType === 'string') {
    const qtMatch = fileType.match(/(Q[0-9]+_[A-Z_]+)/i);
    if (qtMatch) quantization = qtMatch[1];
  }
  if (quantization === 'unknown') {
    const fnQt = path.basename(filePath).match(/(Q[0-9]+_[A-Z_]+)/i);
    if (fnQt) quantization = fnQt[1];
  }

  // Detect vision models
  const isVisionModel = archLower.includes('clip') || archLower.includes('llava') ||
                         archLower.includes('mllama') || archLower.includes('qwen2vl') ||
                         archLower.includes('llama4');

  // Find companion mmproj files
  const mmprojFiles: string[] = [];
  if (isVisionModel) {
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, '.gguf');
    const candidates = [
      path.join(dir, `${baseName}.mmproj.gguf`),
      path.join(dir, `mmproj-${baseName}.gguf`),
      path.join(dir, `mmproj-${archLower}.gguf`),
      path.join(dir, 'mmproj.gguf'),
      path.join(dir, `${baseName}-mmproj.gguf`),
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          mmprojFiles.push(candidate);
        }
      } catch { /* remote path — file may not exist locally */ }
    }

    // For remote files, also check via SSH
    // (passed via data.metadata._remote_mmproj_check from the remoteGGUFInspect wrapper)
    if (data.metadata && data.metadata._remote_mmproj_check) {
      const remoteMmprojs = data.metadata._remote_mmproj_check as string[];
      for (const remotePath of remoteMmprojs) {
        if (!mmprojFiles.includes(remotePath)) {
          mmprojFiles.push(remotePath);
        }
      }
    }
  }

  return {
    name,
    architecture: rawArchitecture,
    parameterCount: formatParameterCount(paramCountRaw),
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
  if (fileType && typeof fileType === 'string') {
    const qtMatch = fileType.match(/(Q[0-9]+_[A-Z_]+)/i);
    if (qtMatch) quantization = qtMatch[1];
  }
  if (quantization === 'unknown') {
    const fnQt = path.basename(filePath).match(/(Q[0-9]+_[A-Z_]+)/i);
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
    parameterCount: formatParameterCount(paramCount),
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
    /(Q[0-9]+_[A-Z_]+)/i,    // Q4_K_M, Q8_K, etc.
    /(Q[0-9]+)/i,             // Q4, Q8, etc.
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
 */
function formatParameterCount(input: any): string {
  if (!input) return 'unknown';

  if (typeof input === 'string') {
    if (input.match(/^\d+[BM]$/i)) return input.toUpperCase();
    const num = parseFloat(input);
    if (!isNaN(num)) {
      if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`.replace('.0B', 'B');
      if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`.replace('.0M', 'M');
    }
  }

  if (typeof input === 'number') {
    if (input >= 1e9) return `${(input / 1e9).toFixed(1)}B`.replace('.0B', 'B');
    if (input >= 1e6) return `${(input / 1e6).toFixed(1)}M`.replace('.0M', 'M');
  }

  return 'unknown';
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
