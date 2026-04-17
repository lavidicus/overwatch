#!/bin/bash
# Convert invoice markdown to PDF

INVOICE_FILE="/home/localadmin/.openclaw/workspace/invoices/INV-2026-0405-001.md"
PDF_FILE="/home/localadmin/.openclaw/workspace/invoices/INV-2026-0405-001.pdf"

# Check if pandoc is available
if command -v pandoc &> /dev/null; then
    pandoc "$INVOICE_FILE" -o "$PDF_FILE" --pdf-engine=xelatex -V geometry:margin=1in
    echo "✅ PDF created: $PDF_FILE"
else
    # Fallback: use wkhtmltopdf if available
    if command -v wkhtmltopdf &> /dev/null; then
        # Convert markdown to HTML first
        pandoc "$INVOICE_FILE" -o /tmp/invoice.html 2>/dev/null || cp "$INVOICE_FILE" /tmp/invoice.html
        wkhtmltopdf /tmp/invoice.html "$PDF_FILE"
        echo "✅ PDF created: $PDF_FILE (via wkhtmltopdf)"
    else
        # Create simple PDF with text (basic approach)
        echo "⚠️  PDF engine not found. Install pandoc or wkhtmltopdf for PDF conversion."
        echo "📄 Markdown invoice: $INVOICE_FILE"
    fi
fi
