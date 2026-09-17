import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r'return "\n"\.join\(', r'return "\\n".join(', content)

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)
