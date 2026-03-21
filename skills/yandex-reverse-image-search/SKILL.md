# Yandex Reverse Image Search Skill

**Purpose:** Reverse image search using Yandex Images (free, no API key required)  
**Status:** Ready to implement  
**Created:** 2026-03-20  

---

## Overview

This skill enables OpenClaw to perform reverse image searches using Yandex Images' website. When you send an image and ask "who is this?" or "where did you see this?", the skill will:

1. Open Yandex Images in browser
2. Upload the image to search
3. Extract and return matching results
4. Provide source URLs, descriptions, and context

**Advantages:**
- ✅ Free (no API costs)
- ✅ No registration required
- ✅ Excellent for face recognition
- ✅ Works well for identifying people, places, objects

---

## How It Works

### Browser-Based Search

Yandex Images has a built-in upload interface that works without any API:

1. Navigate to `https://yandex.com/images/`
2. Click the camera icon in the search bar
3. Upload the image file
4. Yandex processes and returns matches
5. Extract results from the page

### When to Use

- **Portrait photos** → Excellent face matching
- **Identifying objects** → Strong product recognition
- **Finding image sources** → Works better than Google for many cases
- **Places/landmarks** → Good geographic matching

---

## Usage

### Basic Reverse Search

```
User: "Who is this?" [sends image]
Agent: /yandex-search → Opens Yandex → Uploads image → Returns matches
```

### Detailed Search

```
User: "Where did you see this image?"
Agent: /yandex-search → Searches → Extracts all matching URLs → Lists sources with descriptions
```

### Combined with Context

```
User: "This photo shows a politician. Who is it?"
Agent: /yandex-search → Finds matches → Cross-references with known politicians → Returns answer
```

---

## Implementation

### 1. Browser Tool Integration

The skill uses OpenClaw's browser tool:

```javascript
// Pseudocode for Yandex reverse image search
async function yandexReverseSearch(imagePath) {
  // Open Yandex Images
  await browser.navigate('https://yandex.com/images/');
  
  // Click camera icon
  await browser.click('[aria-label="Search by image"]');
  
  // Upload image
  await browser.upload(imagePath);
  
  // Wait for results
  await browser.waitForSelector('.search-results');
  
  // Extract matches
  const results = await browser.extract('[result-item]');
  
  return results;
}
```

### 2. Image Upload

Yandex accepts images via:
- Direct file upload
- URL (if image is hosted online)

For local images, upload via file picker automation.

### 3. Result Parsing

Extract from Yandex results:
- Matching image URLs
- Source websites
- Similarity descriptions
- Related search terms

---

## Configuration

### Enable Browser Tool

Ensure browser tool is configured in `openclaw.json`:

```json
{
  "browser": {
    "enabled": true,
    "defaultProfile": "openclaw",
    "autoStart": false
  }
}
```

### Optional: Yandex Language

Set language for results:
- English: `https://yandex.com/images/`
- Spanish: `https://yandex.com/images/?lang=es`
- French: `https://yandex.com/images/?lang=fr`

---

## Example Workflow

**Step 1:** User sends image  
**Step 2:** Agent receives image at `/home/localadmin/.openclaw/media/inbound/xxx.png`  
**Step 3:** Agent runs `/yandex-search`  
**Step 4:** Browser opens Yandex Images  
**Step 5:** Image uploaded automatically  
**Step 6:** Results extracted  
**Step 7:** Agent returns answer: "This appears to be [Name] based on [Source]"

---

## Alternative: Third-Party APIs

If browser automation isn't available, consider these paid options:

| Service | Pricing | Free Tier |
|---------|---------|-----------|
| SerpApi (Yandex) | ~$70/month | Yes (30 searches) |
| SearchAPI (Yandex) | ~$30/month | Yes (100 searches) |
| ScrapingBee | Usage-based | Yes (5K credits) |

---

## Limitations

- **Browser required:** Need Chrome/Edge/Brave installed
- **Automation complexity:** File upload requires proper browser permissions
- **Rate limits:** Yandex may limit automated searches
- **CAPTCHA:** May trigger human verification

---

## Troubleshooting

### "No browser found" error
- Install Chrome, Edge, or Brave
- Ensure browser is in PATH

### Upload fails
- Check browser permissions for file access
- Verify image format (Yandex supports JPG, PNG, GIF, BMP, WEBP)

### Results incomplete
- Wait longer for Yandex to process
- Try URL-based search if image is hosted online

---

## See Also

- Yandex Images: https://yandex.com/images/
- Yandex Developer Docs: https://yandex.com/dev/
- Google Lens (alternative): Browser-based
- TinEye (paid): https://tineye.com/
