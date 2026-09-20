document.querySelectorAll('.copy').forEach(button => {
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.target).textContent.trim();
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      button.textContent = 'Select address to copy';
    }
  });
});

const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) {
  const navigation = document.getElementById(menuToggle.getAttribute('aria-controls'));
  const mobileNavigation = window.matchMedia('(max-width: 899px)');
  function setMenuOpen(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    navigation.dataset.collapsed = String(mobileNavigation.matches && !open);
  }
  menuToggle.hidden = false;
  setMenuOpen(false);
  menuToggle.addEventListener('click', () => setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true'));
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });
  mobileNavigation.addEventListener('change', () => setMenuOpen(false));
}
