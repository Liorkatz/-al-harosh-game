(() => {
  'use strict';

  const HTML_VERSION = document.documentElement.dataset.appVersion || '1.1.0';
  const versionBtn = document.getElementById('versionBtn');
  if (!versionBtn) return;

  const INSTALLED_VERSION_KEY = 'alHaroshInstalledVersion';
  const CURRENT_ENTRY = './app-current.html';

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

  let installedVersion = '';
  try { installedVersion = localStorage.getItem(INSTALLED_VERSION_KEY) || ''; } catch (_) {}
  const CURRENT_VERSION = installedVersion && isNewerVersion(installedVersion, HTML_VERSION)
    ? installedVersion
    : HTML_VERSION;

  const defaultLabel = `גרסה ${CURRENT_VERSION}`;
  versionBtn.textContent = defaultLabel;
  let latestAvailable = null;

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
    .update-dialog {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 22px;
      padding: 0;
      color: #f8fafc;
      background: linear-gradient(155deg, #13233d, #08111f 70%);
      box-shadow: 0 28px 90px rgba(0,0,0,.55);
    }
    .update-dialog::backdrop { background: rgba(2,6,23,.72); backdrop-filter: blur(5px); }
    .update-dialog-card { padding: 22px; text-align: right; direction: rtl; }
    .update-dialog-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(239,68,68,.12);
      border: 1px solid rgba(239,68,68,.28);
      color: #fecaca;
      font-size: .82rem;
      font-weight: 900;
    }
    .update-dialog h3 { margin: 14px 0 5px; font-size: 1.45rem; }
    .update-dialog-current { margin: 0 0 16px; color: #94a3b8; font-size: .88rem; }
    .update-dialog-notes {
      padding: 13px 14px;
      border-radius: 14px;
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.09);
      line-height: 1.55;
      white-space: pre-line;
    }
    .update-dialog-notes strong { display: block; margin-bottom: 5px; color: #fde68a; }
    .update-dialog-actions { display: grid; grid-template-columns: 1fr auto; gap: 9px; margin-top: 18px; }
    .update-now-btn, .update-later-btn {
      min-height: 46px;
      border: 0;
      border-radius: 13px;
      font-weight: 900;
      font: inherit;
    }
    .update-now-btn { background: #facc15; color: #111827; }
    .update-later-btn { padding: 0 15px; background: rgba(255,255,255,.08); color: #e2e8f0; }
  `;
  document.head.appendChild(indicatorStyle);

  function setUpdateIndicator(show) {
    versionBtn.classList.toggle('update-available', Boolean(show));
    versionBtn.setAttribute('aria-label', show ? 'קיימת גרסה חדשה — לחץ לעדכון' : 'בדוק אם קיימת גרסה חדשה');
  }

  function buildCurrentEntry(version) {
    const target = new URL(CURRENT_ENTRY, window.location.href);
    target.searchParams.set('v', version);
    target.searchParams.set('fresh', Date.now().toString());
    return target;
  }

  function redirectToInstalledEntryIfNeeded() {
    try {
      const alreadyOnCurrentEntry = /\/app-current\.html$/.test(window.location.pathname);
      if (!alreadyOnCurrentEntry && installedVersion && isNewerVersion(installedVersion, HTML_VERSION)) {
        window.location.replace(buildCurrentEntry(installedVersion).toString());
        return true;
      }
    } catch (_) {}
    return false;
  }

  if (redirectToInstalledEntryIfNeeded()) return;

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

  async function removeLegacyOfflineLayer() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('al-harosh-')).map(key => caches.delete(key)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister().catch(() => false)));
      }
    } catch (_) {}
  }

  function applyUpdate(latestVersion) {
    versionBtn.disabled = true;
    versionBtn.textContent = 'מעדכן…';
    setUpdateIndicator(false);

    try {
      const bridgeUrl = new URL('./iphone-update-126.html', window.location.href);
      bridgeUrl.searchParams.set('version', latestVersion);
      bridgeUrl.searchParams.set('t', Date.now().toString());
      window.location.assign(bridgeUrl.toString());
    } catch (error) {
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;
      setUpdateIndicator(true);
      alert('לא הצלחתי להתחיל את העדכון. נסה שוב בעוד רגע.');
    }
  }

  function showUpdateDialog(latest) {
    latestAvailable = latest;
    let dialog = document.getElementById('updateDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'updateDialog';
      dialog.className = 'update-dialog';
      dialog.innerHTML = `
        <div class="update-dialog-card">
          <div class="update-dialog-badge">● עדכון זמין</div>
          <h3 id="updateDialogTitle"></h3>
          <p id="updateDialogCurrent" class="update-dialog-current"></p>
          <div class="update-dialog-notes"><strong>מה חדש</strong><span id="updateDialogNotes"></span></div>
          <div class="update-dialog-actions">
            <button id="updateNowBtn" class="update-now-btn" type="button">עדכן עכשיו</button>
            <button id="updateLaterBtn" class="update-later-btn" type="button">אחר כך</button>
          </div>
        </div>`;
      document.body.appendChild(dialog);

      dialog.querySelector('#updateLaterBtn').addEventListener('click', () => dialog.close());
      dialog.querySelector('#updateNowBtn').addEventListener('click', () => {
        if (!latestAvailable) return;
        dialog.close();
        applyUpdate(latestAvailable.version);
      });
      dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
      });
    }

    dialog.querySelector('#updateDialogTitle').textContent = `גרסה חדשה ${latest.version}`;
    dialog.querySelector('#updateDialogCurrent').textContent = `הגרסה אצלך: ${CURRENT_VERSION}`;
    dialog.querySelector('#updateDialogNotes').textContent = latest.notes || 'שיפורים ועדכונים כלליים.';
    if (!dialog.open) dialog.showModal();
  }

  async function silentCheckForUpdate() {
    try {
      const latest = await fetchLatestVersion();
      latestAvailable = latest;
      setUpdateIndicator(isNewerVersion(latest.version, CURRENT_VERSION));
    } catch (_) {}
  }

  async function checkForUpdate() {
    if (versionBtn.disabled) return;
    versionBtn.disabled = true;
    versionBtn.textContent = 'בודק עדכון…';

    try {
      const latest = await fetchLatestVersion();
      latestAvailable = latest;
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;

      if (isNewerVersion(latest.version, CURRENT_VERSION)) {
        setUpdateIndicator(true);
        showUpdateDialog(latest);
        return;
      }

      try { localStorage.setItem(INSTALLED_VERSION_KEY, CURRENT_VERSION); } catch (_) {}
      setUpdateIndicator(false);
      alert(`יש לך את הגרסה העדכנית (${CURRENT_VERSION}).`);
    } catch (error) {
      versionBtn.disabled = false;
      versionBtn.textContent = defaultLabel;
      alert('לא ניתן לבדוק כרגע אם קיים עדכון חדש.');
    }
  }

  versionBtn.addEventListener('click', checkForUpdate);

  window.addEventListener('load', () => {
    setTimeout(removeLegacyOfflineLayer, 300);
    setTimeout(removeLegacyOfflineLayer, 1800);
  });

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', silentCheckForUpdate, { once: true });
  } else {
    silentCheckForUpdate();
  }
})();
