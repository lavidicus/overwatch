# Error Log

Log command failures, exceptions, and unexpected behaviors.

## Format

## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done

---

## [ERR-20260307-004] usm2-vmid-100-olla-destroyed

**Logged**: 2026-03-07T20:38:34Z
**Priority**: critical
**Status**: pending
**Area**: infra

### Summary
Destroyed VMID 100 on usm2, which previously hosted Olla, during cleanup of failed VM creation.

### Error
```
Human report: "Olla was VMID 100 and now I’m not seeing it listed on qm list."
```

### Context
- Host: usm2 (Proxmox VE 9.1.5)
- Action: `qm destroy 100` run to clean up failed VM creation attempt
- Result: VMID 100 removed, config and disks deleted
- Impact: Olla VM removed from usm2

### Suggested Fix
- Avoid using a fixed VMID without first verifying existing VMs on host.
- Always run `qm list` or `ls /etc/pve/nodes/<node>/qemu-server` before creating a VM.
- When reusing a VMID, confirm owner/service or check with user.

### Metadata
- Reproducible: yes
- Related Files: /etc/pve/nodes/usm2/qemu-server/100.conf
- See Also: (none)

---

## [ERR-20260307-001] usm2-networking-restart

**Logged**: 2026-03-07T19:23:00Z
**Priority**: critical
**Status**: pending
**Area**: infra

### Summary
Restarting networking on usm2 after adding vmbr2 likely dropped the management NIC, causing loss of control of OpenClaw.

### Error
```
User report: "script killed the NIC on USM2 and I lost control of OpenClaw"
```

### Context
- Command attempted: `sudo systemctl restart networking` on usm2
- Purpose: apply vmbr2 (VLAN22) bridge config
- Interface: enp3s0f1 (for vmbr2)
- Result: management connectivity lost

### Suggested Fix
- Avoid full `systemctl restart networking` on remote hosts.
- Use `ifreload -a` or `ifup vmbr2` instead, or schedule a maintenance window with console access.
- Validate the bridge config with `ifquery` before applying.
- Consider using `pve-networking` reload tools on Proxmox.

### Metadata
- Reproducible: unknown
- Related Files: /etc/network/interfaces (usm2)
- See Also: (none)

---
## [ERR-20260305-001] openclaw-gateway-restart

**Logged**: 2026-03-05T17:30:20Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
openclaw gateway restart failed with tool-session transcript error

### Error
```
[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.
```

### Context
- Command: `openclaw gateway restart`
- Purpose: apply OpenClaw config change (Ollama API switch)
- Environment: ocg host, OpenClaw workspace

### Suggested Fix
Retry restart after confirming tool session stability; fall back to `openclaw gateway stop && sleep 2 && openclaw gateway start` if needed.

### Metadata
- Reproducible: unknown
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---

## [ERR-20260305-002] openclaw-gateway-restart-systemctl

**Logged**: 2026-03-05T17:34:40Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Gateway restart via systemctl triggered tool-session transcript error

### Error
```
[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.
```

### Context
- Command: `systemctl --user restart openclaw-gateway`
- Purpose: apply OpenClaw config change
- Environment: ocg host

### Suggested Fix
Investigate tool-session transcript repair errors; confirm gateway health via systemctl status/logs.

### Metadata
- Reproducible: unknown
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: ERR-20260305-001

---

## [ERR-20260305-003] git-add-outside-repo

**Logged**: 2026-03-05T18:02:32Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
Attempted to `git add` a file outside the workspace repo

### Error
```
fatal: /home/localadmin/.openclaw/openclaw.json: '/home/localadmin/.openclaw/openclaw.json' is outside repository at '/home/localadmin/.openclaw/workspace'
```

### Context
- Command: `git add /home/localadmin/.openclaw/openclaw.json ITIL/policies/OPENCLAW_CONFIG_POLICY.md ITIL/policies/CHANGE_TICKETS.md`
- Workspace repo: /home/localadmin/.openclaw/workspace

### Suggested Fix
Only stage files within the workspace repo; document external config changes separately.

### Metadata
- Reproducible: yes
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---
## [ERR-20260305-004] session-status-model-override

**Logged**: 2026-03-05T18:11:26Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
Failed to switch session model to default via session_status; model not allowed

### Error
```
Model "olla/qwen3.5:latest" is not allowed.
```

### Context
- Tool: session_status
- Input: model="olla/qwen3.5:latest"
- Goal: switch session back to default model after restart
- Environment: ocg host, OpenClaw workspace

### Suggested Fix
Verify model allowlist and provider config; update allowed models or use approved model IDs.

### Metadata
- Reproducible: yes
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---
## [ERR-20260305-005] openclaw-gateway-restart

**Logged**: 2026-03-05T18:16:46Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Gateway stop/start returned transcript repair error after model allowlist change

### Error
```
[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.
```

### Context
- Command: `openclaw gateway stop && sleep 2 && openclaw gateway start`
- Purpose: apply model allowlist update
- Environment: ocg host

### Suggested Fix
Retry restart after confirming session stability; consider restarting outside active session and start a new session post-restart.

### Metadata
- Reproducible: unknown
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: ERR-20260305-001, ERR-20260305-002

---

## [ERR-20260319-001] qwen3.5-tool-call-emission-failure

**Logged**: 2026-03-19T13:45:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
qwen3.5 model emits tool call XML as plain text instead of actually invoking tools. Function calls render in the chat output but never execute.

### Error
```
User sees raw XML in chat:
<tool_call>
exec
command="find /home/localadmin/.openclaw/workspace/playbooks -name '*.md' -type f"
```
Tool is never actually invoked. No exec happens.

### Context
- Model: olla/qwen3.5:latest via Ollama on usm1 (olla host)
- Server: llama-server with `--ctx-size 131072`
- Missing: `--jinja` flag and/or `--chat-template chatml` for proper tool call formatting
- OpenClaw sends function calling schema; model responds with raw text instead of structured tool calls
- Switching to github-copilot/claude-opus-4.6 resolves immediately

### Root Cause (suspected)
llama-server is not configured with the correct chat template for Qwen 3.5's function calling format. Qwen models use ChatML-based tool calling that requires either:
1. `--jinja` flag to enable Jinja2 template processing (supports tool_call blocks)
2. Correct chat template that maps OpenAI-style function calls to Qwen's format
3. Possibly an outdated llama.cpp build that doesn't support Qwen 3.5 tool calling

### Suggested Fix
See plan below — recompile llama.cpp and add `--jinja` / chat template flags.

### Metadata
- Reproducible: yes (every tool call on qwen3.5)
- Related Files: /home/localadmin/.openclaw/workspace/llama-server.service
- See Also: None

---

## [ERR-20260307-002] ssh-usm2-unresolved

**Logged**: 2026-03-07T19:35:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary
SSH to usm2 failed because hostname could not be resolved.

### Error
```
ssh: Could not resolve hostname usm2: Name or service not known
```

### Context
- Command attempted: ssh hal-maint@usm2
- Purpose: check/download Proxmox ISO on usm2

### Suggested Fix
- Use IP address or ensure DNS/hosts entry for usm2 exists.
- Confirm management connectivity restored after networking changes.

### Metadata
- Reproducible: unknown
- Related Files: none
- See Also: ERR-20260307-001

---

## [ERR-20260307-003] usm2-proxmox-iso-cert-mismatch

**Logged**: 2026-03-07T19:46:00Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Downloading Proxmox ISO on usm2 failed due to TLS certificate hostname mismatch for download.proxmox.com.

### Error
```
The certificate's owner does not match hostname ‘download.proxmox.com’
```

### Context
- Command: wget https://download.proxmox.com/iso/proxmox-ve_9.1-1.iso
- Host: usm2
- Result: TLS verification failed

### Suggested Fix
- Verify system time and CA bundle on usm2.
- Check for TLS inspection/SSL proxy on the network.
- As a last resort, use `wget --no-check-certificate` only with explicit approval and verify checksum.

### Metadata
- Reproducible: unknown
- Related Files: /etc/ssl/certs
- See Also: ERR-20260307-001

---
