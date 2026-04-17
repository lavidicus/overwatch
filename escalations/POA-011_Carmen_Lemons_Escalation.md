# Escalation: POA-011 Carmen Lemons AD Accounts (CRITICAL)

**Date:** 2026-04-14  
**Priority:** CRITICAL (32 days overdue)  
**Reference:** POA-011, SOX AC-2 violation

---

## Email Draft

**To:** Jason Roy (Network Administrator), Corey Primeaux, Brandon Lutz (Network Techs)  
**Cc:** Erik Cain (IT Director), Lavid (ISO)  
**Subject:** URGENT: SOX Compliance Violation - Carmen Lemons AD Accounts Still Active (32 Days Overdue)

---

**Team,**

**CRITICAL SECURITY FINDING** - Immediate action required:

**Issue:**
AD accounts for **Carmen Lemons** (`clemons`, `madams`) remain **ACTIVE** despite employee being terminated on **2026-03-05**. As of today (2026-04-14), these accounts have been active for **32 days** without access review.

**Impact:**
- **SOX AC-2 Violation** - Unrevoked user access to critical systems
- **Audit Finding POA-011** - Currently **OVERDUE by 32 days** (target date: 2026-03-13)
- **Security Risk:** Unauthorized access possible; data exposure risk
- **Compliance Risk:** FDIC/SOX audit failure

**Required Actions (Immediate):**
1. **DISABLE** AD accounts `clemons` and `madams` immediately
2. **REVOKE** all active sessions and tokens
3. **VERIFY** no unauthorized access occurred during 32-day window
4. **DOCUMENT** remediation for audit evidence

**Evidence:**
- HR terminated: 2026-03-05
- POA&M finding created: 2026-03-12
- Days overdue: 32 (target was 2026-03-13)
- Reference: `/larrb/revisions/poam/POAM_tracker.csv` (POA-011 row)

**Timeline:**
- **TODAY (2026-04-14):** Accounts disabled, sessions terminated
- **END OF DAY:** Verification completed, documented
- **NEXT AUDIT PREP:** Evidence packet updated

**Approval Required:**
Lavid (ISO) - Please confirm this escalation meets compliance requirements. I'll need your signature on the remediation documentation for the audit trail.

**Next Steps:**
Once disabled, I'll help you:
1. Generate access revocation evidence for the audit
2. Update POA-011 status to "Closed" with documentation
3. Review if similar terminations need immediate audit

---

**This is urgent - please confirm receipt and action plan by EOD today.**

---

## Approval Status

- [ ] Content reviewed and approved by Sam (@sam:comms.9xc.io)
- [ ] ISO approval obtained from Lavid
- [ ] Email sent to recipients
- [ ] Response received and documented

## Post-Sent Notes

- Sent: __________
- Recipients acknowledged: __________
- Accounts disabled: __________
- Verification completed: __________
- POA-011 closed: __________

---

**Document created:** 2026-04-14 15:15 UTC  
**Source:** Lucas (@lucas:comms.9xc.io) self-improvement session
