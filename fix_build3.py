import re

with open("build.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(len(lines)):
    if 'onclick="scrollTrack(' in lines[i]:
        if '-1' in lines[i]:
            lines[i] = '        html.append(f\'        <button class="scroll-btn left" aria-label="Scroll left" onclick="scrollTrack(\\\'\' + track_id + \'\\\', -1)">\')\n'
        else:
            lines[i] = '        html.append(f\'        <button class="scroll-btn right" aria-label="Scroll right" onclick="scrollTrack(\\\'\' + track_id + \'\\\', 1)">\')\n'
    if 'return "' in lines[i] and 'join' in lines[i+1]:
        lines[i] = '        return "\\n".join(html)\n'
        lines[i+1] = ''

with open("build.py", "w", encoding="utf-8") as f:
    f.writelines(lines)
