#!/bin/bash
# tower-info.sh — Look up tower info from SkyVector
# Usage: /tower-info <airport-code>

AIRPORT="$1"

if [ -z "$AIRPORT" ]; then
    echo "Usage: /tower-info <airport-code> (e.g., KBAD)"
    exit 1
fi

# Fetch SkyVector airport page
PAGE=$(curl -s "https://skyvector.com/airport/$AIRPORT")

# Extract tower frequency
TOWER=$(echo "$PAGE" | grep -oP "TOWER:\s*\K[0-9./ ]+|tower:\s*\K[0-9./ ]+" | head -1 | tr -d ' ')

# Extract ground frequency
GROUND=$(echo "$PAGE" | grep -oP "GROUND:\s*\K[0-9./ ]+|ground:\s*\K[0-9./ ]+" | head -1 | tr -d ' ')

# Extract ATIS
ATIS=$(echo "$PAGE" | grep -oP "ATIS:\s*\K[0-9.]+|ATIS:\s*\K[0-9./ ]+" | head -1 | tr -d ' ')

# Extract phone (military bases often have these)
PHONE=$(echo "$PAGE" | grep -oP "[0-9]{3}-[0-9]{3}-[0-9]{4}" | head -1)

# Extract location
CITY=$(echo "$PAGE" | grep -oP "Located \K[0-9 ]* [Mm][Ii][Ll][Ee][Ss] [A-Za-z ]+" | head -1)

echo "📡 $AIRPORT Tower Info:"
[ -n "$TOWER" ] && echo "  Tower: $TOWER MHz"
[ -n "$GROUND" ] && echo "  Ground: $GROUND MHz"
[ -n "$ATIS" ] && echo "  ATIS: $ATIS MHz"
[ -n "$PHONE" ] && echo "  Phone: $PHONE"
[ -n "$CITY" ] && echo "  Location: $CITY"

# Fallback if no data
if [ -z "$TOWER" ] && [ -z "$GROUND" ] && [ -z "$PHONE" ]; then
    echo "  ⚠️  No tower info found for $AIRPORT"
fi
