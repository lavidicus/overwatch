#!/bin/bash
# X (Twitter) Browser Tool
# Usage: ./x-tool.sh <action> [query/profile/url]
# Actions: search, profile, home, notifications

CREDENTIALS_FILE="$HOME/.openclaw/workspace/credentials/x.json"
BROWSER_PROFILE="$HOME/.openclaw/workspace/credentials/x-browser-profile"

# Check credentials
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "⚠️  X credentials not found. Run: ./x-tool.sh setup"
    exit 1
fi

USERNAME=$(cat "$CREDENTIALS_FILE" | jq -r '.username')
PASSWORD=$(cat "$CREDENTIALS_FILE" | jq -r '.password')
EMAIL=$(cat "$CREDENTIALS_FILE" | jq -r '.email')

ACTION="$1"
TARGET="$2"

case "$ACTION" in
    setup)
        echo "🔑 Set up X credentials"
        echo "Username/Email:"
        read -r USERNAME
        echo "Password:"
        read -rsp PASSWORD
        echo "Email (optional):"
        read -r EMAIL
        mkdir -p "$(dirname "$CREDENTIALS_FILE")"
        printf '{\n  "username": "%s",\n  "password": "%s",\n  "email": "%s"\n}\n' "$USERNAME" "$PASSWORD" "$EMAIL" > "$CREDENTIALS_FILE"
        echo "✅ Credentials saved to $CREDENTIALS_FILE"
        ;;
    
    search)
        QUERY="${TARGET:-$2}"
        ENCODED_QUERY=$(echo "$QUERY" | sed 's/ /+/g')
        echo "🔍 Searching X for: $QUERY"
        echo "URL: https://x.com/search?q=$ENCODED_QUERY"
        # Open browser with profile
        if command -v chromium-browser &> /dev/null; then
            chromium-browser --profile-dir="$BROWSER_PROFILE" "https://x.com/search?q=$ENCODED_QUERY" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome --profile-dir="$BROWSER_PROFILE" "https://x.com/search?q=$ENCODED_QUERY" &
        elif command -v firefox &> /dev/null; then
            firefox --profile "$BROWSER_PROFILE" "https://x.com/search?q=$ENCODED_QUERY" &
        else
            echo "⚠️  No browser found. Using web_fetch instead:"
            web_fetch "https://x.com/search?q=$ENCODED_QUERY"
        fi
        ;;
    
    profile)
        PROFILE="${TARGET:-$2}"
        # Remove @ if present
        PROFILE=$(echo "$PROFILE" | sed 's/^@//')
        echo "👤 Viewing profile: @$PROFILE"
        echo "URL: https://x.com/$PROFILE"
        if command -v chromium-browser &> /dev/null; then
            chromium-browser --profile-dir="$BROWSER_PROFILE" "https://x.com/$PROFILE" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome --profile-dir="$BROWSER_PROFILE" "https://x.com/$PROFILE" &
        elif command -v firefox &> /dev/null; then
            firefox --profile "$BROWSER_PROFILE" "https://x.com/$PROFILE" &
        else
            echo "⚠️  No browser found. Using web_fetch instead:"
            web_fetch "https://x.com/$PROFILE"
        fi
        ;;
    
    home)
        echo "🏠 Loading X home timeline"
        echo "URL: https://x.com/home"
        if command -v chromium-browser &> /dev/null; then
            chromium-browser --profile-dir="$BROWSER_PROFILE" "https://x.com/home" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome --profile-dir="$BROWSER_PROFILE" "https://x.com/home" &
        elif command -v firefox &> /dev/null; then
            firefox --profile "$BROWSER_PROFILE" "https://x.com/home" &
        else
            echo "⚠️  No browser found. Using web_fetch instead:"
            web_fetch "https://x.com/home"
        fi
        ;;
    
    notifications)
        echo "🔔 Loading X notifications"
        echo "URL: https://x.com/notifications"
        if command -v chromium-browser &> /dev/null; then
            chromium-browser --profile-dir="$BROWSER_PROFILE" "https://x.com/notifications" &
        elif command -v google-chrome &> /dev/null; then
            google-chrome --profile-dir="$BROWSER_PROFILE" "https://x.com/notifications" &
        elif command -v firefox &> /dev/null; then
            firefox --profile "$BROWSER_PROFILE" "https://x.com/notifications" &
        else
            echo "⚠️  No browser found. Using web_fetch instead:"
            web_fetch "https://x.com/notifications"
        fi
        ;;
    
    *)
        echo "Usage: $0 <action> [target]"
        echo "Actions:"
        echo "  setup        - Set up X credentials"
        echo "  search <q>   - Search X for query"
        echo "  profile <u>  - View profile @username"
        echo "  home         - Load home timeline"
        echo "  notifications - Load notifications"
        echo ""
        echo "Current credentials:"
        echo "  Username: $USERNAME"
        echo "  Email: $EMAIL"
        ;;
esac
