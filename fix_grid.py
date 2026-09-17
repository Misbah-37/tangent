import re

# Resume Builder Fix
with open("src/tools/resume-builder.html", "r", encoding="utf-8") as f:
    content = f.read()

old_css = """  @media (max-width: 1024px) {
    .studio-layout {
      grid-template-columns: 1fr;
    }
  }"""
new_css = """  @media (max-width: 1024px) {
    .studio-layout {
      grid-template-columns: 1fr;
    }
    .input-grid {
      grid-template-columns: 1fr;
    }
  }"""

content = content.replace(old_css, new_css)

with open("src/tools/resume-builder.html", "w", encoding="utf-8") as f:
    f.write(content)


# Invoice Generator Fix
with open("src/tools/invoice-generator.html", "r", encoding="utf-8") as f:
    content2 = f.read()

old_css2 = """  @media (max-width: 1024px) {
    .invoice-container {
      grid-template-columns: 1fr;
    }
  }"""
new_css2 = """  @media (max-width: 1024px) {
    .invoice-container {
      grid-template-columns: 1fr;
    }
    .form-row, .inv-bottom-grid {
      grid-template-columns: 1fr;
    }
    .line-item-bottom {
      grid-template-columns: 1fr;
      gap: 12px;
    }
  }"""

content2 = content2.replace(old_css2, new_css2)

with open("src/tools/invoice-generator.html", "w", encoding="utf-8") as f:
    f.write(content2)
