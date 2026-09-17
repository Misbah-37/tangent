import re

def update_title(filename, new_title):
    with open(f"src/tools/{filename}", "r", encoding="utf-8") as f:
        content = f.read()
    
    content = re.sub(r'<title>.*?</title>', f'<title>{new_title}</title>', content, count=1)
    content = re.sub(r'<meta property="og:title" content=".*?">', f'<meta property="og:title" content="{new_title}">', content, count=1)
    
    with open(f"src/tools/{filename}", "w", encoding="utf-8") as f:
        f.write(content)

update_title("resume-builder.html", "Free Client-Side Resume Builder | Export to PDF Offline | Tangent")
update_title("invoice-generator.html", "Free Offline Invoice Generator | Professional PDF Export | Tangent")
update_title("qr-generator.html", "Free Offline QR Code Generator | No Expiration | Tangent")
update_title("pdf-converter.html", "Offline PDF Converter & Editor | Client-Side Tools | Tangent")
