# Domain Name Availability Checker

**Purpose:** Check domain name availability directly from chat.  
**Author:** Sam (OpenClaw)  
**Date:** 2026-04-04  
**Status:** Active

---

## Usage

### Basic Syntax
```
/domain-check <domain>
```

### Examples
```
/domain-check c.io
/domain-check xc.io
/domain-check c.dev
/domain-check c.app
/domain-check mydomain.com
```

---

## How It Works

1. **Parses** the domain name from your message
2. **Queries** WHOIS/dns records to check availability
3. **Reports** back:
   - ✅ **Available** - Domain can be registered
   - ❌ **Taken** - Domain is already registered
   - ⚠️ **Unknown** - Registry not responding

---

## Supported TLDs

- **.com, .net, .org, .io, .co, .ai, .dev, .app, .xyz, .tech, .info, .biz**
- Any valid TLD (via WHOIS lookup)

---

## Implementation Details

### WHOIS Lookup Strategy
- Uses `whois` command-line tool (if available)
- Falls back to web fetch for TLD-specific WHOIS servers
- Caches results for 5 minutes to avoid rate limits

### Rate Limiting
- Max 10 checks per minute
- Auto-waits if rate limited

### Response Format
```
🌐 Domain: example.io
Status: ✅ Available (or ❌ Taken)
Registry: nic.io (or WHOIS server)
Expires: N/A (if available) or [date] (if taken)
Registrar: [name] (if taken)
```

---

## Quick Commands

```bash
# Check single domain
/domain-check c.io

# Check multiple domains (batch)
/domain-check c.io xc.io ac.io

# Check with fallback to web
/domain-check c.dev --web

# Check premium domains
/domain-check premium-domain.com --premium
```

---

## Installation

```bash
# Install from workspace
node ~/openclaw/workspace/skills/domain-checker/install.js

# Or use clawhub
clawhub install ~/openclaw/workspace/skills/domain-checker
```

---

## Notes

- **WHOIS availability** varies by TLD
- Some registries block automated queries
- Premium/expired domains may show as "available" but cost $100+
- Always verify at registrar before purchase

---

## Future Enhancements

- [ ] Bulk domain checking
- [ ] Domain price comparison across registrars
- [ ] Historical WHOIS lookup
- [ ] DNS record checking
- [ ] SSL certificate status
- [ ] WHOIS privacy detection

---

*Created: 2026-04-04 by Sam (OpenClaw)*
