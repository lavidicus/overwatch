/**
 * Shared SSH utilities for running commands on remote systems.
 *
 * Extracted from gguf-inspector.ts so other routes (e.g. whatllm hardware
 * analysis) can SSH into managed remote systems with the same credentials
 * shape used elsewhere (decrypted password / private-key TEXT).
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SSHCredentials {
  hostname: string;
  port: number;
  username: string;
  sshKey?: string;   // decrypted private-key TEXT (not a path)
  password?: string; // currently unused for non-interactive auth
}

/**
 * Build the SSH argument array (writes the private key to a 0600 tempfile
 * when supplied; otherwise falls back to ~/.ssh/id_rsa if available).
 *
 * The tempfile is auto-deleted ~30s later so short-lived SSH sessions complete first.
 */
export function buildSSHArgs(credentials: SSHCredentials): string[] {
  const sshArgs: string[] = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=10',
    '-p', credentials.port.toString(),
  ];

  if (credentials.sshKey) {
    const tempKeyFile = path.join(
      os.tmpdir(),
      `ssh_key_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    );
    fs.writeFileSync(tempKeyFile, credentials.sshKey, { mode: 0o600 });
    sshArgs.push('-i', tempKeyFile);

    // Best-effort cleanup
    setTimeout(() => {
      try { fs.unlinkSync(tempKeyFile); } catch { /* ignore */ }
    }, 30000);
  } else {
    const defaultKey = path.join(os.homedir(), '.ssh', 'id_rsa');
    if (fs.existsSync(defaultKey)) {
      sshArgs.push('-i', defaultKey);
    }
  }

  return sshArgs;
}

/** Build full SSH target string (user@host). */
export function sshTarget(credentials: Pick<SSHCredentials, 'hostname' | 'username'>): string {
  return `${credentials.username}@${credentials.hostname}`;
}

/**
 * Run a (possibly multi-line) shell command on a remote system via SSH.
 *
 * Uploads the command as a tempfile via scp, runs it with `bash`, removes it,
 * and returns the trimmed stdout. Stderr is inherited (so failures appear in
 * the backend log) but `|| true` per-command keeps overall success.
 */
export function runRemoteSSH(credentials: SSHCredentials, command: string): string {
  const MAX_BUFFER = 50 * 1024 * 1024;
  const sshArgs = buildSSHArgs(credentials);
  const targetStr = sshTarget(credentials);
  const cmdFile = path.join(os.tmpdir(), `ov_cmd_${Date.now()}.sh`);
  const remoteFile = `/tmp/ov_cmd_${Date.now()}_${Math.random().toString(36).slice(2)}.sh`;

  try {
    fs.writeFileSync(cmdFile, `#!/bin/bash\n${command}\n`, { mode: 0o755 });

    const scpBase = [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=10',
      '-P', credentials.port.toString(),
    ];
    const keyIdx = sshArgs.indexOf('-i');
    if (keyIdx >= 0) scpBase.push('-i', sshArgs[keyIdx + 1]);

    execSync(`scp ${scpBase.join(' ')} ${cmdFile} ${targetStr}:${remoteFile}`, { timeout: 15000 });
    const result = execSync(`ssh ${sshArgs.join(' ')} ${targetStr} bash ${remoteFile}`, {
      timeout: 30000,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    }).trim();
    try {
      execSync(`ssh ${sshArgs.join(' ')} ${targetStr} rm -f ${remoteFile}`, { timeout: 5000 });
    } catch { /* ignore */ }
    return result;
  } finally {
    try { fs.unlinkSync(cmdFile); } catch { /* ignore */ }
  }
}
