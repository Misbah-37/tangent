import os
import glob

files_to_update = [
    "README.md",
    "robots.txt",
    "templates/fragment_template.html",
    "templates/tool_template.html",
    "scripts/manage_tools.py",
    "walkthrough.md"
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Replace the base URL
        content = content.replace("https://misbah-37.github.io/tangent/", "https://runtangent.com/")
        # Also catch without the trailing slash just in case
        content = content.replace("https://misbah-37.github.io/tangent", "https://runtangent.com")
        # For the legacy OmniTools path in walkthrough
        content = content.replace("misbah-37.github.io/omnitools-web/", "runtangent.com (formerly omnitools)")
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Skipped {filepath} (Not Found)")
