
with open('src/tools/csv-insights.html', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('\\\', '\')
c = c.replace('\\\$', '\$')
with open('src/tools/csv-insights.html', 'w', encoding='utf-8') as f:
    f.write(c)

