import re

with open("src/tools/qr-generator.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. Swap the script tag
html = re.sub(
    r'<script src="https://cdn\.jsdelivr\.net/npm/qrcode[^"]+"></script>',
    '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>',
    html
)

# 2. Swap canvas to div
html = html.replace('<canvas id="qrCanvas"></canvas>', '<div id="qrCanvas"></div>')

# 3. Rewrite generateQR, downloadPNG, copyQRImage
def replace_func(func_name, new_impl, text):
    start = text.find(f"function {func_name}() {{")
    if start == -1:
        start = text.find(f"async function {func_name}() {{")
    
    # find the matching closing brace
    brace_count = 0
    end = -1
    for i in range(start, len(text)):
        if text[i] == '{':
            brace_count += 1
        elif text[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                end = i + 1
                break
    
    return text[:start] + new_impl + text[end:]

generate_qr_impl = """function generateQR() {
    const payload = getPayload();
    const size = parseInt(sizeSelect.value) || 600;
    const fg = fgColorInput.value;
    const bg = bgColorInput.value;

    document.getElementById('fgHex').textContent = fg.toUpperCase();
    document.getElementById('bgHex').textContent = bg.toUpperCase();

    qrCanvas.innerHTML = '';
    new QRCode(qrCanvas, {
      text: payload,
      width: size,
      height: size,
      colorDark: fg,
      colorLight: bg,
      correctLevel: QRCode.CorrectLevel.H
    });
  }"""

download_png_impl = """function downloadPNG() {
    const link = document.createElement('a');
    link.download = `Tangent_QR_${activeMode}.png`;
    const canvas = qrCanvas.querySelector('canvas');
    if (canvas) {
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }"""

copy_qr_impl = """async function copyQRImage() {
    const btnText = document.getElementById('copyBtnText');
    try {
      const canvas = qrCanvas.querySelector('canvas');
      if (!canvas) throw new Error("No canvas");
      canvas.toBlob(async (blob) => {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        btnText.textContent = "Copied to Clipboard!";
        setTimeout(() => {
          btnText.textContent = "Copy to Clipboard";
        }, 2000);
      });
    } catch (err) {
      console.warn("Direct clipboard copy failed:", err);
      btnText.textContent = "Right-click QR to copy";
      setTimeout(() => {
        btnText.textContent = "Copy to Clipboard";
      }, 2500);
    }
  }"""

html = replace_func("generateQR", generate_qr_impl, html)
html = replace_func("downloadPNG", download_png_impl, html)
html = replace_func("copyQRImage", copy_qr_impl, html)

with open("src/tools/qr-generator.html", "w", encoding="utf-8") as f:
    f.write(html)
