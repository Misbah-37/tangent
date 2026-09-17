import re

# Fix Resume Builder
with open("src/tools/resume-builder.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace measurement logic
old_logic = "const sheetBaseWidth = 794; // 210mm\n      const availableWidth = stage.clientWidth - 40;"
new_logic = """const sheetBaseWidth = 794; // 210mm
      
      // Temporarily hide sheet to measure true bounded width of parent without child overflow
      const originalDisplay = sheet.style.display;
      sheet.style.display = 'none';
      const availableWidth = stage.clientWidth - 40;
      sheet.style.display = originalDisplay;"""

content = content.replace(old_logic, new_logic)

with open("src/tools/resume-builder.html", "w", encoding="utf-8") as f:
    f.write(content)


# Fix Invoice Generator
with open("src/tools/invoice-generator.html", "r", encoding="utf-8") as f:
    content2 = f.read()

old_logic2 = "const sheetBaseWidth = 794; // 210mm\n    const availableWidth = stage.clientWidth - 40;"
content2 = content2.replace(old_logic2, new_logic.replace("      ", "    "))

with open("src/tools/invoice-generator.html", "w", encoding="utf-8") as f:
    f.write(content2)
