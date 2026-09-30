(() => {
  'use strict';
  const toolkitToggle = document.getElementById('toolkitToggle');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const tangentSidebar = document.getElementById('tangentSidebar');

  let isSidebarOpen = false;

  function setSidebarState(isOpen, updateStorage = false) {
    isSidebarOpen = isOpen;
    if (isOpen) {
      document.body.classList.add('sidebar-open');
      if (toolkitToggle) toolkitToggle.setAttribute('aria-expanded', 'true');
    } else {
      document.body.classList.remove('sidebar-open');
      if (toolkitToggle) toolkitToggle.setAttribute('aria-expanded', 'false');
    }
    if (updateStorage) {
      try { localStorage.setItem('tangent_sidebar_open', isOpen ? 'true' : 'false'); } catch (e) {}
    }
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  }

  // Restore desktop state on load
  try {
    const stored = localStorage.getItem('tangent_sidebar_open');
    if (stored !== 'false' && window.innerWidth > 1024) {
      setSidebarState(true, false);
    }
  } catch (e) {}

  if (toolkitToggle) {
    toolkitToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setSidebarState(!isSidebarOpen, true);
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      setSidebarState(false, true);
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      setSidebarState(false, true);
    });
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Handle collapsible sidebar categories
  document.querySelectorAll('.sidebar-group-title').forEach(title => {
    title.addEventListener('click', (e) => {
      e.stopPropagation();
      const group = title.closest('.sidebar-group');
      if (group) {
        group.classList.toggle('open');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setSidebarState(false, true);
      if (navLinks) {
        navLinks.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
  // Toolkit Search / Filter
  const toolkitSearch = document.getElementById('toolkitSearch');
  if (toolkitSearch && tangentSidebar) {
    toolkitSearch.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase().trim();
      const terms = query.split(/\s+/).filter(t => t.length > 0);
      const categories = tangentSidebar.querySelectorAll('.sidebar-group');
      
      categories.forEach(cat => {
        const links = cat.querySelectorAll('.sidebar-item');
        let hasVisibleLink = false;
        
        links.forEach(link => {
          const searchIdx = (link.getAttribute('data-search-index') || '').toLowerCase();
          const title = (link.textContent || '').toLowerCase();
          
          let matches = true;
          for (let i = 0; i < terms.length; i++) {
            if (!searchIdx.includes(terms[i]) && !title.includes(terms[i])) {
              matches = false;
              break;
            }
          }
          
          if (terms.length === 0 || matches) {
            link.style.display = 'flex';
            hasVisibleLink = true;
          } else {
            link.style.display = 'none';
          }
        });
        
        // Hide category header if all links are hidden
        if (hasVisibleLink) {
          cat.style.display = 'block';
          // Auto-expand the accordion if there's a search term
          if (terms.length > 0) {
            cat.classList.add('open');
          }
        } else {
          cat.style.display = 'none';
        }
      });
    });
  }

  // Cmd/Ctrl + K to focus search
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (!isSidebarOpen) {
        setSidebarState(true, true);
      }
      if (toolkitSearch) {
        setTimeout(() => toolkitSearch.focus(), 50);
      }
    }
  });

  // Theme Toggle Logic
  const themeToggle = document.getElementById('themeToggle');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  function updateThemeUI(isLight) {
    if (sunIcon && moonIcon) {
      if (isLight) {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  }

  // Initialize UI based on current attribute (set by head script)
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  updateThemeUI(isLight);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isCurrentlyLight) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('tangent_theme', 'dark'); } catch(e){}
        updateThemeUI(false);
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('tangent_theme', 'light'); } catch(e){}
        updateThemeUI(true);
      }
      
      // Dispatch custom event for tools that use canvas (e.g. Chart.js)
      window.dispatchEvent(new Event('themechange'));
    });
  }
})();
