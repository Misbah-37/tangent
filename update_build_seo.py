import re

with open("build.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add structured data generation in the loop
old_code = """        hm, ts, ct, sc = parse_fragment_file(t_frag)
        
        t_compiled = shell_template"""

new_code = """        hm, ts, ct, sc = parse_fragment_file(t_frag)
        
        # Inject JSON-LD Structured Data for this tool
        title = tool.get("title", "").replace('"', '\\"')
        desc = tool.get("cardDesc", "").replace('"', '\\"')
        cat = tool.get("category", "Utilities").replace(" ", "") + "Application"
        ld_json = f'''
<!-- Structured Data for {title} -->
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "{title} | Tangent",
  "description": "{desc}",
  "applicationCategory": "{cat}",
  "operatingSystem": "All",
  "url": "https://misbah-37.github.io/tangent/{fname}",
  "offers": {{
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "USD"
  }}
}}
</script>
'''
        hm = hm + ld_json
        
        t_compiled = shell_template"""

if old_code in content:
    content = content.replace(old_code, new_code)
else:
    print("WARNING: Could not find old code to replace in build.py")

with open("build.py", "w", encoding="utf-8") as f:
    f.write(content)
