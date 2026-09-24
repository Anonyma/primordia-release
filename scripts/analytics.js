// The public measurement ID is intentionally kept in one shared site file.
(() => {
  const hostname = window.location.hostname.toLowerCase();
  if (hostname !== 'primordiagrants.com' && hostname !== 'www.primordiagrants.com') return;

  const measurementId = 'G-CL6PVYHE45';
  const storageKey = 'pg-analytics-consent';
  const consent = {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  };
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', consent);

  let choice;
  try { choice = localStorage.getItem(storageKey); } catch { /* Storage can be disabled. */ }
  let loaded = false;
  let googleScript;

  function startAnalytics() {
    if (loaded) return;
    loaded = true;
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
    googleScript = document.createElement('script');
    googleScript.async = true;
    googleScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(googleScript);
  }

  function saveChoice(value) {
    try { localStorage.setItem(storageKey, value); } catch { /* Choice applies to this page. */ }
    choice = value;
    banner.hidden = true;
    if (value === 'accepted') startAnalytics();
    else if (loaded) window.location.reload();
  }

  const banner = document.createElement('section');
  banner.className = 'pg-consent';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Analytics choice');
  banner.innerHTML = '<div class="pg-consent__copy"><strong>Help us improve Primordia</strong><p>With your permission, we use Google Analytics to understand visits to this site. We only load it if you accept. You can change your choice in Cookie settings.</p></div><div class="pg-consent__actions"><button type="button" data-consent="declined">Decline</button><button type="button" data-consent="accepted">Accept analytics</button></div>';
  banner.hidden = choice === 'accepted' || choice === 'declined';
  banner.addEventListener('click', (event) => {
    const value = event.target.closest('button[data-consent]')?.dataset.consent;
    if (value) saveChoice(value);
  });

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'pg-consent-settings';
  settings.textContent = 'Cookie settings';
  settings.addEventListener('click', () => {
    banner.hidden = false;
    banner.querySelector('button').focus();
  });
  const consentStyles = document.querySelector('link[href="/styles/analytics-consent.css"]');
  function mountControls() {
    if (!banner.isConnected) document.body.append(banner);
    if (!settings.isConnected) (document.querySelector('footer') || document.body).append(settings);
    if (consentStyles && !consentStyles.isConnected) document.head.append(consentStyles);
    if (googleScript && !googleScript.isConnected) document.head.append(googleScript);
  }
  mountControls();
  // Image Lab unpacks its app by replacing the document root after load.
  new MutationObserver(() => {
    if (!banner.isConnected || !settings.isConnected || (consentStyles && !consentStyles.isConnected) || (googleScript && !googleScript.isConnected)) mountControls();
  }).observe(document, { childList: true });

  if (choice === 'accepted') startAnalytics();
})();
