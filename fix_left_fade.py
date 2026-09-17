import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Fix desktop mask
old_mask_desktop = "linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)"
new_mask_desktop = "linear-gradient(to right, black 0, black calc(100% - 40px), transparent 100%)"
content = content.replace(old_mask_desktop, new_mask_desktop)

# Fix mobile mask
old_mask_mobile = "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)"
new_mask_mobile = "linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)"
content = content.replace(old_mask_mobile, new_mask_mobile)

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
