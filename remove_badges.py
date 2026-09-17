import json

with open("tools.json", "r", encoding="utf-8") as f:
    tools = json.load(f)

for t in tools:
    if "badge" in t:
        del t["badge"]

with open("tools.json", "w", encoding="utf-8") as f:
    json.dump(tools, f, indent=4)
