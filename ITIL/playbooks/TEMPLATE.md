# ITIL Playbook Template

---
**Author:** [Name]
**Created:** YYYY-MM-DD
**Last Updated:** YYYY-MM-DD
**Version:** 1.0
**Tags:** [tag1, tag2, tag3]
---

## Overview

Brief description of what this playbook covers, when to use it, and why it matters. Maximum 2-3 sentences.

## Priority

**P1/P2/P3** — Brief justification

- **P1** — Critical infrastructure, immediate response required
- **P2** — Important, affects services but not critical path
- **P3** — Minor impact, can be addressed during normal hours

## Category

**Incident Response / Change Management / Operations**

- **Incident Response** — Emergency recovery procedures
- **Change Management** — Planned modifications with rollback
- **Operations** — Ongoing maintenance and monitoring

## Estimated Duration

- **Total:** ~XX minutes
- **Critical path:** ~XX minutes (steps 1-X)
- **Notes:** Any variables that affect timing

## Communication

- **Before starting:** Notify [team/channel]
- **After completion:** Update [ticket/status page]
- **If blocked >15 min:** Escalate to [person]

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | High/Med/Low | [Mitigation] |
| [Risk 2] | High/Med/Low | [Mitigation] |

## Prerequisites

- Required access (root, specific user, console)
- Required tools installed
- Required information (IPs, passwords, VMIDs)
- Any dependencies on other systems or procedures

## Status Checks

Quick commands to verify current state before proceeding.

```bash
# Example: Check service status
systemctl status service-name

# Example: Verify connectivity
ping <target>
```

## Procedure

### Step 1: Description

Detailed instructions with commands, explanations, and expected output.

```bash
# Command to run
# With comments explaining parameters
```

**Expected output:**
```
What success looks like
```

### Step 2: Description

Continue with numbered steps in logical order.

### Step 3: Description

Include sub-steps as needed:

1. Sub-step 1
2. Sub-step 2

**Decision Points:** Use when procedure branches

**If [condition A] →** Go to Step 3A
**If [condition B] →** Go to Step 3B

## Verification

Commands to confirm the procedure completed successfully.

```bash
# Verification command
# Expected output
```

## Common Issues

### Issue Title

**Symptoms:**
- What you see when this goes wrong

**Diagnosis:**

```bash
# Commands to identify the problem
```

**Resolution:**

```bash
# Commands to fix it
```

### Issue Title

Repeat for other common issues.

## Rollback

How to undo this procedure if it fails or needs to be reversed.

```bash
# Rollback commands
```

## Related Playbooks

- [[playbook-name.md]] — Related procedure
- [[another-playbook.md]] — Another related procedure

## Notes

- Important caveats
- Platform-specific considerations
- Known limitations
- References to external documentation
