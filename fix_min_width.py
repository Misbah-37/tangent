import re

# Resume Builder Fix
with open("src/tools/resume-builder.html", "r", encoding="utf-8") as f:
    content = f.read()

rule1 = """  .studio-layout > div {
    min-width: 0;
  }
"""

content = content.replace(".studio-layout {", rule1 + "  .studio-layout {")

with open("src/tools/resume-builder.html", "w", encoding="utf-8") as f:
    f.write(content)

# Invoice Generator Fix
with open("src/tools/invoice-generator.html", "r", encoding="utf-8") as f:
    content2 = f.read()

rule2 = """  .invoice-container > div {
    min-width: 0;
  }
"""

content2 = content2.replace(".invoice-container {", rule2 + "  .invoice-container {")

with open("src/tools/invoice-generator.html", "w", encoding="utf-8") as f:
    f.write(content2)
