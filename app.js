(() => {
  'use strict';

  const decks = Array.isArray(window.HEBREW_DECKS) ? window.HEBREW_DECKS : [];
  const hardWords = window.HARD_WORDS || {};
  const screens = [...document.querySelectorAll('.screen')];
  const $ = (id) => document.getElementById(id);

  const els = {
    home: $('homeScreen'), ready: $('readyScreen'), countdown: $('countdownScreen'), game: $('gameScreen'), results: $('resultsScreen'),
    deckGrid: $('deckGrid'), duration: $('durationSelect'), passPenalty: $('passPenalty'), totalWords: $('totalWords'), totalDecks: $('totalDecks'),
    difficultyButtons: [...document.querySelectorAll('[data-difficulty]')],
    customWords: $('customWords'), customCount: $('customCount'), saveCustomBtn: $('saveCustomBtn'),
    readyDeckName: $('readyDeckName'), readyDeckMeta: $('readyDeckMeta'), sensorStartBtn: $('sensorStartBtn'), sensorMessage: $('sensorMessage'), backHomeBtn: $('backHomeBtn'),
    countdownDeck: $('countdownDeck'), countdownNumber: $('countdownNumber'), countdownExitBtn: $('countdownExitBtn'),
    gameDeckName: $('gameDeckName'), timerText: $('timerText'), scoreText: $('scoreText'), wordText: $('wordText'), feedback: $('feedback'), gameExitBtn: $('gameExitBtn'),
    correctBtn: $('correctBtn'), skipBtn: $('skipBtn'), finalScore: $('finalScore'), resultsList: $('resultsList'), playAgainBtn: $('playAgainBtn'), resultsHomeBtn: $('resultsHomeBtn'),
    rulesBtn: $('rulesBtn'), rulesDialog: $('rulesDialog'), closeRulesBtn: $('closeRulesBtn')
  };

  const deckGlows = ['rgba(96,165,250,.38)','rgba(255,204,77,.34)','rgba(52,211,153,.30)','rgba(244,114,182,.28)','rgba(192,132,252,.26)','rgba(251,146,60,.26)'];

  const state = {
    selectedDeck: null,
    roundWords: [],
    currentWord: '',
    history: [],
    score: 0,
    duration: 60,
    remaining: 60,
    difficulty: localStorage.getItem('alHaroshDifficulty') === 'hard' ? 'hard' : 'normal',
    timerId: null,
    countdownId: null,
    isPlaying: false,
    sensorEnabled: false,
    tiltReady: true,
    landscapeSide: 1,
    lastDecisionAt: 0,
    wakeLock: null,
    feedbackTimer: null
  };

  function show(screen) {
    screens.forEach(s => s.classList.toggle('active', s === screen));
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(total) {
    const sec = Math.max(0, total | 0);
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  function difficultyLabel() {
    return state.difficulty === 'hard' ? 'מאתגר 🔥' : 'רגיל';
  }

  function syncDifficultyButtons() {
    els.difficultyButtons.forEach(btn => {
      const active = btn.dataset.difficulty === state.difficulty;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function wordsForDeck(deck) {
    if (state.difficulty === 'hard' && deck.id !== 'custom') {
      const list = hardWords[deck.id];
      if (Array.isArray(list) && list.length >= 3) return list;
    }
    return deck.words;
  }

  function getCustomWords() {
    return (localStorage.getItem('alHaroshCustomWords') || '')
      .split(/\n+/)
      .map(w => w.trim())
      .filter(Boolean);
  }

  function updateCustomCount() {
    const count = getCustomWords().length;
    els.customCount.textContent = count ? `${count} מילים שמורות` : 'עדיין לא נשמרו מילים';
  }

  function getVisibleDecks() {
    const allDecks = [...decks];
    const custom = getCustomWords();
    if (custom.length >= 3) {
      allDecks.push({ id: 'custom', name: 'החבילה שלי', icon: '✍️', description: 'המילים שאתה בוחר בעצמך', words: custom });
    }
    return allDecks;
  }

  function updateTotals(allDecks) {
    els.totalDecks.textContent = allDecks.length;
    const total = allDecks.reduce((sum, deck) => sum + wordsForDeck(deck).length, 0);
    els.totalWords.textContent = total.toLocaleString('he-IL');
  }

  function renderDecks() {
    els.deckGrid.innerHTML = '';
    const allDecks = getVisibleDecks();
    updateTotals(allDecks);

    allDecks.forEach((deck, index) => {
      const activeWords = wordsForDeck(deck);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'deck-card';
      button.style.setProperty('--deck-glow', deckGlows[index % deckGlows.length]);
      const description = deck.description || 'חבילה מעולה למשחק מהיר';
      button.innerHTML = `
        <div class="deck-top">
          <div class="deck-icon-wrap">${deck.icon || '🎴'}</div>
          <div class="deck-count">${activeWords.length} מילים</div>
        </div>
        <div class="deck-body">
          <div class="deck-name">${escapeHtml(deck.name)}</div>
          <div class="deck-desc">${escapeHtml(description)}</div>
        </div>
        <div class="deck-footer">
          <span class="deck-tag">${state.difficulty === 'hard' && deck.id !== 'custom' ? 'מאתגר 🔥' : 'התחל משחק'}</span>
          <span class="deck-arrow">←</span>
        </div>`;
      button.addEventListener('click', () => chooseDeck(deck));
      els.deckGrid.appendChild(button);
    });
  }

  function chooseDeck(deck) {
    const activeWords = [...wordsForDeck(deck)];
    state.selectedDeck = { ...deck, words: activeWords };
    state.duration = Number(els.duration.value) || 60;
    els.readyDeckName.textContent = deck.name;
    els.readyDeckMeta.textContent = `${difficultyLabel()} • ${activeWords.length} מילים • ${deck.description || 'מוכן לסיבוב חדש'}`;
    els.sensorMessage.textContent = '';
    show(els.ready);
  }

  function setDifficulty(value) {
    if (!['normal', 'hard'].includes(value)) return;
    state.difficulty = value;
    localStorage.setItem('alHaroshDifficulty', value);
    syncDifficultyButtons();
    renderDecks();
  }

  function orientationAngle() {
    const angle = screen.orientation && typeof screen.orientation.angle === 'number'
      ? screen.orientation.angle
      : (typeof window.orientation === 'number' ? window.orientation : 90);
    return ((angle % 360) + 360) % 360;
  }

  function detectLandscapeSide() {
    const angle = orientationAngle();
    state.landscapeSide = angle === 270 ? -1 : 1;
  }

  async function requestSensors() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') throw new Error('לא ניתנה הרשאה לחיישני תנועה');
      }
      if (!state.sensorEnabled && 'DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', handleOrientation, true);
        state.sensorEnabled = true;
      }
      detectLandscapeSide();
      return true;
    } catch (err) {
      els.sensorMessage.textContent = `${err.message}. אפשר עדיין לשחק בעזרת הכפתורים.`;
      return false;
    }
  }

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try { state.wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
  }

  async function releaseWakeLock() {
    try { if (state.wakeLock) await state.wakeLock.release(); } catch (_) {}
    state.wakeLock = null;
  }

  function setupRound() {
    const unique = [...new Set(state.selectedDeck.words.map(w => String(w).trim()).filter(Boolean))];
    state.roundWords = shuffle(unique);
    state.history = [];
    state.score = 0;
    state.remaining = state.duration;
    state.currentWord = '';
    updateHud();
  }

  async function beginFlow() {
    await requestSensors();
    await requestWakeLock();
    setupRound();
    detectLandscapeSide();
    els.countdownDeck.textContent = `${state.selectedDeck.name} • ${difficultyLabel()}`;
    show(els.countdown);
    startCountdown();
  }

  function startCountdown() {
    clearInterval(state.countdownId);
    let n = 3;
    els.countdownNumber.textContent = n;
    state.countdownId = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(state.countdownId);
        startRound();
      } else {
        els.countdownNumber.textContent = n;
        vibrate(25);
      }
    }, 800);
  }

  function startRound() {
    state.isPlaying = true;
    state.tiltReady = true;
    state.lastDecisionAt = 0;
    els.gameDeckName.textContent = `${state.selectedDeck.name} • ${state.difficulty === 'hard' ? '🔥' : ''}`;
    show(els.game);
    nextWord();
    updateHud();
    clearInterval(state.timerId);
    const started = Date.now();
    state.timerId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      state.remaining = Math.max(0, state.duration - elapsed);
      updateHud();
      if (state.remaining <= 0) finishRound();
    }, 200);
  }

  function nextWord() {
    if (!state.roundWords.length) {
      state.roundWords = shuffle([...new Set(state.selectedDeck.words)]);
    }
    state.currentWord = state.roundWords.shift() || 'אין מילים';
    els.wordText.textContent = state.currentWord;
  }

  function updateHud() {
    els.timerText.textContent = formatTime(state.remaining);
    els.scoreText.textContent = `${state.score} נק׳`;
  }

  function decide(type) {
    if (!state.isPlaying) return;
    const now = Date.now();
    if (now - state.lastDecisionAt < 500) return;
    state.lastDecisionAt = now;

    const correct = type === 'correct';
    state.history.push({ word: state.currentWord, type });
    state.score += correct ? 1 : (els.passPenalty.checked ? -1 : 0);
    showFeedback(correct);
    vibrate(correct ? [30, 35, 30] : 55);
    nextWord();
    updateHud();
  }

  function showFeedback(correct) {
    clearTimeout(state.feedbackTimer);
    els.feedback.className = `feedback show ${correct ? 'good' : 'bad'}`;
    els.feedback.textContent = correct ? 'נכון ✓' : 'דילוג ↗';
    state.feedbackTimer = setTimeout(() => {
      els.feedback.className = 'feedback';
      els.feedback.textContent = '';
    }, 330);
  }

  function handleOrientation(event) {
    if (!state.isPlaying || typeof event.gamma !== 'number') return;
    const g = event.gamma;
    const abs = Math.abs(g);
    if (abs >= 60) {
      state.tiltReady = true;
      return;
    }
    if (!state.tiltReady || abs > 30) return;
    state.tiltReady = false;
    const positiveLandscape = state.landscapeSide === 1;
    const isCorrect = positiveLandscape ? g >= 0 : g < 0;
    decide(isCorrect ? 'correct' : 'skip');
  }

  function vibrate(pattern) {
    if ('vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  }

  async function finishRound() {
    if (!state.isPlaying) return;
    if (state.currentWord) state.history.push({ word: state.currentWord, type: 'timeout' });
    state.isPlaying = false;
    clearInterval(state.timerId);
    state.remaining = 0;
    updateHud();
    await releaseWakeLock();
    renderResults();
    show(els.results);
  }

  function renderResults() {
    els.finalScore.textContent = state.score;
    els.resultsList.innerHTML = '';
    if (!state.history.length) {
      els.resultsList.innerHTML = '<div class="result-row"><span>לא נרשמו תשובות בסיבוב</span></div>';
      return;
    }
    state.history.forEach(item => {
      const row = document.createElement('div');
      row.className = 'result-row';
      const statusClass = item.type === 'correct' ? 'good' : (item.type === 'timeout' ? 'timeout' : 'bad');
      const statusText = item.type === 'correct' ? '✓ נכון' : (item.type === 'timeout' ? '⏱ נגמר הזמן' : '↗ דילוג');
      row.innerHTML = `<strong>${escapeHtml(item.word)}</strong><span class="result-status ${statusClass}">${statusText}</span>`;
      els.resultsList.appendChild(row);
    });
  }

  function backHome() {
    state.isPlaying = false;
    clearInterval(state.timerId);
    clearInterval(state.countdownId);
    releaseWakeLock();
    show(els.home);
  }

  function exitRound() {
    if (!window.confirm('לצאת מהמשחק הנוכחי?')) return;
    backHome();
  }

  els.sensorStartBtn.addEventListener('click', beginFlow);
  els.backHomeBtn.addEventListener('click', backHome);
  els.correctBtn.addEventListener('click', () => decide('correct'));
  els.skipBtn.addEventListener('click', () => decide('skip'));
  els.playAgainBtn.addEventListener('click', beginFlow);
  els.resultsHomeBtn.addEventListener('click', backHome);
  if (els.countdownExitBtn) els.countdownExitBtn.addEventListener('click', exitRound);
  if (els.gameExitBtn) els.gameExitBtn.addEventListener('click', exitRound);

  els.difficultyButtons.forEach(btn => btn.addEventListener('click', () => setDifficulty(btn.dataset.difficulty)));

  els.saveCustomBtn.addEventListener('click', () => {
    const words = els.customWords.value.split(/\n+/).map(w => w.trim()).filter(Boolean);
    localStorage.setItem('alHaroshCustomWords', words.join('\n'));
    updateCustomCount();
    renderDecks();
    els.saveCustomBtn.textContent = 'נשמר ✓';
    setTimeout(() => els.saveCustomBtn.textContent = 'שמור חבילה', 900);
  });

  els.rulesBtn.addEventListener('click', () => els.rulesDialog.showModal());
  els.closeRulesBtn.addEventListener('click', () => els.rulesDialog.close());
  els.rulesDialog.addEventListener('click', (e) => {
    const r = els.rulesDialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) els.rulesDialog.close();
  });

  window.addEventListener('orientationchange', detectLandscapeSide);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', detectLandscapeSide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.isPlaying) requestWakeLock();
  });
  window.addEventListener('beforeunload', () => releaseWakeLock());

  const savedCustom = localStorage.getItem('alHaroshCustomWords') || '';
  els.customWords.value = savedCustom;
  syncDifficultyButtons();
  updateCustomCount();
  renderDecks();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
