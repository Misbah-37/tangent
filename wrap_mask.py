import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

# I will replace `<div class="carousel-track"` with `<div class="track-mask-wrapper">\n        <div class="carousel-track"`
# And I need to add an extra `</div>` after `html.append(f'      </div>')` (which closes carousel-track).
# Actually, I can just replace the exact lines:
old_html = """        html.append(f'      </div>')
        html.append(f'      <div class="carousel-track" id="{track_id}">')"""
new_html = """        html.append(f'      </div>')
        html.append(f'      <div class="track-mask-wrapper">')
        html.append(f'        <div class="carousel-track" id="{track_id}">')"""

old_html2 = """        html.append(f'      </div>')
        html.append(f'    </div>')
        html.append(f'  </div>')
        return "\\n".join(html)"""
new_html2 = """        html.append(f'        </div>')
        html.append(f'      </div>')
        html.append(f'    </div>')
        html.append(f'  </div>')
        return "\\n".join(html)"""

if old_html in content and old_html2 in content:
    content = content.replace(old_html, new_html)
    content = content.replace(old_html2, new_html2)
else:
    print("COULD NOT FIND HTML TO REPLACE IN BUILD.PY")

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)
