#!/bin/bash
# Domain Checker Skill - Auto-check availability from chat

# Check if domain provided
if [ -z "$1" ]; then
  echo "Usage: /domain-check <domain>"
  echo "Examples:"
  echo "  /domain-check c.io"
  echo "  /domain-check xc.io"
  echo "  /domain-check c.dev"
  exit 1
fi

DOMAIN=$1

# Check via WHOIS (if available)
if command -v whois &> /dev/null; then
  RESULT=$(whois $DOMAIN 2>/dev/null)
  
  if echo "$RESULT" | grep -q "NO OBJECT\|No match\|AVAILABLE"; then
    echo "✅ Domain $DOMAIN appears AVAILABLE"
  else
    echo "❌ Domain $DOMAIN is TAKEN"
    echo "Registry: $(echo "$RESULT" | grep "Registry Domain ID:" | cut -d: -f2 | tr -d ' ')"
  fi
else
  # Fallback to web check
  echo "⚠️  WHOIS not available, trying web check..."
  curl -s "https://www.namecheap.com/domains/domain-name-search/?domain=${DOMAIN}" | grep -q "already taken" && \
    echo "❌ Domain $DOMAIN is TAKEN" || \
    echo "✅ Domain $DOMAIN likely AVAILABLE (verify at registrar)"
fi
