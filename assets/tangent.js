(() => {
  'use strict';
  const toolkitToggle = document.getElementById('toolkitToggle');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const tangentSidebar = document.getElementById('tangentSidebar');

  let isLocked = false;
  let hoverTimeout;

  function setSidebarState(isOpen, updateStorage = false) {
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
    if (localStorage.getItem('tangent_sidebar_open') === 'true' && window.innerWidth > 1024) {
      isLocked = true;
      setSidebarState(true, false);
    }
  } catch (e) {}

  function handleMouseEnter() {
    if (window.innerWidth <= 960) return; // Mobile uses click only
    clearTimeout(hoverTimeout);
    if (!isLocked) {
      setSidebarState(true, false);
    }
  }

  function handleMouseLeave() {
    if (window.innerWidth <= 960) return;
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      if (!isLocked) {
        setSidebarState(false, false);
      }
    }, 150); // Delay prevents closing immediately when moving cursor between button and sidebar
  }

  if (toolkitToggle) {
    toolkitToggle.addEventListener('mouseenter', handleMouseEnter);
    toolkitToggle.addEventListener('mouseleave', handleMouseLeave);
    
    toolkitToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      isLocked = !isLocked;
      setSidebarState(isLocked, true);
    });
  }

  if (tangentSidebar) {
    tangentSidebar.addEventListener('mouseenter', handleMouseEnter);
    tangentSidebar.addEventListener('mouseleave', handleMouseLeave);
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      isLocked = false;
      setSidebarState(false, true);
    });
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      isLocked = false;
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
      isLocked = false;
      setSidebarState(false, true);
      if (navLinks) {
        navLinks.classList.remove('open');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
})();
function scrollTrack(trackId, direction) {
  const track = document.getElementById(trackId);
  if (track) {
    const scrollAmount = direction * (280 + 20); // card width + gap
    track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}
