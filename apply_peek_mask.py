import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Add .track-mask-wrapper CSS right before .carousel-track
mask_css = """  .track-mask-wrapper {
    width: 100%;
    -webkit-mask-image: linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
    mask-image: linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%);
  }
  
  .carousel-track"""
content = content.replace("  .carousel-track", mask_css, 1)

# Modify .tool-card
content = re.sub(r'flex: 0 0 320px;\s*width: 320px;', 'flex: 0 0 calc(28% - 16px);\n    width: calc(28% - 16px);', content)
content = re.sub(r'flex: 0 0 280px;\s*width: 280px;', 'flex: 0 0 78%;\n      width: 78%;', content)

# Modify mobile track-mask-wrapper inside media query
mobile_mask = """    .track-mask-wrapper {
      -webkit-mask-image: linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
      mask-image: linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%);
    }
    .tool-card"""
content = content.replace("    .tool-card", mobile_mask, 1)

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
