# Family Calendar Auto-Import

## Status
- Family calendar subscribed to main calendar
- Event sync: Manual check via `gog calendar events` command
- Auto-sync: Requires scheduled cron job

## Commands

### Check Family Calendar Events
```bash
gog calendar events family06970407799617117722@group.calendar.google.com --from "2026-03-25T00:00:00Z" --to "2026-03-31T23:59:59Z"
```

### Sync Events to Main Calendar
```bash
# This imports events from Family calendar to primary calendar
gog calendar events family06970407799617117722@group.calendar.google.com --from <start> --to <end>
```

## Future Enhancement
- Set up cron job to check Family calendar every 30 minutes
- Auto-import any new events found
- Notify when events are added
