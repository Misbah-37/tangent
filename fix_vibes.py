import re

def fix_vibration(filepath, stage_class, fit_func_name):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Remove transition to stop stuttering
    html = html.replace('transition: transform 0.15s ease-out;', '')
    
    # 2. Force overflow-y: scroll to prevent scrollbar-toggle infinite loops
    html = html.replace(f'.{stage_class} {{ overflow: auto !important;', f'.{stage_class} {{ overflow-y: scroll !important; overflow-x: auto !important;')

    # 3. Debounce the ResizeObserver
    old_ro = f"const ro = new ResizeObserver(() => {fit_func_name}());"
    new_ro = f"""let resizeTimer;
    const ro = new ResizeObserver(() => {{
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {fit_func_name}(), 50);
    }});"""
    html = html.replace(old_ro, new_ro)
    
    # Also fix margin: auto which might clash with flex-start
    html = html.replace('margin: auto;', 'margin: 0 auto;')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

fix_vibration('src/tools/invoice-generator.html', 'paper-container', 'fitInvoiceSheet')
fix_vibration('src/tools/resume-builder.html', 'paper-stage', 'fitResumeSheet')
