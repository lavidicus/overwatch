# Hermes Agent Skill

Send tasks to Hermes for execution. Hermes is Jeremy's technical operator AI on a separate VM (hermes, 10.50.15.231) — specialized in systems administration, cybersecurity, software development, and ops infrastructure.

## Architecture

```
You (Sam/OpenClaw on claw)
  ↔ Matrix DM: @sam:comms.9xc.io (your DM with Hermes)
  ↔ @hermes:comms.9xc.io (Hermes Matrix bridge)
```

**Hermes runs on:** `hermes` (10.50.15.231) — Ubuntu 24.04.4 LTS, single VM
**Hermes model:** `copilot-opus` (claude-opus-4.7 via GitHub Copilot) + `node2` fallback (llama.cpp, dual P6000, 48GB VRAM)
**Hermes identity:** Technical operator — sysadmin, security, dev, ops
**Your identity:** Operations butler — sysadmin, engineering, PM, EA

## Communication Channel

**Hermes is reachable via Matrix DM.** The bridge listens on `@hermes:comms.9xc.io` and routes messages to Hermes via `hermes chat -Q --yolo --pass-session-id --model copilot-opus`.

### Sending a Task

Use the `message` tool to send a task to Hermes:

```
message(
    action="send",
    channel="matrix",
    target="@hermes:comms.9xc.io",
    message="<your task here>"
)
```

Hermes will reply in your DM room (`!pDdHxwMEZjKZSVDOwa:comms.9xc.io`). Check for replies by reading that room.

### Reading Hermes's Reply

```
message(
    action="read",
    channel="matrix",
    target="!pDdHxwMEZjKZSVDOwa:comms.9xc.io",
    limit=5
)
```

## Task Formatting

Be explicit. Hermes processes tasks as chat prompts — structure matters.

### Good format:
```
@hermes:comms.9xc.io — Task: [brief title]

Details:
- What needs to happen
- Any constraints (don't touch X, use Y approach)
- Expected output format

Return a summary when done.
```

### Bad format:
```
@hermes:comms.9xc.io — do the thing
```

## What Hermes Can Do

Hermes has full access to:
- **Terminal:** bash on hermes VM (local backend)
- **File system:** full read/write on hermes
- **SSH:** can reach node1, node2, home-server, ts.9xc.local
- **Tools:** web search, file ops, exec, cron, memory, vision, code execution, TTS, browser
- **Skills:** 27+ installed (devops, github, red-teaming, smart-home, mlops, data-science, etc.)
- **Cron:** can schedule jobs via `hermes cron`
- **Ops system:** RFC workflow, ledger, context management
- **Matrix:** responds in lavid-dm, sam-dm, and bot-group (when mentioned)

### What Hermes CANNOT Do
- **Cannot reach you back on Matrix directly** — it can only respond to messages you send it
- **Cannot access your local filesystem** (claw) — it's on a completely different machine
- **No access to n8n, OpenClaw workspace, or your tools** — separate environment

## Collaboration Patterns

### Pattern 1: Remote Ops
Sam orchestrates, Hermes executes on hermes infrastructure.
```
Sam: "@hermes:comms.9xc.io — Task: Check disk usage on all mounted volumes
     and report any partitions above 80%. Include mount point, size, used, available."
Hermes: [reports results]
Sam: [analyzes and takes action]
```

### Pattern 2: Research & Analysis
Sam asks Hermes to research something on its infrastructure.
```
Sam: "@hermes:comms.9xc.io — Task: Audit all systemd services on hermes.
     List any that are failed, disabled, or have Restart=on-failure but no
     RestartSec configured. Return as a table."
Hermes: [analysis]
```

### Pattern 3: Cross-VM Actions
Sam needs something done on a remote host — Hermes can SSH there.
```
Sam: "@hermes:comms.9xc.io — Task: SSH to node2 and check GPU memory
     usage. Run nvidia-smi --query-gpu=memory.used,memory.total,temperature.gpu
     --format=csv,noheader and return the output."
Hermes: [results]
```

### Pattern 4: Scheduled Tasks via Hermes Cron
```
Sam: "@hermes:comms.9xc.io — Task: Set up a cron job that runs every 6 hours:
     Check the hermes gateway service status and log any failures to
     ~/.hermes/logs/gateway-health.log. Name it 'gateway-health-check'."
```

## Important Notes

1. **Hermes has its own session management** — each conversation thread maintains context. Hermes persists sessions per Matrix room.
2. **Hermes has its own memory** — separate from yours. It won't know what you worked on unless you share context.
3. **Hermes's SOUL.md** says: "I take instructions from Jeremy alone." When you (Sam) send tasks, frame them as being from Jeremy or as a collaborative ops task. Hermes will process them.
4. **Latency:** Hermes replies in seconds to minutes depending on task complexity. The bridge spawns a subprocess with a 600s timeout.
5. **Rate limits:** The bridge is single-process — only one Hermes subprocess at a time. If you send multiple tasks rapidly, queue them.
6. **Hermes's current sessions** are logged in `~/.hermes/sessions/` and `~/.hermes/ops/context/ledger.jsonl`.

## Troubleshooting

- **Hermes not responding?** Check: `ssh localadmin@hermes 'systemctl --user status matrix-hermes-bridge'`
- **Hermes gateway down?** Check: `ssh localadmin@hermes 'systemctl status hermes-gateway.service'`
- **Hermes stuck?** The bridge kills subprocesses after 600s timeout. Wait or send a new message to trigger a fresh subprocess.
- **Session corruption?** Hermes can get `SessionSource` errors. A new conversation thread usually fixes it.

## Matrix Room Reference

- **lavid-dm:** `!xuKsAWitCRLIRVmoxa:comms.9xc.io` — Jeremy's DM with Hermes
- **sam-dm:** `!pDdHxwMEZjKZSVDOwa:comms.9xc.io` — Your DM with Hermes (where tasks go)
- **bot-group:** `!JjYnalfKOtVYtVmBDY:comms.9xc.io` — Group chat (Hermes responds only when "hermes" is mentioned)
