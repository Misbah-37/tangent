import re

for filename in ["src/tools/resume-builder.html", "src/tools/invoice-generator.html"]:
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("sheet.style.transformOrigin = 'top left';", "sheet.style.transformOrigin = 'top center';")

    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
