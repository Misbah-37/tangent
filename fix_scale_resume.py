import re

with open("src/tools/resume-builder.html", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r"const sheetBaseWidth = 794; // 210mm\s*const availableWidth = stage\.clientWidth - 40;"
replacement = """const sheetBaseWidth = 794; // 210mm
      
      // Temporarily hide sheet to measure true bounded width of parent without child overflow
      const originalDisplay = sheet.style.display;
      sheet.style.display = 'none';
      const availableWidth = stage.clientWidth - 40;
      sheet.style.display = originalDisplay;"""

content = re.sub(pattern, replacement, content)

with open("src/tools/resume-builder.html", "w", encoding="utf-8") as f:
    f.write(content)
