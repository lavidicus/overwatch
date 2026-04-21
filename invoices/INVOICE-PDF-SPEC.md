# Monthly Olla Invoice PDF Generator

**Schedule:** 1st of each month at 09:00 UTC  
**Action:** Generate PDF invoice and email to user

**Steps:**
1. Read daily cost tracking file
2. Calculate monthly totals
3. Generate PDF invoice using pandoc
4. Attach PDF to email

**PDF Settings:**
- Format: PDF with proper formatting
- Engine: xelatex (or wkhtmltopdf fallback)
- Margins: 1 inch
- Includes: Full cost breakdown, cloud comparisons, projections

**Output:**
- PDF: `/home/localadmin/.openclaw/workspace/invoices/INV-2026-MM-001.pdf`
- Email attachment: Yes
- Markdown backup: `/home/localadmin/.openclaw/workspace/invoices/INV-2026-MM-001.md`

---

*Last updated: 2026-04-05 21:15 UTC*
