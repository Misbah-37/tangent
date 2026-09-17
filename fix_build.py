with open("build.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(len(lines)):
    if 'return "' in lines[i] and '".join(html)' in lines[i+1]:
        lines[i] = '        return "\\n".join(html)\n'
        lines[i+1] = ''

with open("build.py", "w", encoding="utf-8") as f:
    f.writelines(lines)
