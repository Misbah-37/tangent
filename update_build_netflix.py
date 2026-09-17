import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

# I need to find the build_track function and rewrite the HTML structure.
new_func = """def build_track(title, track_tools, track_id):
        html = [f'  <div class="category-section">']
        html.append(f'    <div class="category-header">')
        html.append(f'      <h2>{title}</h2>')
        html.append(f'    </div>')
        html.append(f'    <div class="carousel-container">')
        html.append(f'      <div class="carousel-nav">')
        html.append(f'        <button class="scroll-btn left" aria-label="Scroll left" onclick="scrollTrack(\\\'{track_id}\\\', -1)">')
        html.append(f'          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>')
        html.append(f'        </button>')
        html.append(f'        <button class="scroll-btn right" aria-label="Scroll right" onclick="scrollTrack(\\\'{track_id}\\\', 1)">')
        html.append(f'          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>')
        html.append(f'        </button>')
        html.append(f'      </div>')
        html.append(f'      <div class="carousel-track" id="{track_id}">')
        
        sorted_track = sorted(track_tools, key=lambda x: x.get("gridOrder", 999))
        for t in sorted_track:
            html.append(f'        <a href="{t["filename"]}" class="tool-card">')
            html.append(f'          <div class="card-icon">')
            html.append(f'            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{t["iconSvg"]}</svg>')
            html.append(f'          </div>')
            html.append(f'          <div class="card-content">')
            html.append(f'            <h3>{t["cardTitle"]}</h3>')
            html.append(f'            <p>{t["cardDesc"]}</p>')
            html.append(f'          </div>')
            html.append(f'        </a>')
            
        html.append(f'      </div>')
        html.append(f'    </div>')
        html.append(f'  </div>')
        return "\\n".join(html)"""

# Regex replace the old build_track
pattern = re.compile(r'def build_track\(title, track_tools, track_id\):[\s\S]*?return "\\n"\.join\(html\)')
content = pattern.sub(new_func, content, count=1)

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)
