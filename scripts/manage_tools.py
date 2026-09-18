#!/usr/bin/env python3
"""
Tangent Tool Manager (manage_tools.py)
Automates tool registration, sidebar synchronization across all HTML pages,
homepage card grid updates, sitemap regeneration, and scaffolding of new tools.
"""

import os
import sys
import json
import re
import shutil
import argparse
from datetime import date

SITE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRAIN_DIR = r"C:\Users\Babar\.gemini\antigravity\brain\6e65680e-e021-44f6-8060-dd63e672317c"
TOOLS_JSON_PATH = os.path.join(SITE_DIR, "tools.json")
TEMPLATE_PATH = os.path.join(SITE_DIR, "templates", "tool_template.html")
SITEMAP_PATH = os.path.join(SITE_DIR, "sitemap.xml")
INDEX_PATH = os.path.join(SITE_DIR, "index.html")

CATEGORY_ORDER = [
    "Documents & PDF",
    "Media & Video",
    "Security & System",
    "Utilities"
]

def load_tools():
    if not os.path.exists(TOOLS_JSON_PATH):
        print(f"[ERROR] tools.json not found at {TOOLS_JSON_PATH}")
        sys.exit(1)
    with open(TOOLS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_tools(tools):
    with open(TOOLS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(tools, f, indent=2)
    # Also save to brain if exists
    brain_tools = os.path.join(BRAIN_DIR, "tools.json")
    if os.path.exists(BRAIN_DIR):
        with open(brain_tools, "w", encoding="utf-8") as f:
            json.dump(tools, f, indent=2)

def generate_sidebar_html(tools, current_page=""):
    # Group tools by category
    categories = {}
    for t in tools:
        cat = t.get("category", "Utilities")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(t)
    
    # Sort categories
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

        lines.append('    </div>')
        if cat_idx < len(ordered_cats):
            lines.append('')

    lines.append('  </div>')
    lines.append('</aside>')
    lines.append('<!-- TANGENT_SIDEBAR_END -->')

    return "\n".join(lines)

def generate_tools_grid_html(tools):
    # Sort tools by gridOrder
    sorted_tools = sorted(tools, key=lambda x: x.get("gridOrder", 999))

    lines = []
    lines.append('<!-- TANGENT_TOOL_CARDS_START -->')
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
        '    <loc>https://runtangent.com/</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        ''
    ]

    # Group by category for clean readability
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
            lines.append(f'    <loc>https://runtangent.com/{t["filename"]}</loc>')
            lines.append(f'    <lastmod>{today}</lastmod>')
            lines.append(f'    <changefreq>{t.get("changefreq", "weekly")}</changefreq>')
            lines.append(f'    <priority>{t.get("priority", 0.9):.1f}</priority>')
            lines.append('  </url>')
        lines.append('')

    lines.append('</urlset>')
    return "\n".join(lines)

def sync_all():
    print("=== SYNCHRONIZING TANGENT TOOL SUITE ===")
    tools = load_tools()
    print(f"Loaded {len(tools)} tools from tools.json")

    # 1. Update sidebars in all HTML files
    sidebar_pattern = re.compile(
        r'(?:<!-- TANGENT_SIDEBAR_START -->[\s\S]*?<!-- TANGENT_SIDEBAR_END -->)|'
        r'(<aside class="tangent-sidebar"[^>]*>[\s\S]*?</aside>)',
        re.MULTILINE
    )

    all_html_files = [f for f in os.listdir(SITE_DIR) if f.endswith(".html")]
    print(f"\n1. Updating Toolkit Push-Sidebar across {len(all_html_files)} HTML pages...")

    for page in all_html_files:
        page_path = os.path.join(SITE_DIR, page)
        with open(page_path, "r", encoding="utf-8") as f:
            content = f.read()

        sidebar_html = generate_sidebar_html(tools, current_page=page)

        if sidebar_pattern.search(content):
            new_content = sidebar_pattern.sub(sidebar_html, content, count=1)
            with open(page_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  [UPDATED] {page}")
        else:
            print(f"  [WARN] Sidebar marker not found in {page}")

    # 2. Update Tools Grid on index.html
    print("\n2. Updating Homepage Tools Grid on index.html...")
    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        index_content = f.read()

    grid_pattern = re.compile(
        r'(?:<!-- TANGENT_TOOL_CARDS_START -->[\s\S]*?<!-- TANGENT_TOOL_CARDS_END -->)|'
        r'(<section id="tools" class="grid-container">[\s\S]*?</section>)',
        re.MULTILINE
    )

    grid_replacement = (
        '<section id="tools" class="grid-container">\n'
        + generate_tools_grid_html(tools)
        + '\n</section>'
    )

    if grid_pattern.search(index_content):
        new_index = grid_pattern.sub(grid_replacement, index_content, count=1)
        with open(INDEX_PATH, "w", encoding="utf-8") as f:
            f.write(new_index)
        print("  [UPDATED] index.html grid updated successfully.")
    else:
        print("  [WARN] Could not find #tools grid section in index.html")

    # 3. Regenerate sitemap.xml
    print("\n3. Regenerating sitemap.xml...")
    sitemap_xml = generate_sitemap_xml(tools)
    with open(SITEMAP_PATH, "w", encoding="utf-8") as f:
        f.write(sitemap_xml)
    print("  [UPDATED] sitemap.xml updated with today's timestamp and all URLs.")

    # 4. Dual-Directory Sync to Brain
    if os.path.exists(BRAIN_DIR):
        print(f"\n4. Synchronizing changes to brain artifacts directory...")
        for f in os.listdir(SITE_DIR):
            if f.endswith(".html") or f in ["tools.json", "sitemap.xml", "robots.txt", "README.md"]:
                src = os.path.join(SITE_DIR, f)
                dst = os.path.join(BRAIN_DIR, f)
                shutil.copy2(src, dst)
        print("  [SYNCED] Dual-directory sync completed.")

    # 5. Run Audit Suite
    audit_script = os.path.join(BRAIN_DIR, "scratch", "final_suite_audit.py")
    if os.path.exists(audit_script):
        print("\n5. Running automated pre-flight audit...")
        res = os.system(f'python "{audit_script}"')
        if res == 0:
            print("\n[SUCCESS] Synchronization complete! All pre-flight tests passed 100% GREEN.")
        else:
            print("\n[WARNING] Audit reported some issues. Please review output above.")

def create_new_tool(slug, title=None, desc=None, category=None):
    slug = slug.strip().lower()
    if not re.match(r'^[a-z0-9-]+$', slug):
        print(f"[ERROR] Invalid slug '{slug}'. Use lowercase letters, digits, and hyphens.")
        sys.exit(1)

    filename = f"{slug}.html" if not slug.endswith(".html") else slug
    tool_id = slug.replace(".html", "")

    tools = load_tools()
    for t in tools:
        if t["id"] == tool_id or t["filename"] == filename:
            print(f"[ERROR] Tool '{tool_id}' already exists in tools.json!")
            sys.exit(1)

    # Defaults if not provided
    if not title:
        title = tool_id.replace("-", " ").title()
    if not desc:
        desc = "Fast, client-side utility running in browser RAM"
    if not category:
        category = "Utilities"

    print(f"\nCreating new tool:")
    print(f"  ID: {tool_id}")
    print(f"  File: {filename}")
    print(f"  Title: {title}")
    print(f"  Category: {category}")
    print(f"  Desc: {desc}")

    # 1. Create file from template
    if not os.path.exists(TEMPLATE_PATH):
        print(f"[ERROR] Template file not found at {TEMPLATE_PATH}")
        sys.exit(1)

    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        tpl = f.read()

    html_content = tpl.replace("{{TOOL_TITLE}}", title)
    html_content = html_content.replace("{{TOOL_DESC}}", desc)
    html_content = html_content.replace("{{TOOL_FILENAME}}", filename)

    dest_path = os.path.join(SITE_DIR, filename)
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"  [CREATED] {dest_path}")

    # 2. Append to tools.json
    new_entry = {
        "id": tool_id,
        "filename": filename,
        "title": title,
        "sidebarDesc": desc[:35] + "..." if len(desc) > 35 else desc,
        "category": category,
        "cardTitle": title,
        "cardDesc": desc,
        "badge": "NEW",
        "priority": 0.9,
        "changefreq": "weekly",
        "gridOrder": len(tools) + 1,
        "iconSvg": '<circle cx="12" cy="12" r="9"></circle><path d="M12 8v8M8 12h8"></path>'
    }
    tools.append(new_entry)
    save_tools(tools)
    print("  [REGISTERED] Added to tools.json")

    # 3. Synchronize whole site
    sync_all()

def list_tools():
    tools = load_tools()
    print(f"\nRegistered Tangent Tools ({len(tools)} total):\n")
    print(f"{'#':<3} {'ID':<20} {'Title':<22} {'Category':<20} {'Filename':<22} {'Badge':<8}")
    print("-" * 98)
    for idx, t in enumerate(tools, start=1):
        badge = t.get("badge") or "-"
        print(f"{idx:<3} {t['id']:<20} {t['title']:<22} {t['category']:<20} {t['filename']:<22} {badge:<8}")
    print()

def main():
    parser = argparse.ArgumentParser(description="Tangent Tool Suite CLI Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # sync
    subparsers.add_parser("sync", help="Synchronize sidebars, homepage grid, and sitemap across all pages")

    # list
    subparsers.add_parser("list", help="List all registered tools")

    # new
    new_parser = subparsers.add_parser("new", help="Scaffold a new tool and sync site")
    new_parser.add_argument("slug", help="Tool URL slug (e.g. audio-converter)")
    new_parser.add_argument("--title", help="Human-readable title (e.g. 'Audio Converter')")
    new_parser.add_argument("--desc", help="Short description")
    new_parser.add_argument("--category", choices=CATEGORY_ORDER, default="Utilities", help="Category")

    args = parser.parse_args()

    if args.command == "sync":
        sync_all()
    elif args.command == "list":
        list_tools()
    elif args.command == "new":
        create_new_tool(args.slug, args.title, args.desc, args.category)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
