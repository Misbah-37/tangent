with open("templates/shell.html", "r", encoding="utf-8") as f:
    content = f.read()

old_links = '<a href="https://github.com/Misbah-37/tangent" target="_blank" rel="noopener noreferrer">GitHub</a>\n      <a href="#" onclick="window.scrollTo({top: 0, behavior: \'smooth\'}); return false;">Back to Top</a>'
new_links = '<a href="https://github.com/Misbah-37/tangent" target="_blank" rel="noopener noreferrer">GitHub</a>\n      <a href="mailto:hello@runtangent.com">Contact</a>\n      <a href="#" onclick="window.scrollTo({top: 0, behavior: \'smooth\'}); return false;">Back to Top</a>'

content = content.replace(old_links, new_links)

with open("templates/shell.html", "w", encoding="utf-8") as f:
    f.write(content)
