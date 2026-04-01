#!/bin/bash
# Sam → N8n Integration Script
# Correct API patterns for N8n v2.13+
#
# API Endpoint: /api/v1/
# Auth Header: X-N8N-API-KEY (NOT Authorization: Bearer)
# Activation: POST /api/v1/workflows/{id}/activate
# Deactivation: POST /api/v1/workflows/{id}/deactivate
# Webhook URL: http://ocg.9xc.local:5678/webhook/{path}

N8N_URL="http://ocg.9xc.local:5678"
N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMWIxM2ViYi0yOTBmLTQzYzYtOTEyNy0xMDEyYjNiM2UyYTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMWYwZDc4ZDAtNzgwMC00ZWI1LWIxYTItMzlmNTFiMmQ1Y2IyIiwiaWF0IjoxNzc0NzExOTQ4fQ.lwANkisWjGcXPTm3hF7O-1mk5RzuUVS-1pNq7OoXS8g"

n8n_api() {
  local method="$1" endpoint="$2" data="$3"
  if [ -n "$data" ]; then
    curl -s -X "$method" "${N8N_URL}/api/v1${endpoint}" \
      -H "X-N8N-API-KEY: $N8N_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -s -X "$method" "${N8N_URL}/api/v1${endpoint}" \
      -H "X-N8N-API-KEY: $N8N_API_KEY"
  fi
}

n8n_webhook() {
  local path="$1" data="$2"
  curl -s -X POST "${N8N_URL}/webhook/${path}" \
    -H "Content-Type: application/json" \
    -d "$data"
}

# Usage:
# n8n_api GET /workflows                           # List workflows
# n8n_api POST /workflows '{"name":"test",...}'     # Create workflow
# n8n_api POST /workflows/{id}/activate             # Activate
# n8n_api POST /workflows/{id}/deactivate           # Deactivate
# n8n_webhook sam-trigger '{"task":"check_email"}'   # Trigger webhook
