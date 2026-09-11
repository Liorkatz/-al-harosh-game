(() => {
  'use strict';

  document.documentElement.dataset.appVersion = '1.2.1';

  let audioCtx = null;
  let lastFeedbackAt = 0;
  let lastCountdownSecond = null;

  function getAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      return audioCtx;
    } catch (_) {
      return null;
    }
  }

  function tone(freq, duration = 0.08, delay = 0, volume = 0.09, type = 'sine') {
    try {
      const ctx = getAudio();
      if (!ctx) return;
      const startAt = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    } catch (_) {}
  }

  function correctSound() {
    tone(660, 0.075, 0, 0.10, 'sine');
    tone(830, 0.075, 0.07, 0.10, 'sine');
    tone(1040, 0.11, 0.14, 0.11, 'sine');
  }

  function skipSound() {
    tone(300, 0.10, 0, 0.09, 'triangle');
    tone(190, 0.13, 0.085, 0.08, 'triangle');
  }

  function countdownBeep() {
    tone(920, 0.075, 0, 0.085, 'square');
  }

  function primeAudio() {
    getAudio();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[ch]));
  }

  function injectGameFlowStyle() {
    if (document.getElementById('gameFlowStyle')) return;
    const style = document.createElement('style');
    style.id = 'gameFlowStyle';
    style.textContent = `
      #playerSetupScreen { display: none !important; }

      .match-players-bar {
        align-items: center;
        gap: 8px;
      }
      #inlinePlayersPanel {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        width: 100%;
      }
      #inlinePlayersPanel .player-count-block {
        margin: 0;
        min-width: 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 7px;
        font-size: .82rem;
      }
      #inlinePlayersPanel .player-count-block select {
        min-width: 88px;
        padding: 8px 10px;
        border-radius: 12px;
      }
      #inlineNamesToggle {
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: var(--text);
        border-radius: 999px;
        padding: 7px 10px;
        font-size: .78rem;
        font-weight: 800;
      }
      #inlineNamesWrap {
        width: 100%;
        display: none;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
        padding-top: 6px;
      }
      #inlineNamesWrap.open { display: grid; }
      #inlineNamesWrap .player-names {
        display: contents;
      }
      #inlineNamesWrap .player-name-field {
        min-width: 0;
      }
      #inlineNamesWrap #startPlayersBtn { display: none !important; }
      #changePlayersBtn { display: none !important; }

      #countdownScreen .game-exit-btn,
      #gameScreen .game-exit-btn,
      #countdownScreen .round-exit-btn,
      #gameScreen .round-exit-btn {
        position: absolute !important;
        left: max(8px, env(safe-area-inset-left)) !important;
        top: max(8px, env(safe-area-inset-top)) !important;
        z-index: 60 !important;
        border: 1px solid rgba(255,255,255,.14) !important;
        background: rgba(7,16,29,.72) !important;
        color: rgba(255,255,255,.88) !important;
        border-radius: 999px !important;
        padding: 5px 8px !important;
        min-height: 0 !important;
        font-size: .68rem !important;
        line-height: 1 !important;
        font-weight: 800 !important;
        opacity: .82;
        backdrop-filter: blur(10px);
      }
      #countdownScreen .game-exit-btn:active,
      #gameScreen .game-exit-btn:active,
      #countdownScreen .round-exit-btn:active,
      #gameScreen .round-exit-btn:active { transform: scale(.95); }

      .gesture-help { display: none !important; }
      .fallback-controls {
        display: flex !important;
        justify-content: center;
        align-items: center;
        gap: 6px !important;
        margin-top: 2px;
        opacity: .64;
      }
      .fallback-controls button {
        width: auto !important;
        min-width: 70px !important;
        padding: 5px 10px !important;
        border-radius: 999px !important;
        font-size: .72rem !important;
        line-height: 1.1 !important;
        box-shadow: none !important;
      }

      #gameScreen .feedback {
        inset: auto auto 42px 50% !important;
        width: auto !important;
        height: auto !important;
        min-width: 0 !important;
        padding: 7px 12px !important;
        border-radius: 999px !important;
        font-size: .88rem !important;
        line-height: 1 !important;
        transform: translateX(-50%) !important;
        z-index: 45 !important;
        box-shadow: 0 10px 26px rgba(0,0,0,.24);
      }
      #gameScreen .feedback.show { animation: none !important; }

      #lastTenClock {
        display: none;
        position: absolute;
        z-index: 50;
        top: max(58px, calc(env(safe-area-inset-top) + 44px));
        left: 50%;
        transform: translateX(-50%);
        min-width: 82px;
        padding: 6px 14px;
        border-radius: 18px;
        text-align: center;
        font-size: clamp(2rem, 8vw, 3.8rem);
        line-height: 1;
        font-weight: 1000;
        font-variant-numeric: tabular-nums;
        color: #fff;
        background: rgba(7,16,29,.72);
        border: 1px solid rgba(255,255,255,.16);
        box-shadow: 0 14px 34px rgba(0,0,0,.28);
        backdrop-filter: blur(10px);
        pointer-events: none;
      }
      #lastTenClock.show {
        display: block;
        animation: lastTenPulse .45s ease-out;
      }
      #lastTenClock.critical {
        color: #fff7d6;
        border-color: rgba(250,204,21,.48);
        box-shadow: 0 0 0 1px rgba(250,204,21,.12), 0 14px 38px rgba(0,0,0,.30);
      }
      @keyframes lastTenPulse {
        0% { transform: translateX(-50%) scale(.86); opacity: .45; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }

      .result-status.timeout { color: var(--accent, #ffcc4d); }

      @media (orientation: landscape) and (max-height: 600px) {
        #lastTenClock {
          top: max(42px, calc(env(safe-area-inset-top) + 32px));
          font-size: clamp(1.8rem, 9vh, 3rem);
          padding: 4px 12px;
        }
        .fallback-controls button {
          padding: 4px 9px !important;
          font-size: .68rem !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function setupInlinePlayers() {
    const setup = document.getElementById('playerSetupScreen');
    const home = document.getElementById('homeScreen');
    const bar = document.querySelector('.match-players-bar');
    const countBlock = setup && setup.querySelector('.player-count-block');
    const names = document.getElementById('playerNames');
    const startBtn = document.getElementById('startPlayersBtn');
    const note = setup && setup.querySelector('.player-setup-note');
    const changeBtn = document.getElementById('changePlayersBtn');
    if (!setup || !home || !bar || !countBlock || !names || !startBtn) return;

    const panel = document.createElement('div');
    panel.id = 'inlinePlayersPanel';

    const namesToggle = document.createElement('button');
    namesToggle.id = 'inlineNamesToggle';
    namesToggle.type = 'button';
    namesToggle.textContent = 'שמות שחקנים';

    const namesWrap = document.createElement('div');
    namesWrap.id = 'inlineNamesWrap';

    if (note) note.remove();
    if (changeBtn) changeBtn.style.display = 'none';

    namesWrap.appendChild(names);
    namesWrap.appendChild(startBtn);
    panel.appendChild(countBlock);
    panel.appendChild(namesToggle);
    panel.appendChild(namesWrap);
    bar.appendChild(panel);

    namesToggle.addEventListener('click', () => {
      const open = namesWrap.classList.toggle('open');
      namesToggle.textContent = open ? 'סגור שמות' : 'שמות שחקנים';
    });

    const playerCount = document.getElementById('playerCount');
    if (playerCount) {
      playerCount.addEventListener('change', () => {
        setTimeout(() => startBtn.click(), 0);
      });
    }
    names.addEventListener('change', () => startBtn.click());

    startBtn.click();
  }

  function setupTopbarVisibility() {
    const topbar = document.querySelector('.topbar');
    const home = document.getElementById('homeScreen');
    const screens = [...document.querySelectorAll('.screen')];
    if (!topbar || !home || !screens.length) return;

    const sync = () => {
      topbar.style.display = home.classList.contains('active') ? '' : 'none';
    };

    screens.forEach(screen => {
      new MutationObserver(sync).observe(screen, { attributes: true, attributeFilter: ['class'] });
    });
    sync();
  }

  function addExitButton(screenId, buttonId) {
    const screen = document.getElementById(screenId);
    if (!screen || document.getElementById(buttonId)) return;
    const btn = document.createElement('button');
    btn.id = buttonId;
    btn.type = 'button';
    btn.className = 'round-exit-btn';
    btn.textContent = 'יציאה ✕';
    btn.setAttribute('aria-label', 'יציאה מהמשחק');
    btn.addEventListener('click', () => {
      if (!window.confirm('לצאת מהמשחק הנוכחי?')) return;
      const homeBtn = document.getElementById('resultsHomeBtn');
      if (homeBtn) homeBtn.click();
    });
    screen.appendChild(btn);
  }

  function setupLastTenClock() {
    const game = document.getElementById('gameScreen');
    const timer = document.getElementById('timerText');
    if (!game || !timer) return;

    const clock = document.createElement('div');
    clock.id = 'lastTenClock';
    clock.setAttribute('aria-live', 'polite');
    game.appendChild(clock);

    let previousSecond = null;
    const sync = () => {
      const match = timer.textContent.trim().match(/^(\d{2}):(\d{2})$/);
      if (!match) {
        clock.className = '';
        return;
      }
      const seconds = Number(match[1]) * 60 + Number(match[2]);
      if (seconds > 0 && seconds <= 10) {
        clock.textContent = String(seconds);
        if (seconds !== previousSecond) {
          clock.className = '';
          void clock.offsetWidth;
        }
        clock.className = `show${seconds <= 5 ? ' critical' : ''}`;
        previousSecond = seconds;
      } else {
        clock.className = '';
        previousSecond = null;
      }
    };

    new MutationObserver(sync).observe(timer, { childList: true, characterData: true, subtree: true });
    sync();
  }

  function setupTimeoutWordResult() {
    const resultsScreen = document.getElementById('resultsScreen');
    const resultsList = document.getElementById('resultsList');
    const timer = document.getElementById('timerText');
    const word = document.getElementById('wordText');
    if (!resultsScreen || !resultsList || !timer || !word) return;

    const observer = new MutationObserver(() => {
      const active = resultsScreen.classList.contains('active');
      if (!active) {
        delete resultsScreen.dataset.timeoutWordAdded;
        return;
      }
      if (resultsScreen.dataset.timeoutWordAdded === '1') return;
      if (timer.textContent.trim() !== '00:00') return;

      const lastWord = word.textContent.trim();
      if (!lastWord) return;

      if (resultsList.textContent.includes('לא נרשמו תשובות בסיבוב')) {
        resultsList.innerHTML = '';
      }

      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `<strong>${escapeHtml(lastWord)}</strong><span class="result-status timeout">⏱ נגמר הזמן</span>`;
      resultsList.appendChild(row);
      resultsScreen.dataset.timeoutWordAdded = '1';
    });

    observer.observe(resultsScreen, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('pointerdown', primeAudio, { once: true, capture: true });
  const startBtn = document.getElementById('sensorStartBtn');
  if (startBtn) startBtn.addEventListener('click', primeAudio, { capture: true });

  const feedback = document.getElementById('feedback');
  if (feedback) {
    const feedbackObserver = new MutationObserver(() => {
      if (!feedback.classList.contains('show')) return;
      const now = performance.now();
      if (now - lastFeedbackAt < 180) return;
      lastFeedbackAt = now;
      if (feedback.classList.contains('good')) correctSound();
      else if (feedback.classList.contains('bad')) skipSound();
    });
    feedbackObserver.observe(feedback, { attributes: true, childList: true, characterData: true, subtree: true });
  }

  const timer = document.getElementById('timerText');
  if (timer) {
    const timerObserver = new MutationObserver(() => {
      const match = timer.textContent.trim().match(/^00:0([1-5])$/);
      if (!match) {
        if (!/^00:0[1-5]$/.test(timer.textContent.trim())) lastCountdownSecond = null;
        return;
      }
      const second = Number(match[1]);
      if (second === lastCountdownSecond) return;
      lastCountdownSecond = second;
      countdownBeep();
    });
    timerObserver.observe(timer, { childList: true, characterData: true, subtree: true });
  }

  injectGameFlowStyle();
  setupInlinePlayers();
  setupTopbarVisibility();
  addExitButton('countdownScreen', 'countdownExitBtn');
  addExitButton('gameScreen', 'gameExitBtn');
  setupLastTenClock();
  setupTimeoutWordResult();
})();