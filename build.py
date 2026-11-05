#!/usr/bin/env python3
"""
RunTangent Master Site Compiler (Option 3 SSG Architecture)
---------------------------------------------------------
Compiles all pages from templates/shell.html and src/ fragments.
Guarantees 100% consistency across navbar, push-sidebar, and footer.

Usage:
  python build.py
  python build.py --local-only  # Compatibility flag; this compiler only writes local website outputs.
"""

import os
import argparse
import sys
import re
import json
import glob
import shutil
import html
from urllib.parse import quote
from datetime import date

SITE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(SITE_DIR, "src")
TOOLS_SRC_DIR = os.path.join(SRC_DIR, "tools")
TEMPLATE_PATH = os.path.join(SITE_DIR, "templates", "shell.html")
TOOLS_JSON_PATH = os.path.join(SITE_DIR, "tools.json")
SITEMAP_PATH = os.path.join(SITE_DIR, "sitemap.xml")

CATEGORY_ORDER = [
    "Documents & PDF",
    "Business & Career",
    "Images & Photos",
    "Design & Dev Graphics",
    "Audio & Video",
    "Security & System",
    "Data & Analytics",
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
    lines.append('  <div class="sidebar-search" style="padding: 0 16px 12px 16px;">')
    lines.append('    <div style="position: relative; display: flex; align-items: center;">')
    lines.append('      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="position: absolute; left: 10px;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>')
    lines.append('      <input type="search" id="toolkitSearch" aria-label="Search tools" placeholder="Search tools..." style="width: 100%; padding: 8px 12px 8px 32px; border-radius: 8px; border: 1px solid var(--glass-border); background: var(--item-hover); color: var(--text-main); font-size: 0.9rem; transition: 0.2s;">')
    lines.append('    </div>')
    lines.append('  </div>')
    lines.append('')
    lines.append('  <div class="sidebar-nav-list">')

    for cat_idx, cat in enumerate(ordered_cats, start=1):
        lines.append(f'    <!-- Category {cat_idx}: {cat} -->')
        lines.append('    <div class="sidebar-group">')
        lines.append(f'      <button type="button" class="sidebar-group-title" aria-expanded="false" aria-controls="sidebar-category-{cat_idx}">{cat}</button>')
        lines.append(f'      <div class="sidebar-group-content" id="sidebar-category-{cat_idx}">')

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

    # --- Sidebar Support Widget ---
    lines.append('  <div class="sidebar-support-widget">')
    lines.append('    <div class="support-title">Support RunTangent</div>')
    lines.append('    <div class="support-desc">If this saved you time today, help keep the suite free and ad-free.</div>')
    lines.append('    <a href="https://misbahul0.gumroad.com/l/support-tangent" target="_blank" rel="noopener noreferrer" class="support-btn">')
    lines.append('      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>')
    lines.append('      Support')
    lines.append('    </a>')
    lines.append('  </div>')

    lines.append('</aside>')
    lines.append('<!-- TANGENT_SIDEBAR_END -->')

    return "\n".join(lines)

def generate_nav_links_html(current_page):
    trust_target = "#trust" if current_page == "index.html" else "/#trust"
    return f'''<a href="{trust_target}" class="nav-link">Privacy Guarantee</a>
      <a href="https://github.com/Misbah-37/tangent" target="_blank" rel="noopener noreferrer" class="nav-link">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="display:inline-block; vertical-align:text-bottom; margin-right:3px;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
        <span>GitHub</span>
      </a>'''

def generate_tools_layout_html(tools):
    def group(t):
        c = t.get("category", "Utilities")
        return "Data" if c == "Data & Analytics" else "Documents" if c in ["Documents & PDF", "Business & Career"] else "Images" if c in ["Images & Photos", "Design & Dev Graphics"] else "Utilities"
    def card(t, featured=False):
        tone = group(t).lower()
        icon = f'<span class="wf-icon tone-{tone} {t["id"]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">{t["iconSvg"]}</svg></span>'
        search = html.escape(t.get("search_index", t["title"]), quote=True)
        return f'<a class="wf-card {"wf-featured-card" if featured else ""}" href="{t["filename"]}" data-group="{group(t)}" data-search="{search}">{icon}<div><h3>{html.escape(t["title"])}</h3><p>{html.escape(t["sidebarDesc"])}</p></div></a>'
    featured = [next(t for t in tools if t["id"] == id) for id in ["data-hygiene", "sql-studio", "csv-insights"]]
    chips = ''.join(f'<button type="button" data-wf-group="{g}" aria-pressed="{str(g == "All").lower()}" class="wf-chip">{g}</button>' for g in ["All", "Data", "Documents", "Images", "Utilities"])
    return ('<div class="wf-section-heading"><h2>Start with these tools</h2><span>Data essentials</span></div>'
        + '<div class="wf-featured">' + ''.join(card(t, True) for t in featured) + '</div>'
        + '<div class="wf-section-heading"><h2>All tools</h2><span id="wfCount" role="status">' + str(len(tools)) + ' tools</span></div>'
        + '<div class="wf-directory-controls"><div class="wf-chips">' + chips + '</div><label>Sort <select id="wfSort"><option value="catalog">Catalog order</option><option value="name">Name A–Z</option></select></label></div>'
        + '<div id="wfDirectory" class="wf-directory">' + ''.join(card(t) for t in tools) + '</div><p id="wfEmpty" hidden>No tools match. Try another search or category.</p>')

def generate_sitemap_xml(tools):
    today = date.today().isoformat()
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <!-- RunTangent Homepage -->',
        '  <url>',
        '    <loc>https://runtangent.com/</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>',
        '  <url>',
        '    <loc>https://runtangent.com/tools.html</loc>',
        f'    <lastmod>{today}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>0.9</priority>',
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
            lines.append(f'    <loc>https://runtangent.com/{t["filename"]}</loc>')
            lines.append(f'    <lastmod>{today}</lastmod>')
            lines.append(f'    <changefreq>{t.get("changefreq", "weekly")}</changefreq>')
            lines.append(f'    <priority>{t.get("priority", 0.9):.1f}</priority>')
            lines.append('  </url>')
        lines.append('')
    lines.append('</urlset>')
    return "\n".join(lines)

def generate_editorial_directory(tools):
    with open(os.path.join(SITE_DIR, "templates", "analyst-directory-promo.html"), encoding="utf-8") as source:
        analyst_promo = source.read()
    categories = list(dict.fromkeys(t['category'] for t in tools))
    options = '<option value="all">All categories</option><option value="media">Images, graphics &amp; media</option><option value="visual">Images &amp; graphics</option>'
    options += ''.join(f'<option value="{html.escape(c, quote=True)}">{html.escape(c)}</option>' for c in categories)
    cards = []
    for tool in tools:
        category = tool['category']
        tone = 'documents' if category in ['Documents & PDF', 'Business & Career'] else 'images' if category in ['Images & Photos', 'Design & Dev Graphics'] else 'data' if category == 'Data & Analytics' else 'utilities'
        special = {'data-hygiene': 'hygiene', 'sql-studio': 'sql', 'csv-insights': 'insights'}.get(tool['id'])
        icon = f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">{tool["iconSvg"]}</svg>'
        cards.append(f'<a class="tool-card" href="{html.escape(tool["filename"], quote=True)}"><span class="category-icon {special or "tone-" + tone}">{icon}</span><div><h2>{html.escape(tool["title"])}</h2><p>{html.escape(tool["sidebarDesc"])}</p><small>{html.escape(category)}</small></div></a>')
    catalog = json.dumps(tools, ensure_ascii=False).replace('<', '\\u003c')
    return ('<form id="directorySearch" class="directory-controls"><div class="search"><input id="query" type="search" aria-label="Search the tool directory" placeholder="Search tools or tasks…"></div><select id="category" aria-label="Filter tools by category">' + options + '</select></form>'
        + analyst_promo + '<p id="count" class="directory-status" role="status"></p><p id="empty" hidden>No tools match. Try another search or category.</p><div class="tool-grid">' + ''.join(cards) + '</div>'
        + '<script id="catalog" type="application/json">' + catalog + '</script>')

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


def render_site_header(template):
    if "<!-- SHARED_SITE_HEADER -->" not in template:
        return template
    with open(os.path.join(SITE_DIR, "templates", "shared-header.html"), encoding="utf-8") as source:
        header = source.read().strip()
    return template.replace("<!-- SHARED_SITE_HEADER -->", header)


def render_workspace_page(tool, fragment, template, content_dir=None):
    """Render an approved workspace without writing output or touching legacy pages."""
    template = render_site_header(template)
    content_dir = content_dir or os.path.join(SRC_DIR, "content")
    head, styles, content, scripts = parse_fragment_file(fragment)
    canonical = "https://runtangent.com/" + tool["filename"]
    faq_path = os.path.join(content_dir, tool["id"] + "-faq.json")
    with open(faq_path, encoding="utf-8") as source:
        faq = json.load(source)
    questions = faq.get("mainEntity", []) if isinstance(faq, dict) else [
        {"@type": "Question", "name": item["question"],
         "acceptedAnswer": {"@type": "Answer", "text": item["answer"]}}
        for item in faq
    ]
    if not 0 < len(questions) <= 5:
        raise ValueError(f"Invalid FAQ count for {tool['id']}")
    schemas = [
        {"@context": "https://schema.org", "@type": "WebApplication",
         "name": tool["title"], "description": tool["cardDesc"],
         "applicationCategory": "BusinessApplication", "operatingSystem": "Any",
         "url": canonical, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": questions},
    ]
    # Escape '<' so schema text cannot terminate its script element.
    schema = json.dumps(schemas, ensure_ascii=False).replace("<", "\\u003c")
    head += ('\n<link rel="canonical" href="' + html.escape(canonical, quote=True)
             + '">\n<script type="application/ld+json">' + schema + '</script>')
    attributes = ('data-design="workspace-first" data-tool-concept="hygiene"'
                  if tool["id"] == "data-hygiene" else "")
    replacements = {
        "<!-- INJECT_HTML_ATTRIBUTES -->": attributes,
        "<!-- INJECT_HEAD_META -->": head,
        "/* INJECT_TOOL_STYLES */": styles,
        "<!-- INJECT_CONTENT -->": content,
        "<!-- INJECT_SCRIPTS -->": scripts,
    }
    # One substitution pass: user-facing content must not be reinterpreted as template tokens.
    return re.sub("|".join(re.escape(key) for key in replacements),
                  lambda match: replacements[match.group()], template)

def render_analyst_privacy(source=None, template=None):
    """Render the desktop policy separately from the website trust section."""
    if source is None:
        with open(os.path.join(SRC_DIR, "analyst-privacy.html"), encoding="utf-8") as f:
            source = f.read()
    if template is None:
        with open(os.path.join(SITE_DIR, "templates", "editorial.html"), encoding="utf-8") as f:
            template = f.read()
    meta, _, content, _ = parse_fragment_file(source)
    replacements = {"<!-- INJECT_HEAD_META -->": meta, "<!-- INJECT_CONTENT -->": content}
    return re.sub("|".join(re.escape(key) for key in replacements),
                  lambda match: replacements[match.group()], template)


def build_all(local_only=False):
    print("=== BUILDING TANGENT STATIC SUITE FROM TEMPLATES ===")
    tools = load_tools()
    print(f"Loaded {len(tools)} tools from tools.json")

    if not os.path.exists(TEMPLATE_PATH):
        print(f"[ERROR] Template {TEMPLATE_PATH} does not exist.")
        sys.exit(1)

    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        shell_template = f.read()
    with open(os.path.join(SITE_DIR, "templates", "editorial.html"), encoding="utf-8") as f:
        editorial_template = render_site_header(f.read())

    # 1. Compile index.html
    index_src = os.path.join(SRC_DIR, "index.html")
    if os.path.exists(index_src):
        with open(index_src, "r", encoding="utf-8") as f:
            idx_frag = f.read()

        hm, ts, ct, sc = parse_fragment_file(idx_frag)
        category_links = ''.join(f'<a href="tools.html?category={quote(category)}">{html.escape(category)} <span aria-hidden="true">→</span></a>' for category in dict.fromkeys(t['category'] for t in tools))
        ct = re.sub(r'<nav aria-label="All tool categories">[\s\S]*?</nav>', lambda _: '<nav aria-label="All tool categories">' + category_links + '</nav>', ct)

        # Auto-update grid in index content
        grid_replacement = (
            '<section id="tools" class="tools-directory">\n'
            + generate_tools_layout_html(tools)
            + '\n</section>'
        )
        grid_pattern = re.compile(r'<section id="tools" class="(?:grid-container|tools-directory)">[\s\S]*?</section>')
        if grid_pattern.search(ct):
            ct = grid_pattern.sub(grid_replacement, ct, count=1)

        idx_compiled = editorial_template
        canonical_tag = '<link rel="canonical" href="https://runtangent.com/" />\n'
        idx_compiled = idx_compiled.replace("<!-- INJECT_HEAD_META -->", canonical_tag + hm)
        idx_compiled = idx_compiled.replace("/* INJECT_TOOL_STYLES */", ts)
        idx_compiled = idx_compiled.replace("<!-- INJECT_NAV_LINKS -->", generate_nav_links_html("index.html"))
        idx_compiled = idx_compiled.replace("<!-- INJECT_SIDEBAR -->", generate_sidebar_html(tools, "index.html"))
        idx_compiled = idx_compiled.replace("<!-- INJECT_CONTENT -->", ct)
        idx_compiled = idx_compiled.replace("<!-- INJECT_SCRIPTS -->", sc)

        # The approved cyan homepage owns its complete layout and asset bundle.
        if "<!-- STANDALONE_HOMEPAGE -->" in idx_frag:
            idx_compiled = render_site_header(idx_frag.replace("<!-- STANDALONE_HOMEPAGE -->", "", 1).lstrip())

        idx_dest = os.path.join(SITE_DIR, "index.html")
        with open(idx_dest, "w", encoding="utf-8", newline="\n") as f:
            f.write(idx_compiled)
        print(f"  [COMPILED] index.html ({len(idx_compiled):,} bytes)")
    else:
        print("  [WARN] src/index.html not found!")

    # Dedicated searchable directory, generated from the same catalog as tools.
    with open(os.path.join(SRC_DIR, "directory.html"), encoding="utf-8") as f:
        directory_meta, _, directory_content, _ = parse_fragment_file(f.read())
    directory_content = directory_content.replace('<!-- INJECT_EDITORIAL_DIRECTORY -->', generate_editorial_directory(tools))
    directory_compiled = editorial_template.replace('<!-- INJECT_HEAD_META -->', '<link rel="canonical" href="https://runtangent.com/tools.html">\n' + directory_meta).replace('<!-- INJECT_CONTENT -->', directory_content)
    with open(os.path.join(SITE_DIR, "tools.html"), 'w', encoding='utf-8', newline='\n') as f:
        f.write(directory_compiled)
    print("  [COMPILED] tools.html (editorial directory)")

    # Dedicated app privacy page; does not replace website policy/trust content.
    with open(os.path.join(SITE_DIR, "analyst-privacy.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(render_analyst_privacy(template=editorial_template))
    print("  [COMPILED] analyst-privacy.html (desktop application privacy)")

    # 2. Compile tool pages
    for tool in tools:
        fname = tool["filename"]
        t_src = os.path.join(TOOLS_SRC_DIR, fname)
        if not os.path.exists(t_src):
            print(f"  [WARN] Source fragment missing for {fname}")
            continue

        with open(t_src, "r", encoding="utf-8") as f:
            t_frag = f.read()

        if "<!-- WORKSPACE_LAYOUT -->" in t_frag:
            with open(os.path.join(SITE_DIR, "templates", "workspace.html"), encoding="utf-8") as f:
                workspace_template = f.read()
            t_compiled = render_workspace_page(tool, t_frag, workspace_template)
            with open(os.path.join(SITE_DIR, fname), "w", encoding="utf-8", newline="\n") as f:
                f.write(t_compiled)
            print(f"  [COMPILED] {fname:22} ({len(t_compiled):,} bytes, workspace)")
            continue

        hm, ts, ct, sc = parse_fragment_file(t_frag)

        # Inject JSON-LD Structured Data for this tool
        title = tool.get("title", "").replace('"', '\"')
        desc = tool.get("cardDesc", "").replace('"', '\"')
        cat = tool.get("category", "Utilities").replace(" ", "") + "Application"
        ld_json = f'''
<!-- Structured Data for {title} -->
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "{title} | RunTangent",
  "description": "{desc}",
  "applicationCategory": "{cat}",
  "operatingSystem": "All",
  "url": "https://runtangent.com/{fname}",
  "offers": {{
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "USD"
  }}
}}
</script>
'''
        hm = hm + ld_json

        canonical_tag = f'<link rel="canonical" href="https://runtangent.com/{fname}" />\n'
        t_compiled = shell_template
        t_compiled = t_compiled.replace("<!-- INJECT_HEAD_META -->", canonical_tag + hm)
        t_compiled = t_compiled.replace("/* INJECT_TOOL_STYLES */", ts)
        t_compiled = t_compiled.replace("<!-- INJECT_NAV_LINKS -->", generate_nav_links_html(fname))
        t_compiled = t_compiled.replace("<!-- INJECT_SIDEBAR -->", generate_sidebar_html(tools, fname))
        t_compiled = t_compiled.replace("<!-- INJECT_CONTENT -->", ct)
        t_compiled = t_compiled.replace("<!-- INJECT_SCRIPTS -->", sc)

        t_dest = os.path.join(SITE_DIR, fname)
        with open(t_dest, "w", encoding="utf-8", newline="\n") as f:
            f.write(t_compiled)
        print(f"  [COMPILED] {fname:22} ({len(t_compiled):,} bytes)")

    # 3. Regenerate sitemap.xml
    with open(SITEMAP_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(generate_sitemap_xml(tools))
    print("  [UPDATED] sitemap.xml regenerated.")

    print("\n[COMPILED] Local website files updated.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compile the RunTangent static website.")
    parser.add_argument("--local-only", action="store_true",
                        help="Compatibility flag: all builds write local website outputs only.")
    args = parser.parse_args()
    build_all(local_only=args.local_only)
