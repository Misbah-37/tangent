import sys
import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

# For index.html
old_index = """        idx_compiled = idx_compiled.replace("<!-- INJECT_HEAD_META -->", hm)"""
new_index = """        canonical_tag = '<link rel="canonical" href="https://runtangent.com/" />\n'
        idx_compiled = idx_compiled.replace("<!-- INJECT_HEAD_META -->", canonical_tag + hm)"""

content = content.replace(old_index, new_index)

# For tool pages
old_tool = """        hm = hm + ld_json
        
        t_compiled = shell_template
        t_compiled = t_compiled.replace("<!-- INJECT_HEAD_META -->", hm)"""
new_tool = """        hm = hm + ld_json
        
        canonical_tag = f'<link rel="canonical" href="https://runtangent.com/{fname.replace(".html", "")}" />\n'
        t_compiled = shell_template
        t_compiled = t_compiled.replace("<!-- INJECT_HEAD_META -->", canonical_tag + hm)"""

content = content.replace(old_tool, new_tool)

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated build.py with canonical tags")
