(() => {
  'use strict';

  const CURRENT_VERSION = document.documentElement.dataset.appVersion || '1.1.0';
  const versionBtn = document.getElementById('versionBtn');
  if (!versionBtn) return;

  const defaultLabel = `גרסה ${CURRENT_VERSION}`;
  versionBtn.textContent = defaultLabel;

  const indicatorStyle = document.createElement('style');
  indicatorStyle.textContent = `
    .version-btn { position: relative; }
    .version-btn.update-available::after {
      content: '';
      position: absolute;
      top: -3px;
      right: -3px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #08111f;
      box-shadow: 0 0 0 2px rgba(239,68,68,.18), 0 0 12px rgba(239,68,68,.7);
      pointer-events: none;
    }
  `;
  document.head.appendChild(indicatorStyle);

  function setUpdateIndicator(show) {
    versionBtn.classList.toggle('update-available', Boolean(show));
    versionBtn.setAttribute('aria-label', show ? 'קיימת גרסה חדשה — לחץ לעדכון' : 'בדוק אם קיימת גרסה חדשה');
  }

  function versionParts(value) {
    return String(value || '0')
      .replace(/^v/i, '')
      .split('.')
      .map(part => Number.parseInt(part, 10) || 0);
  }

  function isNewerVersion(latest, current) {
    const a = versionParts(latest);
    const b = versionParts(current);
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      const left = a[i] || 0;
      const right = b[i] || 0;
      if (left > right) return true;
      if (left < right) return false;
    }
    return false;
  }

  async function fetchLatestVersion() {
    const response = await fetch(`./version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || !data.version) throw new Error('Missing version');
    return data;
  }

  async function clearAppCaches() {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('al-harosh-'))
        .map(key => caches.delete(key))
    );
  }

  async function applyUpdate(latestVersion) {
    versionBtn.disabled = true;
    versionBtn.textContent = 'מעדכן…';

    try {
      await clearAppCaches();

      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          try { await registration.update(); } catch (_) {}
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }

      const nextUrl = new URL('./', window.location.href);
      nextUrl.searchParams.set('updated', latestVersion);
      nextUrl.searchParams.set('t', Date.now().toString());
      window.location.replace(nextUrl.toString());
    } catch (error) {
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;
      alert('לא הצלחתי להשלים את העדכון. נסה שוב בעוד רגע.');
    }
  }

  async function silentCheckForUpdate() {
    try {
      const latest = await fetchLatestVersion();
      setUpdateIndicator(isNewerVersion(latest.version, CURRENT_VERSION));
    } catch (_) {
      // Silent by design: entering the game must never be interrupted by a network error.
    }
  }

  async function checkForUpdate() {
    if (versionBtn.disabled) return;
    versionBtn.disabled = true;
    versionBtn.textContent = 'בודק עדכון…';

    try {
      const latest = await fetchLatestVersion();
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;

      if (isNewerVersion(latest.version, CURRENT_VERSION)) {
        setUpdateIndicator(true);
        const notes = latest.notes ? `\n\n${latest.notes}` : '';
        const shouldUpdate = window.confirm(
          `יש גרסה חדשה: ${latest.version}\nהגרסה אצלך: ${CURRENT_VERSION}${notes}\n\nלעדכן עכשיו?`
        );
        if (shouldUpdate) await applyUpdate(latest.version);
        return;
      }

      setUpdateIndicator(false);
      alert(`יש לך את הגרסה העדכנית (${CURRENT_VERSION}).`);
    } catch (error) {
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;
      alert('לא ניתן לבדוק כרגע אם קיים עדכון חדש.');
    }
  }

  versionBtn.addEventListener('click', checkForUpdate);
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', silentCheckForUpdate, { once: true });
  } else {
    silentCheckForUpdate();
  }
})();
