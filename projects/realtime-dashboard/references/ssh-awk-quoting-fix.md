# Shell Script Lesson: SSH + awk quoting

## The Problem (2026-04-13)

When running `awk` inside an `ssh` command string, nested quoting causes `$2` to be
interpreted by the LOCAL shell instead of by awk on the remote host.

### What FAILS

```bash
# Double-quoted ssh string: \$2 becomes empty or wrong field
CPU1_TEMP=$(ssh root@ts.9xc.local "ipmitool sensor 2>/dev/null | awk '/CPU1 Temp/ {print \$2; exit}'" 2>/dev/null)
# Result: "Temp" (word 2 of "CPU1 Temp") instead of "36.000"
```

The issue: inside double quotes, `\$2` is interpreted by the local bash shell.
Even with escaping, the awk `$2` with default whitespace delimiter picks up "Temp"
(the second whitespace-delimited word), NOT the temperature value after the `|` delimiter.

### What WORKS

**Pull data once via SSH, parse locally:**

```bash
# One SSH call, no awk on remote side
TS_SENSORS=$(ssh root@ts.9xc.local 'ipmitool sensor' 2>/dev/null)

# Parse locally — no quoting issues at all
CPU1_TEMP=$(echo "$TS_SENSORS" | awk -F'|' '/CPU1 Temp/ {gsub(/ /,"",$2); print $2; exit}')
```

### Why This Works

1. SSH command uses **single quotes** — nothing is interpreted locally
2. awk runs **locally** on the captured output — no nested quoting
3. `-F'|'` uses the pipe delimiter that `ipmitool sensor` actually uses
4. `gsub(/ /,"",$2)` strips whitespace from the value field
5. Result: `35.000` (the actual temperature)

### Key Principle

**Never nest awk inside ssh double-quoted strings.** Instead:
- Pull raw output with SSH (single-quoted command)
- Parse the output locally with awk

This avoids ALL quoting/escaping issues permanently.

## Also Fixed

- `LLAMA_MEM` had same `\$1` escaping issue inside awk — fixed by using
  `awk "BEGIN {printf ...}"` locally on a raw numeric value
- `UPTIME` sed replacement used `|` as delimiter instead of `/` because
  the timestamp contains `/` characters
