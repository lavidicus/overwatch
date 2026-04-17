#!/bin/bash
# Memory archival script for Lucas
# Run via: ssh lucas@lucas bash /tmp/lucas-memory-archival.sh

cat > /home/lucas/.openclaw/workspace/MEMORY.md << 'ENDMEMORY'
# MEMORY.md — Lucas (long-term memory / seed facts)

Created: 2026-03-10 UTC
Owner: Lavid

## 1) Primary responsibilities
- Security architecture reviews for critical services.
- Draft & maintain NIST SP 800-series-based policies and compliance mappings.
- Vendor risk assessments and contract security clauses.
- ITIL-aligned incident & change playbooks.
- Disaster recovery runbooks and exercises.

## 2) Trust & boundaries
- Do not commit secrets to repo; store references to secrets in approved vaults only.
- All external actions require plan + approval by Lavid (or approved delegates).
- Signal-cli work is forbidden (per Lavid). Avoid proposing or using it.

## 3) Approved references (seed documents)
- NIST Special Publication 800-53 (and applicable 800-series docs — locate via web_fetch/pdf)
- NIST SP 800-37 (RMF), 800-30 (risk assessment), 800-61 (incident response), 800-171 (CUI)
- FDIC guidance (vendor management and incident response) — add canonical URLs
- SOX compliance guidance for IT controls (segregation, change control, logging)
- Internal playbooks located at /home/localadmin/.openclaw/workspace/playbooks/
  - ITIL incident & change templates
  - Disaster recovery templates (playbooks/DR-*)
  - Vendor management templates (playbooks/vendor-*)

## 4) Contacts & escalation
- Primary approver: Lavid — Matrix @lavid:comms.9xc.io
- Secondary approver: Sam — Matrix @sam:comms.9xc.io
- Legal/compliance contact: TBD (add when available)

## 5) Recent context / starting tasks
- Seed the workspace with:
  - policy-drafts/nist-800-series/ (initial skeleton)
  - compliance-mappings/FDIC-SOX/ (initial checklist templates)
  - playbooks/incident-response/ (ITIL-conformant templates)
- Priority 1: create an incident response runbook for critical services and map to NIST SP 800-61.
- Priority 2: vendor assessment template for third-party cloud providers (map to FDIC vendor guidance).
- Priority 3: SOX controls checklist for change control, user access reviews, and logging.

## 6) Logging & audit
- All plan approvals, commits, and pushes will be logged to /home/localadmin/.openclaw/workspace/agents/lucas/logs/
- Keep a MEMORY.md audit entry whenever a plan is approved and executed (date, approver, action summary).

## 7) Policy & decision defaults
- Default retention for logs: 90 days (unless regulatory requirement demands longer).
- Default disaster recovery RTO targets: customer-facing critical services — 4 hours; internal non-critical — 24 hours (subject to business alignment).
- Default incident severity mapping: ITIL/Priority mapping to be documented in playbooks.

## 8) User profile: Jeremy (Lavid)
- Name / Handle: Jeremy (nickname: Lavid)
- Role: Information Security Officer, Red River Bank (Alexandria, LA)
- Tenure: 9 years at the bank
- Background: Former UNIX systems administrator with extensive experience in hardware, networking, multi-level OSes, and Oracle databases.
- Certifications: ITIL Foundation (2016), ISACA CISA (2016), ISC2 CISSP (2016), Microsoft Server 2012 MCSE (2016)
- Environment: FDIC & SOX regulated; quarterly audits (FDICIA, IT, SOX)
- Org: ~350 employees, ~27 branches; HQ Alexandria, LA; DR/BC site in West Monroe, LA (FISC / FIS Horizon hosting)
- Infrastructure notes: ~750 systems connected to on-prem ESXi virtual environment running Windows Active Directory supporting branches.
- Approver / Primary contact: Lavid — Matrix @lavid:comms.9xc.io

## 9) Key Personnel Master List
- Erik Cain — IT Director
- Jeremy Ingalls — ISO (Information Security Officer)
- Aaron Nation — Chief Information & Data Officer (CIDO)
- Edwin Lagarde — Chief Innovation Officer (CIO)
- Thomas Brothers — Chief Internal Auditor
- Jeni Gilchrist — Sr. Compliance Executive
- Allison Johnson — General Counsel / Vendor Management
- Tammi Salazar — COO
- Blake Chatelain — CEO
- Jason Roy — Network Administrator
- Kyle Fricke — Network Tech (DLP, Zscaler, quarterly audits)
- Corey Primeaux, Brandon Lutz — Network Techs
- Austin Steepleton — Operations
- Sandy Mayeaux — Loan Operations Manager
- Melissa Fausphoul — Financial Operations Manager
- David LaBorde — SEC Reporting Manager
- Steve Osman — Controls and SOX Coordinator
- Amy Whitney — AML/CFT Officer
- Andy Cutrer — HR Director / SAFE Act Officer
- Debbie Dean — Deposit Operations Supervisor
- April Barr — ADP system admin

## 10) Critical Vendor Program (as of 2026-03-11)
Source: CapinTech annual vendor due diligence review
Total vendors reviewed: 26
Risk distribution: 9 HIGH, 13 MEDIUM, 4 LOW

### HIGH RISK (9)
- FISC — Core processor; MOVEit breach + 4 lawsuits; pen test vulns
- Finastra Corporate — Going concern; active data breach Nov 2024; net loss $363M
- Finastra LaserPro — Loan processing; inherits corporate risk
- Ingalls/C3 — SOC/MDR partner; no security docs; no cyber insurance
- LPL Financial — Non-responsive; stale data; recurring SOC exceptions
- MeridianLink — Material weakness in internal controls
- NCR Atleos — ATM fleet; no SOC report; no cyber insurance
- CSPI (Aurora) — No SOC report; BC/DR testing unknown
- emerie.ai — No financials; won't release security docs; expired insurance

### MEDIUM RISK (13)
- Allied Payment Network, ADP, Computershare, FIS Corporate, FIS eWire, FIS Image Solutions, FNBB, Okta, Passageways (OnBoard), Q2 Software, Raymond James, Smartsheet, Verafin (Nasdaq)

### LOW RISK (4)
- AvidXchange (BankTEL), FIS Debit Products, FIS Digital One, ICE Mortgage Technology (Encompass)

### Key Vendor Program Risks
- Supply chain is #1 org risk (per Risk Assessment 2025)
- 4 vendors have no SOC report; 5 no/expired cyber insurance; 12+ withheld pen test results
- 3 MOVEit victims provided no breach response documentation
- AI governance gap: Verafin and emerie.ai use AI but no AI governance framework

### Vendor Documents in Vault
- Compliance/Vendor_Due_Diligence_2025.md — full Markdown analysis with board recommendations
- Compliance/Vendor_Due_Diligence_2025.csv — structured data (26 vendors, risk levels, all findings)
- Compliance/vendor-reviews/originals/ — 29 original DOCX files
- Compliance/Critical_Vendors.csv — GLBA critical vendor catalog (24 vendors)
- Compliance/Vendor_RARs_2025.md — consolidated index of 18 ISO Risk Assessment Reports

## 11) SOX SOC Report Evaluations Program
- Batch 1 received: 9 evaluations (Abrigo, ADP, AvidXchange, FIS eWire, FIS Horizon, FISC, Microsoft Azure, Raymond James)
- New vendor: Abrigo (Banker's Toolbox — CECL modeling, credit loss, investment accounting)
- Notable exceptions: ADP (4), Microsoft Azure (multiple), Raymond James (1)
- All exceptions accepted by RRB with documented rationale
- Stored at: `larrb/Compliance/sox-evaluations/`

## 12) Policy Ingestion — Batch 2 (2026-03-12)
- 24 Board-approved policies ingested (2 updates, 22 new)
- Full series: IS 50001-50012, Compliance 60001-60025
- Policy_Index.md created as master reference table
- Approver: Lavid (approved via Matrix 2026-03-12 14:00 UTC)

## 13) Systems Inventory (2026-03-12)
- 727 unique systems: 604 in both S1+SD, 72 S1-only, 51 SD-only (no EDR)
- 679 SentinelOne endpoints | 698 Service Desk CMDB entries
- 3 Windows 7 DVRs (SWDVR, PROVENANCEDVR, ESSENLENDINGDVR) — critical EOL
- 29 Server 2016 (EOL Jan 2027), 52 Win 10 (past EOL)
- 4,871 software entries, 2,838 distinct titles
- 8+ remote access tools identified (consolidation needed)

## 14) POA&M Status
- 26 items (1 Critical, 9 High, 14 Medium, 1 Low, 1 existing Low)
- POA-011: Carmen Lemons account still ENABLED 7 days post-term (CRITICAL)
- Other items: EDR gaps, CMDB gaps, Win7 DVRs, remote access sprawl, IE11, EOL software

## 15) Technical Learnings
- .xls files need LibreOffice conversion (xlrd won't handle them)
- Image/scanned PDFs require pdftoppm + tesseract OCR pipeline
- UTF-16-LE HTML files disguised as .mp3 (GPO exports) — detect via BOM
- AD SamAccountName 20-char truncation causes match failures
- CSV BOM (utf-8-sig encoding) required for AD exports
- XFA-based interactive PDF forms not extractable via pdftotext
- Queue overflow drops messages when processing large batches — need resend protocol

---

End of seed memory.
Full commit logs and detailed session records available in memory/ directory.
ENDMEMORY

echo "MEMORY.md has been updated to $(wc -c < /home/lucas/.openclaw/workspace/MEMORY.md) bytes"
