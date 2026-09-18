import sys

with open("src/tools/markdown-studio.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Update Print CSS
old_css = """  /* Print Stylesheet for Academic Papers */
  @media print {
    body * {
      visibility: hidden;
    }
    .preview-content, .preview-content * {
      visibility: visible;
    }
    .preview-content {
      position: absolute;
      left: 0;
      top: 0;
      width: 100% !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #111827 !important;
      font-size: 12pt !important;
      line-height: 1.6 !important;
    }"""

new_css = """  /* Print Stylesheet for Academic Papers */
  @media print {
    @page { 
      margin: 0; /* Kills browser URL, Date, and Page Number watermarks */
      size: auto;
    }
    body { background: #fff !important; }
    
    /* Hide the entire app UI during print */
    body > *:not(#pdfPrintTable) {
      display: none !important;
    }
    
    .preview-content {
      position: relative !important;
      width: 100% !important;
      padding: 0 2.54cm !important; /* 1-inch side margins */
      background: #ffffff !important;
      color: #111827 !important;
      font-size: 12pt !important;
      line-height: 1.6 !important;
      overflow: visible !important;
      height: auto !important;
    }"""

if old_css in html:
    html = html.replace(old_css, new_css)
else:
    print("Could not find print css")
    sys.exit(1)


# 2. Add beforeprint/afterprint JS
old_js = """  // Print / PDF
  printPdfBtn.addEventListener('click', () => {
    window.print();
  });"""

new_js = """  // Print / PDF
  let printOriginalParent, printNextSibling, pdfPrintTable;

  window.addEventListener('beforeprint', () => {
    const content = document.getElementById('previewOutput');
    if (!content) return;
    
    printOriginalParent = content.parentNode;
    printNextSibling = content.nextSibling;
    
    pdfPrintTable = document.createElement('table');
    pdfPrintTable.id = 'pdfPrintTable';
    pdfPrintTable.style.width = '100%';
    pdfPrintTable.style.border = 'none';
    pdfPrintTable.style.borderCollapse = 'collapse';
    pdfPrintTable.style.margin = '0';
    pdfPrintTable.style.padding = '0';
    
    // Academic 1-inch top margin
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><td><div style="height: 2.54cm;"></div></td></tr>';
    
    // Academic 1-inch bottom margin
    const tfoot = document.createElement('tfoot');
    tfoot.innerHTML = '<tr><td><div style="height: 2.54cm;"></div></td></tr>';
    
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.style.padding = '0';
    
    tr.appendChild(td);
    tbody.appendChild(tr);
    pdfPrintTable.appendChild(thead);
    pdfPrintTable.appendChild(tbody);
    pdfPrintTable.appendChild(tfoot);
    
    // Move the actual document content into the print table structure
    td.appendChild(content);
    document.body.appendChild(pdfPrintTable);
  });

  window.addEventListener('afterprint', () => {
    const content = document.getElementById('previewOutput');
    if (!content || !pdfPrintTable) return;
    
    // Restore DOM to original app state
    if (printNextSibling) {
      printOriginalParent.insertBefore(content, printNextSibling);
    } else {
      printOriginalParent.appendChild(content);
    }
    document.body.removeChild(pdfPrintTable);
  });

  printPdfBtn.addEventListener('click', () => {
    window.print();
  });"""

if old_js in html:
    html = html.replace(old_js, new_js)
else:
    print("Could not find print JS")
    sys.exit(1)

with open("src/tools/markdown-studio.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Updated markdown-studio.html")

