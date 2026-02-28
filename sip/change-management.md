# Change Management Program

## Purpose
This program provides a lightweight, auditable process for all configuration changes to the OpenClaw workspace. Every change must be:

1. **Planned** – a change ticket is created and approved.
2. **Documented** – the ticket is referenced in the SIP log.
3. **Verified** – the change is tested and rolled back if it fails.
4. **Reviewed** – the ticket is closed and the outcome is recorded.

The goal is to keep a clear history of *what* changed, *why*, *how*, and *who approved*.

## Workflow

| Step | Action | Where to record |
|------|--------|-----------------|
| 1 | Create a change ticket | `sip/CHANGE_TICKETS.md` (Markdown table) |
| 2 | Perform the change (use the provided scripts) | – |
| 3 | Log the change in `sip/log.md` | – |
| 4 | Verify the change | – |
| 5 | Close the ticket | Mark `status: closed` in `CHANGE_TICKETS.md` |

## Ticket Format
Add a new row to `sip/CHANGE_TICKETS.md` using the following columns:

- **ID** – auto‑incremented integer.
- **Date** – YYYY‑MM‑DD.
- **Requester** – who requested the change.
- **Description** – short summary.
- **Status** – `open`, `in-progress`, `approved`, `closed`.
- **Notes** – any additional info.

Example row:
```
| 5 | 2026-02-27 | Jeremy | Update OpenClaw heartbeat target | approved | Updated to `signal`.
```

## Scripts

* `sip/track_config_change.sh` – logs a config change and creates a ticket.
* `sip/close_ticket.sh` – marks a ticket as closed.

These scripts are intentionally lightweight; they do not enforce policy but provide a clear audit trail.
