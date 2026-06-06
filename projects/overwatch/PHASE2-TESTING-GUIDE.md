# Phase 2 Testing Guide

**Quick reference for manual testing of Phase 2 features**

---

## Login Credentials

- **URL:** http://localhost:5713/login
- **Email:** admin@overwatch.local
- **Password:** Admin123!Secure

---

## Test Workflow 1: Provider Auto-Discovery

### Prerequisites
- Need a running vLLM, Ollama, or OpenAI-compatible provider
- API key if required

### Steps

1. **Create Provider**
   - Go to Providers page
   - Click "Add Provider"
   - Fill in:
     - Name: "Test vLLM"
     - Type: "vLLM"
     - Host: "http://vllm:11434" (or your provider URL)
     - API Key: (if required)
   - Click "Create"
   - Click "Connect" button to test connection

2. **Discover Models**
   - Go to Models page
   - Look for "Discover Test vLLM" button in empty state OR
   - Click "Add Model" → see provider list with discovery buttons
   - Click "Discover {ProviderName}" button
   - Wait for success message: "Discovered X models, registered Y new models"
   - Verify models appear in grid with metadata (params, quantization, size)

### Expected Results
- ✅ Provider connects successfully
- ✅ Discovery finds models from `/v1/models` endpoint
- ✅ Models auto-registered with correct metadata
- ✅ No duplicate registrations on re-discovery

---

## Test Workflow 2: Remote System Scanning

### Prerequisites
- SSH access to a system with GGUF files
- System must have GGUF files in `/opt/models/gguf` or similar

### Steps

1. **Add Remote System**
   - Go to Systems page
   - Click "Add System"
   - Fill in:
     - Name: "test-server"
     - Hostname: IP or hostname
     - Port: 22
     - Protocol: SSH
     - Username: your-ssh-user
     - Auth Type: SSH Key or Password
     - SSH Key: (paste private key) or Password: (enter password)
   - Click "Add"
   - Click "Test Connection" button (sync icon) to verify

2. **Scan for Models from Systems Page**
   - Find your system card
   - Click "Scan for Models" button (folder icon)
   - Wait for success message: "Found X GGUF files in /opt/models/gguf"
   - Should redirect to Models page (future enhancement)

3. **Browse Filesystem from Models Page**
   - Go to Models page
   - Click "Discover from System" button (top right)
   - Filesystem browser dialog opens
   - Shows current path: `/opt/models/gguf`
   - See list of directories and .gguf files
   - Click directory to navigate
   - Click "Inspect" button on any .gguf file

4. **Inspect and Register Model**
   - After clicking "Inspect":
     - Wait for "Inspecting GGUF file..." message
     - Dialog closes, Add Model dialog opens
     - Form should be auto-filled:
       - Model Name: extracted from GGUF
       - Display Name: same as name
       - Quantization: e.g., "Q4_K_M"
       - Size: e.g., "19.5"
       - Parameters: e.g., "35B"
       - Source: "LOCAL"
       - Download Path: full path to file
   - Select provider from dropdown
   - Click "Create"
   - Verify model appears in grid

### Expected Results
- ✅ SSH connection succeeds
- ✅ Directory scan finds GGUF files
- ✅ Filesystem browser navigates directories
- ✅ GGUF inspection extracts correct metadata
- ✅ Form auto-fill works accurately
- ✅ Model registers with systemId linked

---

## Test Workflow 3: GGUF File Introspection

### Manual API Test

```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@overwatch.local","password":"Admin123!Secure"}' \
  | jq -r '.token')

# Inspect a local GGUF file
curl -s "http://localhost:3000/api/models/inspect?path=/path/to/model.gguf" \
  -H "Authorization: Bearer $TOKEN" | jq

# Inspect a remote GGUF file via SSH
curl -s "http://localhost:3000/api/models/inspect?path=/opt/models/Qwen.gguf&systemId=YOUR-SYSTEM-ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Expected Response

```json
{
  "path": "/opt/models/Qwen3.6-35B-Q4_K_M.gguf",
  "systemId": "uuid",
  "metadata": {
    "name": "Qwen3.6-35B",
    "architecture": "llama",
    "parameterCount": "35B",
    "quantization": "Q4_K_M",
    "sizeBytes": 20937129984,
    "sizeGB": 19.5,
    "fileType": "GGUF v3",
    "tensorCount": 456,
    "kvCount": 28,
    "contextLength": 32768,
    "embeddingLength": 4096,
    "attentionHeadCount": 32,
    "blockCount": 48,
    "isVisionModel": false,
    "mmprojPath": null
  }
}
```

---

## Error Scenarios to Test

### 1. Invalid SSH Credentials
- Add system with wrong password/key
- Click "Test Connection"
- **Expected:** Clear error message, system stays inactive

### 2. Disconnected Provider
- Create provider but don't connect
- Try to discover models
- **Expected:** Button disabled or shows "(Not Connected)"

### 3. Missing GGUF Files
- Scan empty directory
- **Expected:** "No entries found" message in browser

### 4. Corrupted GGUF File
- Try to inspect non-GGUF file
- **Expected:** Graceful error, not crash

### 5. Network Timeout
- Scan very large directory (>100 files)
- **Expected:** Either pagination or timeout error

---

## Quick Smoke Test Checklist

Run through this quickly to verify everything works:

- [ ] Can login to frontend
- [ ] Can view Providers page
- [ ] Can view Systems page
- [ ] Can view Models page
- [ ] Backend health endpoint responds
- [ ] All API endpoints return auth errors (not 404)
- [ ] Frontend build artifacts exist in `dist/`

```bash
# Quick smoke test
curl -s http://localhost:3000/health | jq .status
curl -s http://localhost:5713 | head -3
ls -lh /home/localadmin/.openclaw/workspace/projects/overwatch/frontend/dist/
```

---

## Debugging Tips

### Backend Logs
```bash
# Check if backend is running
ps aux | grep "tsx src/index.ts"

# View recent logs
journalctl --user -u openclaw-gateway -n 50

# Restart backend
cd /home/localadmin/.openclaw/workspace/projects/overwatch/backend
npx tsx src/index.ts
```

### Frontend Logs
```bash
# Check browser console for errors
# Open DevTools → Console → look for red errors

# Rebuild frontend
cd /home/localadmin/.openclaw/workspace/projects/overwatch/frontend
npm run build
```

### Database Check
```bash
# Verify schema migration applied
cd /home/localadmin/.openclaw/workspace/projects/overwatch/backend
sqlite3 prisma/dev.db ".schema provider_models"

# Should show systemId and visionModelId columns
```

### API Testing
```bash
# Get token
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@overwatch.local","password":"Admin123!Secure"}' \
  | jq -r '.token')

# Test any endpoint
curl -s http://localhost:3000/api/providers \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Success Criteria

Phase 2 is working if:

1. ✅ Can discover models from connected providers
2. ✅ Can browse remote filesystem via SSH
3. ✅ Can inspect GGUF files and extract metadata
4. ✅ Can register models with auto-filled forms
5. ✅ No Phase 1 features broken (auth, settings, encryption, audit)
6. ✅ Both backend and frontend running without errors

---

**Last Updated:** June 6, 2026 - 12:07 AM UTC  
**Status:** Ready for manual testing
