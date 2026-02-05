(() => {
  const TOTAL_QUESTIONS = 25;
  const MAX_WRONG = 3;
  const QUESTION_TIME = 5;
  const FAST_THRESHOLD = 1;
  const FIXED_DT = 1 / 60;

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const startScreen = document.getElementById("start-screen");
  const playScreen = document.getElementById("play-screen");
  const startBtn = document.getElementById("start-btn");
  const hud = document.getElementById("hud");
  const qIndexEl = document.getElementById("q-index");
  const qTotalEl = document.getElementById("q-total");
  const wrongEl = document.getElementById("wrong-count");
  const wrongTotalEl = document.getElementById("wrong-total");
  const timerEl = document.getElementById("timer");
  const scoreEl = document.getElementById("score");
  const questionPanel = document.getElementById("question-panel");
  const flagDisplay = document.getElementById("flag-display");
  const optionsEl = document.getElementById("options");
  const resultPanel = document.getElementById("result-panel");
  const resultTitle = document.getElementById("result-title");
  const endScreen = document.getElementById("end-screen");
  const endTitle = document.getElementById("end-title");
  const finalScoreEl = document.getElementById("final-score");
  const breakdownEl = document.getElementById("score-breakdown");
  const highScoreEl = document.getElementById("highscore");
  const restartBtn = document.getElementById("restart-btn");
  const recordBanner = document.getElementById("record-banner");

  let displayNames = null;
  try {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch (error) {
    displayNames = null;
  }

  const fallbackNames = {
    US: "United States",
    CA: "Canada",
    MX: "Mexico",
    BR: "Brazil",
    AR: "Argentina",
    GB: "United Kingdom",
    FR: "France",
    DE: "Germany",
    IT: "Italy",
    ES: "Spain",
    CN: "China",
    JP: "Japan",
    KR: "South Korea",
    IN: "India",
    AU: "Australia",
    NZ: "New Zealand",
    ZA: "South Africa",
    EG: "Egypt",
    NG: "Nigeria",
    KE: "Kenya",
    TR: "Turkey",
    SA: "Saudi Arabia",
    AE: "United Arab Emirates",
    RU: "Russia",
    SE: "Sweden",
    NO: "Norway",
    FI: "Finland",
    DK: "Denmark",
    NL: "Netherlands",
    BE: "Belgium",
    CH: "Switzerland",
    AT: "Austria",
    PL: "Poland",
    GR: "Greece",
    PT: "Portugal",
    IE: "Ireland",
    IL: "Israel",
    UA: "Ukraine",
  };

  function resolveRegionName(code) {
    if (displayNames) {
      try {
        const name = displayNames.of(code);
        if (name && name !== code) return name;
        return null;
      } catch (error) {
        return null;
      }
    }
    return fallbackNames[code] || null;
  }

  const state = {
    mode: "start",
    questionIndex: 0,
    answeredCount: 0,
    wrongs: 0,
    score: 0,
    basePoints: 0,
    fastCount: 0,
    timeLeftTotal: 0,
    questionOrder: [],
    current: null,
    locked: false,
    resultText: "",
    resultTone: "good",
    endSummary: null,
    endTitle: "",
    layout: {
      optionsTop: null,
      cardBottom: null,
    },
    particles: [],
    highScore: 0,
    newRecord: false,
  };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function shuffle(list) {
    const array = list.slice();
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function makeFlagEmoji(code) {
    const base = 0x1f1e6;
    const chars = code.toUpperCase().split("");
    return String.fromCodePoint(
      base + chars[0].charCodeAt(0) - 65,
      base + chars[1].charCodeAt(0) - 65
    );
  }

  function isFlagEmojiAvailable(code) {
    const emoji = makeFlagEmoji(code);
    const ctx2d = document.createElement("canvas").getContext("2d");
    if (!ctx2d) return false;
    ctx2d.canvas.width = 64;
    ctx2d.canvas.height = 64;
    ctx2d.textBaseline = "top";
    ctx2d.font = "48px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
    ctx2d.clearRect(0, 0, 64, 64);
    ctx2d.fillText(emoji, 0, 0);
    const data = ctx2d.getImageData(0, 0, 64, 64).data;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a === 0) continue;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max - min > 15) {
        colored += 1;
        if (colored > 12) return true;
      }
    }
    return false;
  }

  function buildCountryList() {
    let codes = [];
    if (typeof Intl.supportedValuesOf === "function") {
      try {
        codes = Intl.supportedValuesOf("region").filter((code) => /^[A-Z]{2}$/.test(code));
      } catch (error) {
        codes = [];
      }
    }
    if (codes.length === 0) {
      for (let i = 65; i <= 90; i += 1) {
        for (let j = 65; j <= 90; j += 1) {
          const code = String.fromCharCode(i, j);
          codes.push(code);
        }
      }
    }

    const seen = new Set();
    const countries = [];
    codes.forEach((code) => {
      if (seen.has(code)) return;
      const name = resolveRegionName(code);
      if (!name) return;
      seen.add(code);
      countries.push({ code, name });
    });
    return countries;
  }

  const countries = buildCountryList().filter((entry) => isFlagEmojiAvailable(entry.code));

  function setScreen(mode) {
    const screens = {
      start: startScreen,
      playing: playScreen,
      over: endScreen,
    };
    Object.values(screens).forEach((el) => {
      el.classList.remove("active");
      el.hidden = true;
    });
    const active = screens[mode];
    if (active) {
      active.classList.add("active");
      active.hidden = false;
    }
    document.body.dataset.mode = mode;
    if (mode !== "over") {
      recordBanner.classList.remove("active");
      state.particles = [];
    }
  }

  function createQuestion() {
    const country = state.questionOrder[state.questionIndex];
    if (!country) return null;
    const pool = countries.filter((entry) => entry.code !== country.code);
    const distractors = shuffle(pool).slice(0, 3);
    const options = shuffle([country, ...distractors]);
    return {
      country,
      options,
      correctIndex: options.findIndex((entry) => entry.code === country.code),
      timeRemaining: QUESTION_TIME,
    };
  }

  function updateHud() {
    qIndexEl.textContent = Math.min(state.questionIndex + 1, TOTAL_QUESTIONS);
    qTotalEl.textContent = TOTAL_QUESTIONS;
    wrongEl.textContent = state.wrongs;
    wrongTotalEl.textContent = MAX_WRONG;
    timerEl.textContent = state.current ? state.current.timeRemaining.toFixed(2) : "0.00";
    scoreEl.textContent = Math.floor(state.score);
  }

  function updateOptionsUI() {
    optionsEl.innerHTML = "";
    state.current.options.forEach((entry, index) => {
      const btn = document.createElement("button");
      btn.className = `option-btn slot-${index}`;
      btn.textContent = entry.name;
      btn.dataset.index = String(index);
      btn.tabIndex = -1;
      btn.addEventListener("pointerdown", () => handleAnswer(index));
      optionsEl.appendChild(btn);
    });
  }

  function showResult(message, tone) {
    resultTitle.textContent = message;
    resultTitle.style.color = tone === "good" ? "var(--success)" : "var(--danger)";
    state.resultText = message;
    state.resultTone = tone;
  }

  function startGame() {
    state.mode = "playing";
    state.questionIndex = 0;
    state.answeredCount = 0;
    state.wrongs = 0;
    state.score = 0;
    state.basePoints = 0;
    state.fastCount = 0;
    state.timeLeftTotal = 0;
    state.newRecord = false;
    state.endSummary = null;
    state.endTitle = "";
    state.questionOrder = shuffle(countries).slice(0, TOTAL_QUESTIONS);
    state.current = createQuestion();
    state.locked = false;
    state.resultText = "Pick an answer!";
    recordBanner.classList.remove("active");
    setScreen("playing");
    renderQuestion();
  }

  function renderQuestion() {
    if (!state.current) return;
    updateOptionsUI();
    showResult("Pick an answer!", "good");
    updateHud();
  }

  function awardPoints(isCorrect, timeRemaining) {
    if (!isCorrect) return;
    const levelBonus = state.questionIndex * 100;
    const timePoints = Math.max(0, Math.round(timeRemaining * 100));
    const earned = timePoints + levelBonus;
    state.basePoints += earned;
    if (QUESTION_TIME - timeRemaining <= FAST_THRESHOLD) {
      state.fastCount += 1;
    }
  }

  function getRunningScore() {
    return state.basePoints + state.fastCount * 100;
  }

  function handleAnswer(index) {
    if (state.mode !== "playing" || state.locked || !state.current) return;
    state.locked = true;
    const isCorrect = index === state.current.correctIndex;
    const timeRemaining = state.current.timeRemaining;
    state.timeLeftTotal += timeRemaining;
    awardPoints(isCorrect, timeRemaining);
    state.score = getRunningScore();

    const buttons = Array.from(optionsEl.children);
    buttons.forEach((btn) => {
      const btnIndex = Number(btn.dataset.index);
      if (btnIndex === state.current.correctIndex) {
        btn.classList.add("correct");
      } else if (btnIndex === index) {
        btn.classList.add("wrong");
      }
    });

    if (isCorrect) {
      showResult("Correct!", "good");
    } else {
      state.wrongs += 1;
      showResult("Wrong answer!", "bad");
    }
    updateHud();

    setTimeout(() => {
      advanceQuestion();
    }, 650);
  }

  function handleTimeout() {
    if (state.locked || state.mode !== "playing") return;
    state.locked = true;
    state.wrongs += 1;
    showResult("Time's up!", "bad");
    updateHud();
    setTimeout(() => {
      advanceQuestion();
    }, 650);
  }

  function advanceQuestion() {
    state.answeredCount += 1;
    state.questionIndex += 1;
    if (state.wrongs >= MAX_WRONG) {
      endGame(false);
      return;
    }
    if (state.questionIndex >= TOTAL_QUESTIONS) {
      endGame(true);
      return;
    }
    state.current = createQuestion();
    state.locked = false;
    renderQuestion();
  }

  function computeFinalScore() {
    const perfectBonus = state.wrongs === 0 && state.questionIndex >= TOTAL_QUESTIONS ? 500 : 0;
    const timeBonus = Math.floor(state.timeLeftTotal);
    const fastBonus = state.fastCount * 100;
    const total = state.basePoints + fastBonus + perfectBonus + timeBonus;
    return { total, perfectBonus, timeBonus, fastBonus };
  }

  function endGame(completedAll) {
    state.mode = "over";
    const summary = computeFinalScore();
    state.score = summary.total;
    const answered = Math.min(state.answeredCount, TOTAL_QUESTIONS);
    state.endTitle = completedAll ? "All 25 Flags Cleared" : "Game Over";
    state.endSummary = {
      answered,
      wrongs: state.wrongs,
      basePoints: Math.floor(state.basePoints),
      fastBonus: Math.floor(summary.fastBonus),
      perfectBonus: summary.perfectBonus,
      timeBonus: summary.timeBonus,
      total: Math.floor(summary.total),
    };
    const scoreLine = `Total Score: ${Math.floor(summary.total)}`;
    finalScoreEl.textContent = scoreLine;
    endTitle.textContent = state.endTitle;
    breakdownEl.innerHTML = `
      <div>Questions answered: ${answered} / ${TOTAL_QUESTIONS}</div>
      <div>Wrong answers: ${state.wrongs} / ${MAX_WRONG}</div>
      <div>Question points: ${Math.floor(state.basePoints)}</div>
      <div>Fast answers bonus: ${Math.floor(summary.fastBonus)} (${state.fastCount} fast)</div>
      <div>Perfect run bonus: ${summary.perfectBonus}</div>
      <div>Time left bonus: ${summary.timeBonus}</div>
    `;
    let storedHigh = 0;
    try {
      storedHigh = Number(localStorage.getItem("flagGameHighScore") || 0);
    } catch (error) {
      storedHigh = 0;
    }
    state.highScore = storedHigh;
    if (summary.total > storedHigh) {
      try {
        localStorage.setItem("flagGameHighScore", String(Math.floor(summary.total)));
      } catch (error) {
        // Ignore storage errors.
      }
      state.highScore = Math.floor(summary.total);
      state.newRecord = true;
      triggerRecordCelebration();
    }
    highScoreEl.textContent = `High Score: ${state.highScore}`;
    setScreen("over");
  }

  function triggerRecordCelebration() {
    recordBanner.textContent = "New Record!";
    recordBanner.classList.add("active");
    spawnParticles();
  }

  function spawnParticles() {
    const colors = ["#ffd93d", "#ff6b6b", "#47d66d", "#5ad1ff", "#c77dff"];
    const width = canvas.getBoundingClientRect().width;
    const height = canvas.getBoundingClientRect().height;
    for (let i = 0; i < 140; i += 1) {
      state.particles.push({
        x: width / 2,
        y: height * 0.2,
        vx: (Math.random() - 0.5) * 240,
        vy: -120 - Math.random() * 120,
        life: 2.4 + Math.random() * 0.8,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
      });
    }
  }

  function updateParticles(dt) {
    if (state.particles.length === 0) return;
    const gravity = 320;
    state.particles.forEach((p) => {
      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    });
    state.particles = state.particles.filter((p) => p.life > 0);
    if (state.particles.length === 0) {
      recordBanner.classList.remove("active");
    }
  }

  function update(dt) {
    if (state.mode === "playing" && state.current && !state.locked) {
      state.current.timeRemaining = Math.max(0, state.current.timeRemaining - dt);
      if (state.current.timeRemaining <= 0) {
        state.current.timeRemaining = 0;
        handleTimeout();
      }
    }
    updateParticles(dt);
    updateHud();
  }

  function renderBackground() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f7f8fa");
    gradient.addColorStop(1, "#eef1f4");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function renderHud() {
    if (state.mode !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const padding = rect.width * 0.04;
    const panelHeight = rect.height * 0.07;
    const panelWidth = rect.width * 0.92;
    const timeRemaining = state.current ? state.current.timeRemaining : 0;
    const timeColor =
      timeRemaining > 4 ? "#2e7d32" : timeRemaining > 1 ? "#f4b400" : "#d93025";
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "#e2e6ea";
    ctx.lineWidth = 2;
    roundRect(ctx, padding, padding, panelWidth, panelHeight, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1f2933";
    ctx.font = `${Math.round(rect.height * 0.026)}px "Manrope"`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const y = padding + panelHeight / 2;
    ctx.fillText(`Q ${state.questionIndex + 1}/${TOTAL_QUESTIONS}`, padding + 16, y);
    ctx.fillText(`Wrong ${state.wrongs}/${MAX_WRONG}`, padding + panelWidth * 0.3, y);
    ctx.fillStyle = timeColor;
    ctx.fillText(
      `${timeRemaining.toFixed(2)}s`,
      padding + panelWidth * 0.55,
      y
    );
    ctx.fillStyle = "#1f2933";
    ctx.fillText(`Score ${Math.floor(state.score)}`, padding + panelWidth * 0.82, y);
    ctx.restore();
  }

  function wrapText(context, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function renderOptions() {
    if (state.mode !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    const buttons = Array.from(optionsEl.children);
    if (!buttons.length) return;
    const palette = ["#f7b7b2", "#fce7a5", "#b7d7ff", "#bdecc9"];
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = Math.max(14, Math.round(rect.height * 0.032));
    ctx.font = `${fontSize}px "Manrope"`;
    buttons.forEach((btn) => {
      const b = btn.getBoundingClientRect();
      const x = b.left - rect.left;
      const y = b.top - rect.top;
      const width = b.width;
      const height = b.height;
      const slot = Number(btn.dataset.index) || 0;
      ctx.fillStyle = palette[slot] || "#eef0f3";
      ctx.strokeStyle = "rgba(15, 24, 39, 0.15)";
      if (btn.classList.contains("correct")) {
        ctx.strokeStyle = "#2e7d32";
      } else if (btn.classList.contains("wrong")) {
        ctx.strokeStyle = "#d93025";
      }
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, width, height, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1f2933";
      const lines = wrapText(ctx, btn.textContent.trim(), width * 0.85);
      const maxLines = lines.slice(0, 2);
      const lineHeight = fontSize * 1.1;
      const startY = y + height / 2 - ((maxLines.length - 1) * lineHeight) / 2;
      maxLines.forEach((line, index) => {
        ctx.fillText(line, x + width / 2, startY + index * lineHeight);
      });
    });
    ctx.restore();
  }

  function renderResultText() {
    if (state.mode !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (!state.resultText) return;
    ctx.save();
    ctx.font = `${Math.round(rect.height * 0.03)}px "Manrope"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = state.resultTone === "good" ? "#2e7d32" : "#d93025";
    const optionsTop =
      state.layout.optionsTop !== null ? state.layout.optionsTop : rect.height * 0.72;
    const cardBottom =
      state.layout.cardBottom !== null ? state.layout.cardBottom : rect.height * 0.46;
    const gap = Math.max(24, rect.height * 0.04);
    let y = (cardBottom + optionsTop) / 2;
    if (y > optionsTop - gap) y = optionsTop - gap;
    if (y < cardBottom + gap) y = cardBottom + gap;
    ctx.fillText(state.resultText, rect.width / 2, y);
    ctx.restore();
  }

  function renderFlagCard() {
    if (state.mode !== "playing" || !state.current) return;
    const rect = canvas.getBoundingClientRect();
    const cardWidth = rect.width * 0.60;
    let cardHeight = rect.height * 0.32;
    const x = rect.width / 2 - cardWidth / 2;
    let y = rect.height * 0.14;
    const optionsRect = optionsEl.getBoundingClientRect();
    if (optionsRect && optionsRect.height) {
      const optionsTop = optionsRect.top - rect.top;
      const margin = Math.max(24, rect.height * 0.06);
      const maxBottom = optionsTop - margin;
      if (y + cardHeight > maxBottom) {
        cardHeight = Math.max(rect.height * 0.24, maxBottom - y);
      }
      if (y + cardHeight > maxBottom) {
        y = Math.max(rect.height * 0.08, maxBottom - cardHeight);
      }
      state.layout.optionsTop = optionsTop;
    } else {
      state.layout.optionsTop = null;
    }
    state.layout.cardBottom = y + cardHeight;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e6ea";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardWidth, cardHeight, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.font = `${Math.round(cardHeight * 0.65)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(makeFlagEmoji(state.current.country.code), rect.width / 2, y + cardHeight / 2);
    ctx.restore();
  }

  function renderParticles() {
    if (state.particles.length === 0) return;
    ctx.save();
    state.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / 3);
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.size, p.size);
      ctx.fill();
    });
    ctx.restore();
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function renderEndCard() {
    if (state.mode !== "over" || !state.endSummary) return;
    const rect = canvas.getBoundingClientRect();
    const cardWidth = rect.width * 0.72;
    const cardHeight = rect.height * 0.62;
    const x = rect.width / 2 - cardWidth / 2;
    // Offset card upward slightly to make room for the "Play Again" button below
    const y = rect.height / 2 - cardHeight / 2 - rect.height * 0.05;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e6ea";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardWidth, cardHeight, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `${Math.round(rect.height * 0.052)}px "Sora"`;
    ctx.fillText(state.endTitle, rect.width / 2, y + cardHeight * 0.1);

    ctx.font = `${Math.round(rect.height * 0.05)}px "Manrope"`;
    ctx.fillText(`Total Score: ${state.endSummary.total}`, rect.width / 2, y + cardHeight * 0.25);

    ctx.font = `${Math.round(rect.height * 0.032)}px "Manrope"`;
    const lines = [
      `Questions answered: ${state.endSummary.answered}/${TOTAL_QUESTIONS}`,
      `Wrong answers: ${state.endSummary.wrongs}/${MAX_WRONG}`,
      `Question points: ${state.endSummary.basePoints}`,
      `Fast answers bonus: ${state.endSummary.fastBonus}`,
      `Perfect run bonus: ${state.endSummary.perfectBonus}`,
      `Time left bonus: ${state.endSummary.timeBonus}`,
    ];
    const lineHeight = rect.height * 0.045;
    let lineY = y + cardHeight * 0.40;
    lines.forEach((line) => {
      ctx.fillText(line, rect.width / 2, lineY);
      lineY += lineHeight;
    });

    ctx.font = `${Math.round(rect.height * 0.032)}px "Manrope"`;
    const highScoreText = state.newRecord
      ? `New Record! ${state.highScore}`
      : `High Score: ${state.highScore}`;
    ctx.fillText(highScoreText, rect.width / 2, y + cardHeight * 0.84);
    ctx.restore();
  }

  function render() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    renderBackground();
    renderFlagCard();
    renderHud();
    renderOptions();
    renderResultText();
    renderEndCard();
    renderParticles();
  }

  function loop(timestamp) {
    if (!loop.lastTime) loop.lastTime = timestamp;
    const delta = Math.min(0.05, (timestamp - loop.lastTime) / 1000);
    loop.lastTime = timestamp;
    update(delta);
    render();
    requestAnimationFrame(loop);
  }

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      coordinateSystem: "origin top-left, +x right, +y down",
      questionIndex: state.questionIndex,
      totalQuestions: TOTAL_QUESTIONS,
      wrongs: state.wrongs,
      maxWrongs: MAX_WRONG,
      timer: state.current ? state.current.timeRemaining : 0,
      score: Math.floor(state.score),
      resultText: state.resultText,
      endSummary: state.endSummary,
      currentFlagCode: state.current ? state.current.country.code : null,
      options: state.current ? state.current.options.map((opt) => opt.name) : [],
      correctIndex: state.current ? state.current.correctIndex : null,
    };
    return JSON.stringify(payload);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i += 1) {
      update(FIXED_DT);
    }
    render();
  };

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
      return;
    }
    if (state.mode !== "playing") return;
    if (event.code === "Space") {
      event.preventDefault();
      return;
    }
    const index = Number(event.key) - 1;
    if (index >= 0 && index <= 3) {
      handleAnswer(index);
    }
  });

  document.addEventListener("fullscreenchange", () => {
    resizeCanvas();
  });

  function init() {
    resizeCanvas();
    qTotalEl.textContent = TOTAL_QUESTIONS;
    wrongTotalEl.textContent = MAX_WRONG;
    setScreen("start");
    requestAnimationFrame(loop);
  }

  init();
})();
