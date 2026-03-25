# tower-info — SkyVector Airport Communication Lookup

**Skill ID:** `tower-info`  
**Description:** Look up tower frequencies and phone numbers for airports via SkyVector  
**Trigger:** `/tower-info <airport-code>` (e.g., `/tower-info KBAD`)

---

## Usage

```bash
/tower-info KBAD
/tower-info KBOS
/tower-info KJFK
```

Returns:
- Tower frequency (MHz)
- Ground frequency (MHz)
- Tower phone number (if available)
- ATIS frequency (if available)
- Location/city/state

---

## Implementation

```bash
#!/bin/bash
# tower-info.sh — Look up airport tower info from SkyVector
# Usage: /tower-info KBAD

AIRCRAFT_CODE="$1"

if [ -z "$AIRCRAFT_CODE" ]; then
    echo "Usage: /tower-info <airport-code>"
    exit 1
fi

URL="https://skyvector.com/airport/$AIRCRAFT_CODE"
DATA=$(curl -s "$URL" | grep -A 100 "Airport Communications" | grep -i "tower\|ground\|atis" | head -20)

# Extract tower frequency
TOWER_FREQ=$(echo "$DATA" | grep -oP "BARKSDALE TOWER:\s*\K[0-9.]+|Tower:\s*\K[0-9.]+|TOWER:\s*\K[0-9.]+")

# Extract ground frequency  
GROUND_FREQ=$(echo "$DATA" | grep -oP "GROUND:\s*\K[0-9.]+|GND:\s*\K[0-9.]+")

# Extract tower phone
TOWER_PHONE=$(curl -s "https://skyvector.com/airport/$AIRCRAFT_CODE" | grep -oP "318-\d{3}-\d{4}|318-\d{3}-\d{5}")

echo "📡 $AIRCRAFT_CODE Tower Info:"
[ -n "$TOWER_FREQ" ] && echo "  Tower: $TOWER_FREQ MHz"
[ -n "$GROUND_FREQ" ] && echo "  Ground: $GROUND_FREQ MHz"
[ -n "$TOWER_PHONE" ] && echo "  Phone: $TOWER_PHONE"
```

---

## Example Output

```
📡 KBAD Tower Info:
  Tower: 128.25 / 278.3 MHz
  Ground: 121.8 / 253.5 MHz
  ATIS: 307.025 MHz
  Phone: 318-456-3226
```

---

## Notes

- SkyVector uses FAA data, updated weekly
- Military airports may have restricted comms
- Some airports don't list phone numbers
- Frequency formats: `primary ; secondary` for split frequencies

---

## SKILL.md

```markdown
# tower-info Skill

**Usage:** `/tower-info <airport-code>`  
**Example:** `/tower-info KBAD`

Look up tower frequencies and contact info for any airport via SkyVector.

## Features
- Tower/Ground frequencies (MHz)
- ATIS frequency
- Phone numbers (when available)
- Location/city/state

## Known airports
- KBAD: Barksdale AFB (318-456-3226)
- KSHV: Shreveport Regional
- KDTN: Shreveport Downtown

## Limitations
- Phone numbers not always listed
- Military bases may have restricted access
- Data sourced from SkyVector (FAA)
```
