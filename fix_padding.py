import os
import glob
import re

tools = glob.glob("src/tools/*.html")
changed_files = 0

for filepath in tools:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple regex to remove 'padding: 0;' if it's right after 'body, html {' or 'body {' or 'html, body {'
    # Let's just find "body, html {" block and replace "padding: 0;"
    
    def remove_padding_0(match):
        block = match.group(0)
        # only remove padding: 0; or padding: 0
        new_block = re.sub(r'^\s*padding:\s*0;?\s*$', '', block, flags=re.MULTILINE)
        return new_block

    new_content = re.sub(r'(?:body|html)[\s,]+(?:body|html)?\s*\{[^}]*\}', remove_padding_0, content)
    
    # Also find 'body {' alone
    new_content = re.sub(r'\bbody\s*\{[^}]*\}', remove_padding_0, new_content)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        changed_files += 1
        print(f"Fixed padding reset in {os.path.basename(filepath)}")

print(f"Total files fixed: {changed_files}")
