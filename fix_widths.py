import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Add width: 100%; max-width: 100%; min-width: 0; to prevent flex expansion bugs
content = content.replace("  .tools-directory {", "  .tools-directory {\n    width: 100%;\n    min-width: 0;\n    box-sizing: border-box;")
content = content.replace("  .category-section {", "  .category-section {\n    width: 100%;\n    min-width: 0;\n    box-sizing: border-box;")
content = content.replace("  .carousel-container {", "  .carousel-container {\n    width: 100%;\n    min-width: 0;")

# Make sure buttons actually span the height. 
content = content.replace("align-items: center;", "align-items: center;\n    height: 100%;")

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
