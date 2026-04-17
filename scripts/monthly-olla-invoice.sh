#!/bin/bash
# Monthly Olla Invoice PDF Generator

echo "📊 Generating Monthly Olla Invoice PDF..."

# Define paths
INVOICE_MD="/home/localadmin/.openclaw/workspace/invoices/INV-2026-04-001.md"
INVOICE_PDF="/home/localadmin/.openclaw/workspace/invoices/INV-2026-04-001.pdf"
SCRIPT="/home/localadmin/.openclaw/workspace/scripts/convert-invoice-to-pdf.sh"

# Check if invoice markdown exists
if [ ! -f "$INVOICE_MD" ]; then
    echo "⚠️  Invoice markdown not found: $INVOICE_MD"
    echo "Creating placeholder invoice..."
    
    # Create placeholder invoice
    cat > "$INVOICE_MD" << 'EOF'
# OpenClaw Local Model Invoice

**Invoice Date:** April 2026  
**Billing Period:** April 1-30, 2026  
**Invoice ID:** INV-2026-04-001

---

## Usage Summary

**Model:** Ollama LlamaCPP (Local GPU Inference)  
**Tokens Processed:** TBD  
**Total Cost:** TBD  
**Savings vs Cloud:** TBD

---

*Invoice generated: 2026-04-01 09:00 UTC*
EOF
fi

# Run PDF conversion
if [ -f "$SCRIPT" ]; then
    bash "$SCRIPT"
    PDF_STATUS=$?
else
    echo "⚠️  PDF conversion script not found"
    PDF_STATUS=1
fi

# Send notification
if [ $PDF_STATUS -eq 0 ]; then
    echo "✅ PDF generated successfully: $INVOICE_PDF"
    echo "📧 Invoice ready for email delivery"
    
    # Send message to Matrix
    message "📊 **Monthly Olla Invoice PDF**\n\n✅ Generated: INV-2026-04-001.pdf\n📄 Markdown: INV-2026-04-001.md\n📧 Ready to send to email\n\n*See full invoice in workspace/invoices/*"
else
    echo "❌ PDF generation failed"
fi
