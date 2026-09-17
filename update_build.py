import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

new_func = """def generate_tools_layout_html(tools):
    categories = []
    # Collect unique categories, maintaining a stable order based on tools.json appearance
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories:
            categories.append(cat)
            
    # Find top picks (1 from each category, lowest gridOrder)
    top_picks = []
    for cat in categories:
        cat_tools = [t for t in tools if t.get("category", "Utilities") == cat]
        if cat_tools:
            cat_tools.sort(key=lambda x: x.get("gridOrder", 999))
            top_picks.append(cat_tools[0])
            
    lines = ['<!-- TANGENT_TOOL_LAYOUT_START -->']
    
    def build_track(title, track_tools, track_id):
        html = [f'  <div class="category-section">']
        html.append(f'    <div class="category-header">')
        html.append(f'      <h2>{title}</h2>')
        html.append(f'      <div class="carousel-nav">')
        html.append(f'        <button class="scroll-btn left" aria-label="Scroll left" onclick="scrollTrack(\'{track_id}\', -1)">')
        html.append(f'          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>')
        html.append(f'        </button>')
        html.append(f'        <button class="scroll-btn right" aria-label="Scroll right" onclick="scrollTrack(\'{track_id}\', 1)">')
        html.append(f'          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>')
        html.append(f'        </button>')
        html.append(f'      </div>')
        html.append(f'    </div>')
        html.append(f'    <div class="carousel-track" id="{track_id}">')
        
        sorted_track = sorted(track_tools, key=lambda x: x.get("gridOrder", 999))
        for t in sorted_track:
            html.append(f'      <a href="{t["filename"]}" class="tool-card">')
            html.append(f'        <div class="card-icon">')
            html.append(f'          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{t["iconSvg"]}</svg>')
            html.append(f'        </div>')
            html.append(f'        <div class="card-content">')
            html.append(f'          <h3>{t["cardTitle"]}</h3>')
            html.append(f'          <p>{t["cardDesc"]}</p>')
            html.append(f'        </div>')
            html.append(f'      </a>')
            
        html.append(f'    </div>')
        html.append(f'  </div>')
        return "\n".join(html)

    # Top Picks Row
    lines.append(build_track("Top Picks", top_picks, "track-top-picks"))
    
    # Category Rows
    for i, cat in enumerate(categories):
        cat_tools = [t for t in tools if t.get("category", "Utilities") == cat]
        track_id = f"track-cat-{i}"
        lines.append(build_track(cat, cat_tools, track_id))
        
    lines.append('<!-- TANGENT_TOOL_LAYOUT_END -->')
    return "\n".join(lines)
"""

# Replace old generate_tools_grid_html with new one
pattern = re.compile(r'def generate_tools_grid_html\(tools\):[\s\S]*?return "\\n"\.join\(lines\)\n')
content = pattern.sub(new_func, content, count=1)

# Update the replacement logic
old_replacement = """        grid_replacement = (
            '<section id="tools" class="grid-container">\\n'
            + generate_tools_grid_html(tools)
            + '\\n</section>'
        )"""
new_replacement = """        grid_replacement = (
            '<section id="tools" class="tools-directory">\\n'
            + generate_tools_layout_html(tools)
            + '\\n</section>'
        )"""
content = content.replace(old_replacement, new_replacement)

# Update regex
content = content.replace("grid_pattern = re.compile(r'<section id=\"tools\" class=\"grid-container\">[\\s\\S]*?</section>')", 
                          "grid_pattern = re.compile(r'<section id=\"tools\" class=\"(?:grid-container|tools-directory)\">[\\s\\S]*?</section>')")

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)
