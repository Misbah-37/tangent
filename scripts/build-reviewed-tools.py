"""Rebuild only named tool pages from current source, preserving other pages."""
from pathlib import Path
import os, re, sys, uuid, json, html
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
import build

if len(sys.argv) < 2:
    raise SystemExit('Supply tool filenames, e.g. file-vault.html')
for name in sys.argv[1:]:
    if Path(name).name != name or not name.endswith('.html'):
        raise SystemExit('Tool filename required')
    source = root / 'src/tools' / name
    destination = root / name
    if not source.is_file() or not destination.is_file():
        raise SystemExit(f'Unknown tool: {name}')
    existing = destination.read_text(encoding='utf-8')
    meta, styles, content, scripts = build.parse_fragment_file(source.read_text(encoding='utf-8'))
    structured = re.search(r'<!-- Structured Data for .*? -->\s*<script type="application/ld\+json">[\s\S]*?</script>', existing)
    structured_text = structured.group() if structured else ''
    description = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', meta)
    if structured and description:
        payload = re.search(r'<script[^>]*>([\s\S]*?)</script>', structured_text)
        data = json.loads(payload.group(1))
        if isinstance(data, dict) and 'description' in data:
            data['description'] = html.unescape(description.group(1))
            structured_text = structured_text[:payload.start(1)] + json.dumps(data, ensure_ascii=False, indent=2) + structured_text[payload.end(1):]
    compiled = (root / 'templates/shell.html').read_text(encoding='utf-8')
    replacements = {
        '<!-- INJECT_HEAD_META -->': f'<link rel="canonical" href="https://runtangent.com/{name}" />\n' + meta + ('\n' + structured_text if structured else ''),
        '/* INJECT_TOOL_STYLES */': styles,
        '<!-- INJECT_NAV_LINKS -->': build.generate_nav_links_html(name),
        '<!-- INJECT_SIDEBAR -->': build.generate_sidebar_html(build.load_tools(), name),
        '<!-- INJECT_CONTENT -->': content,
        '<!-- INJECT_SCRIPTS -->': scripts,
    }
    for token, value in replacements.items():
        assert token in compiled, token
        compiled = compiled.replace(token, value)
    compiled = '\n'.join(line.rstrip() for line in compiled.split('\n'))
    temporary = destination.with_name(name + '.build-' + uuid.uuid4().hex + '.tmp')
    temporary.write_bytes(compiled.encode('utf-8'))
    os.replace(temporary, destination)
    print('Compiled', name)
