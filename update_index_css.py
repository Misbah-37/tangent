import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace .grid-container and .tool-card CSS
old_css = """  .grid-container {
    max-width: 1100px;
    margin: 0 auto 100px auto;
    padding: 0 24px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: 24px;
    scroll-margin-top: 100px;
  }

  .tool-card {
    background-color: #121212;
    border: 1px solid #222222;
    border-radius: 14px;
    padding: 36px 30px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
  }"""

new_css = """  .tools-directory {
    max-width: 1200px;
    margin: 0 auto 100px auto;
    display: flex;
    flex-direction: column;
    gap: 48px;
    scroll-margin-top: 100px;
  }

  .category-section {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    margin-bottom: 16px;
  }
  
  .category-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 0;
  }
  
  .carousel-nav {
    display: flex;
    gap: 8px;
  }
  
  .scroll-btn {
    background: transparent;
    border: 1px solid #333;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .scroll-btn:hover {
    border-color: #00d2ff;
    color: #00d2ff;
    background: rgba(0, 210, 255, 0.1);
  }
  
  .carousel-track {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding: 10px 24px 20px 24px;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  .carousel-track::-webkit-scrollbar {
    display: none;
  }
  
  .carousel-track {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .tool-card {
    background-color: #121212;
    border: 1px solid #222222;
    border-radius: 14px;
    padding: 24px;
    text-decoration: none;
    color: inherit;
    transition: border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    overflow: hidden;
    flex: 0 0 auto;
    width: 280px;
    scroll-snap-align: start;
  }"""

# Wait, the regex replacement needs to be careful. I'll just use string replacement if possible.
if old_css in content:
    content = content.replace(old_css, new_css)
else:
    print("WARNING: Could not find old css exactly as formatted.")
    # Fallback to regex
    pattern = re.compile(r'\.grid-container\s*{[\s\S]*?overflow:\s*hidden;\s*}')
    content = pattern.sub(new_css, content, count=1)

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
