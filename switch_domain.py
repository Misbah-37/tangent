import os
import glob
import re

old_domain_pattern = r'https://misbah-37\.github\.io/tangent/?'
new_domain = 'https://runtangent.com/'
new_domain_no_slash = 'https://runtangent.com'

# 1. Update build.py
with open("build.py", "r", encoding="utf-8") as f:
    build_content = f.read()
# Replace exact occurrences
build_content = re.sub(old_domain_pattern, new_domain, build_content)
with open("build.py", "w", encoding="utf-8") as f:
    f.write(build_content)

# 2. Update src/index.html
with open("src/index.html", "r", encoding="utf-8") as f:
    idx_content = f.read()
idx_content = re.sub(old_domain_pattern, new_domain, idx_content)
with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(idx_content)

# 3. Update all tools in src/tools/
for filepath in glob.glob("src/tools/*.html"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    if re.search(old_domain_pattern, content):
        content = re.sub(old_domain_pattern, new_domain, content)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

# 4. Create CNAME file in root
with open("CNAME", "w", encoding="utf-8") as f:
    f.write("runtangent.com")

print("Domain switch logic complete.")
