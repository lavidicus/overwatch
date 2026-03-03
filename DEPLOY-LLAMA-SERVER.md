# Deploy llama-server service update to olla host

## Prerequisites
- SSH access to olla host as user `localadmin`
- sudo privileges on olla (to restart the service)

## Steps

### Option 1: One-liner (fastest)

```bash
scp llama-server.service localadmin@olla:/tmp/ && \
ssh localadmin@olla "sudo cp /tmp/llama-server.service /etc/systemd/system/ && \
sudo systemctl daemon-reload && \
sudo systemctl restart llama-server && \
sleep 2 && \
journalctl -u llama-server -n 5 --no-pager | grep -E '(Active|ctx-size)'"
```

### Option 2: Manual (safer, step-by-step)

```bash
# 1. Copy service file to olla
scp llama-server.service localadmin@olla:/tmp/

# 2. SSH into olla
ssh localadmin@olla

# 3. Replace the service file
sudo cp /tmp/llama-server.service /etc/systemd/system/llama-server.service

# 4. Reload systemd and restart
sudo systemctl daemon-reload
sudo systemctl restart llama-server

# 5. Verify it's running with new ctx-size
journalctl -u llama-server -n 20 --no-pager | grep -E '(ctx-size|Active)'
```

## Verification

After restart, check that the service is running with the new ctx-size:

```bash
ssh localadmin@olla "systemctl status llama-server | grep -E '(Active|ExecStart)'"
```

Expected output should show:
```
Active: active (running)
ExecStart=... --ctx-size 131072 --context-shift
```

## Monitoring

Watch the logs for any errors:

```bash
ssh localadmin@olla "journalctl -u llama-server -f"
```

## Rollback (if needed)

If something goes wrong, rollback to original config:

```bash
ssh localadmin@olla "sudo sed -i 's/--ctx-size 131072/--ctx-size 65535/g' /etc/systemd/system/llama-server.service && \
sudo systemctl daemon-reload && \
sudo systemctl restart llama-server"
```