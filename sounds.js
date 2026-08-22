(() => {
  'use strict';

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

  function injectRoundControlsStyle() {
    if (document.getElementById('roundControlsStyle')) return;
    const style = document.createElement('style');
    style.id = 'roundControlsStyle';
    style.textContent = `
      #countdownScreen .round-exit-btn,
      #gameScreen .round-exit-btn {
        position: absolute;
        left: max(12px, env(safe-area-inset-left));
        top: max(12px, env(safe-area-inset-top));
        z-index: 40;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(15,23,42,.78);
        color: #f8fafc;
        border-radius: 999px;
        padding: 7px 11px;
        font-size: .8rem;
        font-weight: 900;
        backdrop-filter: blur(10px);
      }
      #countdownScreen .round-exit-btn:active,
      #gameScreen .round-exit-btn:active { transform: scale(.96); }
      #countdownScreen .game-topline,
      #gameScreen .game-topline { padding-left: 86px; }
      .result-status.timeout { color: var(--accent, #ffcc4d); }
    `;
    document.head.appendChild(style);
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

  injectRoundControlsStyle();
  addExitButton('countdownScreen', 'countdownExitBtn');
  addExitButton('gameScreen', 'gameExitBtn');
  setupTimeoutWordResult();
})();
