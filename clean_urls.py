import re
import os
import glob

# 1. build.py updates
build_path = "build.py"
with open(build_path, "r", encoding="utf-8") as f:
    build_content = f.read()

# For sidebar
build_content = build_content.replace(
    'lines.append(f\'      <a href="{item["filename"]}" class="sidebar-item{active_class}">\')',
    'lines.append(f\'      <a href="{item["filename"].replace(".html", "")}" class="sidebar-item{active_class}">\')'
)
# For sitemap
build_content = build_content.replace(
    'lines.append(f\'    <loc>https://runtangent.com/{t["filename"]}</loc>\')',
    'lines.append(f\'    <loc>https://runtangent.com/{t["filename"].replace(".html", "")}</loc>\')'
)

with open(build_path, "w", encoding="utf-8") as f:
    f.write(build_content)


# 2. src/index.html updates (features grid)
index_src_path = "src/index.html"
with open(index_src_path, "r", encoding="utf-8") as f:
    idx_content = f.read()

# Replace tool.html with tool in hrefs
idx_content = re.sub(r'href="([\w-]+)\.html"', r'href="\1"', idx_content)

with open(index_src_path, "w", encoding="utf-8") as f:
    f.write(idx_content)


# 3. src/tools/*.html updates (Canonical tags)
tool_files = glob.glob("src/tools/*.html")
for tool_file in tool_files:
    with open(tool_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace the canonical tag .html extension
    content = re.sub(
        r'<link rel="canonical" href="https://runtangent.com/([\w-]+)\.html">',
        r'<link rel="canonical" href="https://runtangent.com/\1">',
        content
    )
    
    with open(tool_file, "w", encoding="utf-8") as f:
        f.write(content)

print("Clean URLs script finished.")
