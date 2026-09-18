path = "build.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('else "index.html#trust"', 'else "/#trust"')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated build.py")
