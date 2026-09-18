path = "templates/shell.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace href="index.html" with href="/"
content = content.replace('href="index.html"', 'href="/"')

# Inject canonical enforcement script in head
redirect_script = """
<!-- Enforce Custom Domain Canonical -->
<script>
  if (window.location.hostname.includes("github.io")) {
    window.location.replace("https://runtangent.com" + window.location.pathname + window.location.hash);
  }
</script>
</head>"""

if "<!-- Enforce Custom Domain Canonical -->" not in content:
    content = content.replace("</head>", redirect_script)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated shell.html")
