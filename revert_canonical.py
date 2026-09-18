import sys

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<link rel=\"canonical\" href=\"https://runtangent.com/\" />\n", "")
content = content.replace("<link rel=\"canonical\" href=\"https://runtangent.com/{fname.replace(\".html\", \"\")}\" />\n", "")

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Reverted canonical tags")
