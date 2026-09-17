import os
import re

tools_dir = "src/tools"
for file in os.listdir(tools_dir):
    if file.endswith(".html"):
        with open(os.path.join(tools_dir, file), "r", encoding="utf-8") as f:
            content = f.read()
            match = re.search(r'<title>(.*?)</title>', content)
            if match:
                print(f"{file}: {match.group(1)}")
