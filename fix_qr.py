import re

with open('src/tools/qr-generator.html', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to wrap the .tool-panel { padding: 16px; } inside @media (max-width: 600px) { ... }
# Let's find exactly where it is.
pattern = r'(\s+)(\.tool-panel \{ padding: 16px; \})'

# Actually, the user's fix was:
# -    
# +    @media (max-width: 600px) {
#        .tool-panel { padding: 16px; }

replacement = r'\1@media (max-width: 600px) {\n\1\2'

# Let's be careful. Let's just find that specific `.tool-panel { padding: 16px; }` block.
# In src/tools/qr-generator.html:
#     }
# 
#       
#       .tool-panel { padding: 16px; }
#       .color-controls { grid-template-columns: 1fr; gap: 12px; }

# Replace exactly:
chunk = """
      .tool-panel { padding: 16px; }
      .color-controls { grid-template-columns: 1fr; gap: 12px; }
      .canvas-wrapper { padding: 12px; max-width: 100%; width: 100%; box-sizing: border-box; }
      .canvas-wrapper canvas { max-width: 100% !important; width: 100% !important; height: auto !important; aspect-ratio: 1 / 1 !important; display: inline-block !important; box-sizing: border-box !important; object-fit: contain !important; }
      .split-layout { gap: 20px; }
    }
"""
# Note: the chunk ends with `    }` which closes the missing media query!
# Wait, look at the end of the block in my previous check:
#         .split-layout { gap: 20px; }
#       }
# This means there IS a closing brace `}`. It was literally just missing the opening `@media (max-width: 600px) {`!

html = re.sub(r'\s+\.tool-panel \{ padding: 16px; \}', r'\n    @media (max-width: 600px) {\n      .tool-panel { padding: 16px; }', html, count=1)

with open('src/tools/qr-generator.html', 'w', encoding='utf-8') as f:
    f.write(html)
