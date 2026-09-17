import re

with open("src/index.html", "r", encoding="utf-8") as f:
    content = f.read()

new_css = """  .tools-directory {
    max-width: 1400px;
    margin: 0 auto 100px auto;
    display: flex;
    flex-direction: column;
    gap: 48px;
    scroll-margin-top: 100px;
  }

  .category-section {
    display: flex;
    flex-direction: column;
  }
  
  .category-header {
    padding: 0 40px;
    margin-bottom: 8px;
  }
  
  .category-header h2 {
    font-size: 22px;
    font-weight: 700;
    color: #e5e5e5;
    margin: 0;
  }
  
  .carousel-container {
    position: relative;
  }
  
  .carousel-nav {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    display: flex;
    justify-content: space-between;
    z-index: 10;
  }
  
  .scroll-btn {
    pointer-events: auto;
    width: 60px;
    height: 100%;
    background: transparent;
    border: none;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    cursor: pointer;
    transition: opacity 0.3s ease, background 0.3s ease;
  }
  
  .scroll-btn.left {
    background: linear-gradient(to right, rgba(10,13,20, 0.9) 0%, rgba(10,13,20, 0) 100%);
  }
  
  .scroll-btn.right {
    background: linear-gradient(to left, rgba(10,13,20, 0.9) 0%, rgba(10,13,20, 0) 100%);
  }
  
  .carousel-container:hover .scroll-btn {
    opacity: 1;
  }
  
  .scroll-btn:hover {
    color: #00d2ff;
  }
  .scroll-btn.left:hover {
    background: linear-gradient(to right, rgba(10,13,20, 1) 0%, rgba(10,13,20, 0.2) 100%);
  }
  .scroll-btn.right:hover {
    background: linear-gradient(to left, rgba(10,13,20, 1) 0%, rgba(10,13,20, 0.2) 100%);
  }
  
  .carousel-track {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding: 20px 40px; /* 40px edge padding, 20px top/bottom for hover scale */
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    box-sizing: border-box;
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
    border-radius: 8px;
    padding: 24px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    position: relative;
    flex: 0 0 320px;
    width: 320px;
    aspect-ratio: 3 / 2;
    scroll-snap-align: start;
    box-sizing: border-box;
  }
  
  .tool-card:hover {
    transform: scale(1.05);
    z-index: 2;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    border-color: #00d2ff;
    background-color: #1a1a1a;
  }
  
  @media (max-width: 768px) {
    .tool-card {
      flex: 0 0 280px;
      width: 280px;
    }
    .scroll-btn {
      display: none; /* Hide edge arrows on mobile touch devices */
    }
    .carousel-track {
      padding: 20px 16px; /* Smaller edge padding on mobile */
    }
    .category-header {
      padding: 0 16px;
    }
  }
"""

# Replace all of it
pattern = re.compile(r'\.tools-directory\s*{[\s\S]*?scroll-snap-align:\s*start;\s*}')
content = pattern.sub(new_css, content, count=1)

with open("src/index.html", "w", encoding="utf-8") as f:
    f.write(content)
