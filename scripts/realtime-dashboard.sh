#!/bin/bash
# Quick access to real-time systems dashboard

DASHBOARD_URL="http://localhost:3000"
SERVICE_FILE="$HOME/.openclaw/workspace/skills/daily-systems-status/realtime-dashboard.service"

case "$1" in
    start)
        echo "Starting real-time dashboard server..."
        if pgrep -f 'node server.js' > /dev/null; then
            echo "✅ Dashboard already running on port $PORT"
        else
            cd ~/.openclaw/workspace/skills/daily-systems-status && \
            nohup node server.js > ~/.openclaw/logs/realtime-dashboard.log 2>&1 &
            sleep 2
            if pgrep -f 'node server.js' > /dev/null; then
                echo "✅ Dashboard started at $DASHBOARD_URL"
            else
                echo "❌ Failed to start dashboard"
                tail -10 ~/.openclaw/logs/realtime-dashboard.log
            fi
        fi
        ;;
    stop)
        echo "Stopping real-time dashboard server..."
        pkill -f 'node server.js' && echo "✅ Dashboard stopped" || echo "✅ Dashboard was not running"
        ;;
    restart)
        echo "Restarting real-time dashboard server..."
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if pgrep -f 'node server.js' > /dev/null; then
            echo "✅ Dashboard is running at $DASHBOARD_URL"
            echo "🔄 Updates every 30 seconds via WebSocket"
            echo "📊 Access: open $DASHBOARD_URL in browser"
        else
            echo "❌ Dashboard server is not running"
            echo "💡 Start with: realtime-dashboard.sh start"
        fi
        ;;
    logs)
        echo "Dashboard logs (tail -50):"
        tail -50 ~/.openclaw/logs/realtime-dashboard.log 2>/dev/null || echo "No logs found"
        ;;
    *)
        echo "Real-time Systems Dashboard Control"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Examples:"
        echo "  $0 start          # Start the dashboard server"
        echo "  $0 stop           # Stop the dashboard server"
        echo "  $0 restart        # Restart the dashboard server"
        echo "  $0 status         # Check if server is running"
        echo "  $0 logs           # View server logs"
        echo ""
        echo "Dashboard URL: $DASHBOARD_URL"
        echo "Updates every: 30 seconds"
        ;;
esac
