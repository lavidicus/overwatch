# tower-info — SkyVector Tower Info Lookup

**Skill:** `tower-info`  
**Location:** `skills/tower-info/`  
**Trigger:** `/tower-info <airport-code>`  
**Example:** `/tower-info KBAD`

---

## What It Does

Looks up tower frequencies and phone numbers for any airport via SkyVector.

## Usage

```bash
/tower-info KBAD
/tower-info KSHV
/tower-info KJFK
```

## Features

- ✅ Tower frequency (MHz)
- ✅ Ground frequency (MHz)  
- ✅ ATIS frequency (MHz)
- ✅ Phone numbers (military bases, airports)
- ✅ Location/city

## Example Output

```
📡 KBAD Tower Info:
  Tower: 128.25 / 278.3 MHz
  Ground: 121.8 / 253.5 MHz
  ATIS: 307.025 MHz
  Phone: 318-456-3226
  Location: 3 miles E of Bossier City, Louisiana
```

## Implementation

**Script:** `scripts/tower-info.sh`  
**Doc:** `SKILL.md`

Fetches SkyVector airport page, extracts tower/ground/ATIS frequencies and phone numbers using grep patterns.

## Known Airports

| Code | Name | Phone |
|------|------|-------|
| KBAD | Barksdale AFB | 318-456-3226 |
| KSHV | Shreveport Regional | - |
| KDTN | Shreveport Downtown | - |

## Notes

- SkyVector data sourced from FAA (updated weekly)
- Military airports may have restricted comms
- Phone numbers only listed for some airports
- Frequency formats: `primary ; secondary` (split frequencies)
