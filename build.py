#!/usr/bin/env python3
"""
Tangent Master Site Compiler (Option 3 SSG Architecture)
---------------------------------------------------------
Compiles all pages from templates/shell.html and src/ fragments.
Guarantees 100% consistency across navbar, push-sidebar, and footer.

Usage:
  python build.py
"""

import os
import sys
import re
import json
import glob
import shutil
from datetime import date

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
BRAIN_DIR = r"C:\Users\Babar\.gemini\antigravity\brain\6e65680e-e021-44f6-8060-dd63e672317c"
SRC_DIR = os.path.join(SITE_DIR, "src")
TOOLS_SRC_DIR = os.path.join(SRC_DIR, "tools")
TEMPLATE_PATH = os.path.join(SITE_DIR, "templates", "shell.html")
TOOLS_JSON_PATH = os.path.join(SITE_DIR, "tools.json")
SITEMAP_PATH = os.path.join(SITE_DIR, "sitemap.xml")

CATEGORY_ORDER = [
    "Documents & PDF",
    "Media & Video",
    "Security & System",
    "Utilities"
]

def load_tools():
    if not os.path.exists(TOOLS_JSON_PATH):
        print(f"[ERROR] {TOOLS_JSON_PATH} not found.")
        sys.exit(1)
    with open(TOOLS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_sidebar_html(tools, current_page):
    categories = {}
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(t)
    
    ordered_cats = [c for c in CATEGORY_ORDER if c in categories]
    for c in categories:
        if c not in ordered_cats:
            ordered_cats.append(c)

    lines = []
    lines.append('<!-- TANGENT_SIDEBAR_START -->')
    lines.append('<aside class="tangent-sidebar" id="tangentSidebar" aria-label="Toolkit Directory">')
    lines.append('  <div class="sidebar-header">')
    lines.append('    <span class="sidebar-title">Toolkit</span>')
    lines.append('    <button type="button" class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Close Sidebar" title="Close Sidebar">')
    lines.append('      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">')
    lines.append('        <line x1="18" y1="6" x2="6" y2="18"></line>')
    lines.append('        <line x1="6" y1="6" x2="18" y2="18"></line>')
    lines.append('      </svg>')
    lines.append('    </button>')
    lines.append('  </div>')
    lines.append('')
    lines.append('  <div class="sidebar-nav-list">')

    for cat_idx, cat in enumerate(ordered_cats, start=1):
        lines.append(f'    <!-- Category {cat_idx}: {cat} -->')
        lines.append('    <div class="sidebar-group">')
        lines.append(f'      <div class="sidebar-group-title">{cat}</div>')
        lines.append('      <div class="sidebar-group-content">')
        
        for item in categories[cat]:
            is_active = (item["filename"] == current_page)
            active_class = " active" if is_active else ""
            lines.append(f'      <a href="{item["filename"]}" class="sidebar-item{active_class}">')
            lines.append(f'        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2">{item["iconSvg"]}</svg>')
            lines.append('        <div class="item-text">')
            lines.append(f'          <div class="item-title">{item["title"]}</div>')
            lines.append(f'          <div class="item-desc">{item["sidebarDesc"]}</div>')
            lines.append('        </div>')
            lines.append('      </a>')

        lines.append('      </div>')
        lines.append('    </div>')
        if cat_idx < len(ordered_cats):
            lines.append('')

    lines.append('  </div>')
    lines.append('</aside>')
    lines.append('<!-- TANGENT_SIDEBAR_END -->')

    return "\n".join(lines)

def generate_nav_links_html(current_page):
    trust_target = "#trust" if current_page == "index.html" else "index.html#trust"
    return f'''<a href="{trust_target}" class="nav-link">Privacy Guarantee</a>
      <a href="https://github.com/Misbah-37/tangent" target="_blank" rel="noopener noreferrer" class="nav-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:text-bottom; margin-right:3px;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        <span>GitHub</span>
      </a>'''

def generate_tools_grid_html(tools):
    sorted_tools = sorted(tools, key=lambda x: x.get("gridOrder", 999))
    lines = ['<!-- TANGENT_TOOL_CARDS_START -->']
    for t in sorted_tools:
        badge_html = f'\n    <span class="card-badge">{t["badge"]}</span>' if t.get("badge") else ''
        lines.append(f'  <a href="{t["filename"]}" class="tool-card">{badge_html}')
        lines.append('    <div class="card-icon">')
        lines.append(f'      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{t["iconSvg"]}</svg>')
        lines.append('    </div>')
        lines.append(f'    <h3>{t["cardTitle"]}</h3>')
        lines.append(f'    <p>{t["cardDesc"]}</p>')
        lines.append('  </a>\n')
    lines.append('<!-- TANGENT_TOOL_CARDS_END -->')
    return "\n".join(lines)

def generate_sitemap_xml(tools):
    today = date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <!-- Tangent Homepage -->',
        '  <url>',
        '    <loc>https://misbah-37.github.io/tangent/</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        ''
    ]
    categories = {}
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(t)

    ordered_cats = [c for c in CATEGORY_ORDER if c in categories]
    for c in categories:
        if c not in ordered_cats:
            ordered_cats.append(c)

    for cat in ordered_cats:
        lines.append(f'  <!-- {cat} -->')
        for t in categories[cat]:
            lines.append('  <url>')
            lines.append(f'    <loc>https://misbah-37.github.io/tangent/{t["filename"]}</loc>')
            lines.append(f'    <lastmod>{today}</lastmod>')
            lines.append(f'    <changefreq>{t.get("changefreq", "weekly")}</changefreq>')
            lines.append(f'    <priority>{t.get("priority", 0.9):.1f}</priority>')
            lines.append('  </url>')
        lines.append('')
    lines.append('</urlset>')
    return "\n".join(lines)

def parse_fragment_file(content):
    meta_m = re.search(r'<!-- --- HEAD_META --- -->([\s\S]*?)<!-- --- TOOL_STYLES --- -->', content)
    styles_m = re.search(r'<!-- --- TOOL_STYLES --- -->\s*<style>([\s\S]*?)</style>\s*<!-- --- CONTENT --- -->', content)
    content_m = re.search(r'<!-- --- CONTENT --- -->([\s\S]*?)<!-- --- SCRIPTS --- -->', content)
    scripts_m = re.search(r'<!-- --- SCRIPTS --- -->([\s\S]*)$', content)
    
    head_meta = meta_m.group(1).strip() if meta_m else ""
    tool_styles = styles_m.group(1).strip() if styles_m else ""
    body_content = content_m.group(1).strip() if content_m else ""
    scripts = scripts_m.group(1).strip() if scripts_m else ""
    
    return head_meta, tool_styles, body_content, scripts

def build_all():
    print("=== BUILDING TANGENT STATIC SUITE FROM TEMPLATES ===")
    tools = load_tools()
    print(f"Loaded {len(tools)} tools from tools.json")
    
    if not os.path.exists(TEMPLATE_PATH):
        print(f"[ERROR] Template {TEMPLATE_PATH} does not exist.")
        sys.exit(1)
        
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        shell_template = f.read()

    # 1. Compile index.html
    index_src = os.path.join(SRC_DIR, "index.html")
    if os.path.exists(index_src):
        with open(index_src, "r", encoding="utf-8") as f:
            idx_frag = f.read()
        
        hm, ts, ct, sc = parse_fragment_file(idx_frag)
        
        # Auto-update grid in index content
        grid_replacement = (
            '<section id="tools" class="grid-container">\n'
            + generate_tools_grid_html(tools)
            + '\n</section>'
        )
        grid_pattern = re.compile(r'<section id="tools" class="grid-container">[\s\S]*?</section>')
        if grid_pattern.search(ct):
            ct = grid_pattern.sub(grid_replacement, ct, count=1)
        
        idx_compiled = shell_template
        idx_compiled = idx_compiled.replace("<!-- INJECT_HEAD_META -->", hm)
        idx_compiled = idx_compiled.replace("/* INJECT_TOOL_STYLES */", ts)
        idx_compiled = idx_compiled.replace("<!-- INJECT_NAV_LINKS -->", generate_nav_links_html("index.html"))
        idx_compiled = idx_compiled.replace("<!-- INJECT_SIDEBAR -->", generate_sidebar_html(tools, "index.html"))
        idx_compiled = idx_compiled.replace("<!-- INJECT_CONTENT -->", ct)
        idx_compiled = idx_compiled.replace("<!-- INJECT_SCRIPTS -->", sc)
        
        idx_dest = os.path.join(SITE_DIR, "index.html")
        with open(idx_dest, "w", encoding="utf-8") as f:
            f.write(idx_compiled)
        print(f"  [COMPILED] index.html ({len(idx_compiled):,} bytes)")
    else:
        print("  [WARN] src/index.html not found!")

    # 2. Compile tool pages
    for tool in tools:
        fname = tool["filename"]
        t_src = os.path.join(TOOLS_SRC_DIR, fname)
        if not os.path.exists(t_src):
            print(f"  [WARN] Source fragment missing for {fname}")
            continue
            
        with open(t_src, "r", encoding="utf-8") as f:
            t_frag = f.read()
            
        hm, ts, ct, sc = parse_fragment_file(t_frag)
        
        t_compiled = shell_template
        t_compiled = t_compiled.replace("<!-- INJECT_HEAD_META -->", hm)
        t_compiled = t_compiled.replace("/* INJECT_TOOL_STYLES */", ts)
        t_compiled = t_compiled.replace("<!-- INJECT_NAV_LINKS -->", generate_nav_links_html(fname))
        t_compiled = t_compiled.replace("<!-- INJECT_SIDEBAR -->", generate_sidebar_html(tools, fname))
        t_compiled = t_compiled.replace("<!-- INJECT_CONTENT -->", ct)
        t_compiled = t_compiled.replace("<!-- INJECT_SCRIPTS -->", sc)
        
        t_dest = os.path.join(SITE_DIR, fname)
        with open(t_dest, "w", encoding="utf-8") as f:
            f.write(t_compiled)
        print(f"  [COMPILED] {fname:22} ({len(t_compiled):,} bytes)")

    # 3. Regenerate sitemap.xml
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write(generate_sitemap_xml(tools))
    print("  [UPDATED] sitemap.xml regenerated.")

    # 4. Sync to Brain Artifacts
    if os.path.exists(BRAIN_DIR):
        print("  [SYNCING] Dual-directory sync to brain artifacts...")
        for f in os.listdir(SITE_DIR):
            if f.endswith(".html") or f in ["tools.json", "sitemap.xml", "robots.txt", "README.md", "build.py"]:
                src = os.path.join(SITE_DIR, f)
                dst = os.path.join(BRAIN_DIR, f)
                shutil.copy2(src, dst)
        
        # Also sync templates and src directories
        for sub in ["templates", "src"]:
            s_sub = os.path.join(SITE_DIR, sub)
            b_sub = os.path.join(BRAIN_DIR, sub)
            if os.path.exists(b_sub):
                shutil.rmtree(b_sub)
            shutil.copytree(s_sub, b_sub)
        print("  [SYNCED] All templates, source fragments, and compiled assets synchronized.")

    # 5. Run Automated Pre-Flight Suite Audit
    audit_script = os.path.join(BRAIN_DIR, "scratch", "final_suite_audit.py")
    if os.path.exists(audit_script):
        print("\n=== RUNNING AUTOMATED PRE-FLIGHT AUDIT ===")
        res = os.system(f'python "{audit_script}"')
        if res == 0:
            print("\n[SUCCESS] Build complete! All pages compiled and 100% verified GREEN.")
        else:
            print("\n[WARNING] Audit reported some issues. Please review output above.")

if __name__ == "__main__":
    build_all()
