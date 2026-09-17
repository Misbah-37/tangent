import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Update Title
content = re.sub(
    r'<title>.*?</title>', 
    '<title>Tangent Privacy Tools Suite | 100% Client-Side Web Utilities</title>', 
    content, count=1
)
content = re.sub(
    r'<meta property="og:title" content=".*?">', 
    '<meta property="og:title" content="Tangent Privacy Tools Suite | 100% Client-Side Web Utilities">', 
    content, count=1
)

# Update Description
new_desc = "A comprehensive suite of 24 client-side web utilities for developers and professionals. 100% private, offline-first processing with zero data leaving your browser."
content = re.sub(
    r'<meta name="description" content=".*?">', 
    f'<meta name="description" content="{new_desc}">', 
    content, count=1
)
content = re.sub(
    r'<meta property="og:description" content=".*?">', 
    f'<meta property="og:description" content="{new_desc}">', 
    content, count=1
)

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
