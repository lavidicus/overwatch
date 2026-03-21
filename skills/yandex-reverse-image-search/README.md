# Yandex Reverse Image Search Skill

**Free reverse image search using Yandex Images**  
**No API key required**  
**Created:** 2026-03-20

---

## Quick Start

### Installation

1. Copy files to OpenClaw skills directory:
```bash
mkdir -p ~/.npm-global/lib/node_modules/openclaw/skills/yandex-reverse-image-search
cp -r . ~/.npm-global/lib/node_modules/openclaw/skills/yandex-reverse-image-search/
```

2. Restart OpenClaw gateway:
```bash
openclaw gateway stop && sleep 2 && openclaw gateway start
```

### Usage

Once installed, you can use the skill in two ways:

**Method 1: Direct command**
```
/yandex-search <image-path>
```

**Method 2: Natural language**
- "Reverse search this image"
- "Who is this?" (when an image is sent)
- "Find where this photo appeared online"

---

## How It Works

1. **Opens browser** → Chrome/Brave/Edge via OpenClaw
2. **Navigates to Yandex Images** → https://yandex.com/images/
3. **Clicks camera icon** → Upload mode activated
4. **Uploads image** → File uploaded to Yandex
5. **Extracts results** → Matches, similar images, sources
6. **Returns answer** → Formatted results

---

## Features

✅ **Free** - No API costs or registration  
✅ **Face recognition** - Excellent at identifying people  
✅ **Object search** - Strong product/object matching  
✅ **Source finding** - Finds where images appeared online  
✅ **Multi-language** - Works with images from any country  

---

## Requirements

- **Browser:** Chrome, Edge, or Brave installed
- **OpenClaw:** Latest version with browser tool
- **File access:** Browser needs permission to access local files

---

## Example Usage

### Scenario 1: Identify a Person
```
User sends: Photo of politician
You: "Who is this?"
Agent: /yandex-search → Returns: "This appears to be [Name], a [Position] from [Country]"
```

### Scenario 2: Find Image Source
```
User sends: Viral image
You: "Where did you see this image?"
Agent: /yandex-search → Returns: "Found on [Website1], [Website2], [Website3]"
```

### Scenario 3: Identify Object
```
User sends: Product photo
You: "What is this?"
Agent: /yandex-search → Returns: "This appears to be [Product Name] by [Manufacturer]"
```

---

## Files

- `SKILL.md` - Skill documentation (this file)
- `index.js` - Main implementation
- `yandex-reverse-image-search.js` - Standalone CLI tool
- `README.md` - This file

---

## Troubleshooting

### "Browser not found"
- Install Chrome, Edge, or Brave
- Ensure browser is in system PATH

### "Upload failed"
- Check file path is correct
- Verify image format (JPG, PNG, GIF, BMP, WEBP)

### "No results found"
- Yandex may not have indexed this image
- Try Google Images or TinEye as alternatives

### "Permission denied"
- Grant browser file access permissions
- Run as user with file access rights

---

## Alternatives

| Service | Cost | Best For |
|---------|------|----------|
| **Yandex** | Free | Face recognition, general search |
| Google Lens | Free | Objects, text, places |
| TinEye | Paid | Exact duplicates, copyright |
| Bing Visual Search | Free | Product search |

---

## Development

### Testing Locally

```bash
node yandex-reverse-image-search.js /path/to/image.jpg
```

### Updating Yandex Selector

If Yandex changes their UI, update the selector in `index.js`:
```javascript
// Find the correct aria-label for Yandex camera icon
await browser({
  action: 'snapshot',
  refs: 'aria'
});
// Update ref: 'search-by-image' to match new structure
```

---

## License

MIT License - Free for personal and commercial use

---

## See Also

- [Yandex Images](https://yandex.com/images/)
- [Yandex Developer](https://yandex.com/dev/)
- [OpenClaw Browser Tool](https://docs.openclaw.ai/tools/browser)
