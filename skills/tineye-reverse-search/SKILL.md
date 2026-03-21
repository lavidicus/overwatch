# TinEye Reverse Image Search Skill

**Purpose:** Reverse image search using TinEye API to identify people, objects, or content from images  
**Status:** Requires paid TinEye API key (no free tier)  
**Created:** 2026-03-20  

---

## Overview

This skill enables OpenClaw to perform reverse image searches using TinEye's API. When you send an image and ask "who is this?" or "where did you see this?", the skill will:

1. Upload the image to TinEye
2. Search for matching/reverse images
3. Return results with source URLs, dates, and similarity scores

---

## API Requirements

**TinEye API Key:** Required (paid service)
- **Registration:** https://services.tineye.com/developers/tineyeapi/
- **Pricing:** Starting ~$23/month for 500 searches/month
- **Free trial:** Limited - check current offerings

**API Documentation:** https://services.tineye.com/developers/tineyeapi/

---

## Installation

### 1. Get API Key

1. Visit https://services.tineye.com/
2. Sign up for an account
3. Navigate to Developer API section
4. Generate API key

### 2. Store API Key

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "tineye": {
        "apiKey": "YOUR_TINEYE_API_KEY_HERE"
      }
    }
  }
}
```

### 3. Create Skill File

Create `~/.npm-global/lib/node_modules/openclaw/skills/tineye-reverse-search/SKILL.md`:

```markdown
# TinEye Reverse Image Search

**Usage:** `/tineye <image>` or "Reverse search this image"

**Description:** Uses TinEye API to find matching images and sources.

**Requirements:** TinEye API key configured in openclaw.json

**Example:** 
- User sends photo → `/tineye` → Returns matching images and sources
- "Who is this person?" → Uploads image → Searches TinEye → Returns results
```

---

## Usage

### Basic Search

```
User: "Who is this?" [sends image]
Agent: `/tineye` → Uploads to TinEye → Returns matches
```

### Advanced Search

```
User: "Where did you see this image online?"
Agent: Uploads to TinEye → Returns all matching URLs, dates, and websites
```

---

## Implementation Notes

### API Endpoint

**URL:** `https://api.tineye.com/rest/tineye_search/`

**Method:** POST (multipart/form-data)

**Parameters:**
- `apikey`: Your API key
- `image_file`: Image file (binary)

**Response:** JSON with matches, URLs, confidence scores

### Error Handling

- **Invalid API key:** Return clear error message
- **Image too large:** TinEye limits to 20MB
- **Unsupported format:** TinEye supports JPG, PNG, GIF, BMP, WEBP
- **Rate limited:** Respect API rate limits

---

## Alternatives

If TinEye API is too expensive, consider:

1. **Google Images** (via browser automation)
2. **Yandex Images** (free API available)
3. **Bing Visual Search** (free tier available)

---

## See Also

- TinEye API docs: https://services.tineye.com/developers/tineyeapi/
- Google Lens: Browser automation approach
- Yandex: https://yandex.com/images/
