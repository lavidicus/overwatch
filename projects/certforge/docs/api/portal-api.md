# CertForge Portal API Reference

## Endpoints

### `POST /request`
Submit a certificate request.

**Form Fields:**
- `common_name` (required)
- `organization` (required)
- `key_size` (2048 or 4096)
- `validity_days` (default 365)

### `GET /validate?serial=XYZ`
Validate a certificate by serial number.

### `GET /download/<serial>`
Download a certificate by serial number.

## Example Request

```bash
curl -X POST https://pki.9xc.io/request \
  -d common_name=host.9xc.io \
  -d organization="9XC" \
  -d key_size=2048 \
  -d validity_days=365
```
