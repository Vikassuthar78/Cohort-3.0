"use strict";

/* ============================================================
   DAILY OPS — script.js
   All feature logic lives here: navigation, todo, planner,
   goals, pomodoro, quote, clock, weather, theme, background.
   ============================================================ */

/* ---------------- Storage helpers ---------------- */
const STORE = {
  theme: "ops-theme",
  todos: "ops-todos",
  planner: "ops-planner",
  goals: "ops-goals",
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — fail silently, app still works in-session */
  }
}

/* ============================================================
   1. NAVIGATION — dashboard <-> feature view
   ============================================================ */
(function initNavigation() {
  const dashboard = document.getElementById("dashboard");
  const featureView = document.getElementById("feature-view");
  const backBtn = document.getElementById("back-btn");
  const panels = document.querySelectorAll(".feature-panel");
  const tiles = document.querySelectorAll(".tile");

  let activePanel = null;
  let isTransitioning = false;

  function openFeature(name) {
    if (isTransitioning || activePanel === name) return;
    const target = document.querySelector(`.feature-panel[data-panel="${name}"]`);
    if (!target) return;

    isTransitioning = true;
    panels.forEach((p) => (p.hidden = p !== target));
    dashboard.hidden = true;
    featureView.hidden = false;
    activePanel = name;
    backBtn.focus();
    // small guard window so rapid double-clicks on the same tile don't re-trigger
    requestAnimationFrame(() => (isTransitioning = false));
  }

  function closeFeature() {
    featureView.hidden = true;
    dashboard.hidden = false;
    activePanel = null;
  }

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => openFeature(tile.dataset.feature));
  });
  backBtn.addEventListener("click", closeFeature);
})();

/* ============================================================
   2. TODO LIST
   ============================================================ */
(function initTodo() {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const emptyHint = document.getElementById("todo-empty");
  const tileMeta = document.getElementById("tile-meta-todo");

  let todos = loadJSON(STORE.todos, []);

  function persist() {
    saveJSON(STORE.todos, todos);
    render();
  }

  function render() {
    list.innerHTML = "";
    todos.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "item-row" + (todo.completed ? " completed" : "") + (todo.important ? " important" : "");
      li.dataset.id = todo.id;
      li.innerHTML = `
        <button class="item-check" data-action="complete" aria-label="Mark complete">${todo.completed ? "✓" : ""}</button>
        <span class="item-text">${escapeHTML(todo.text)}</span>
        <button class="icon-btn${todo.important ? " is-active" : ""}" data-action="important" aria-label="Mark important">★</button>
        <button class="icon-btn danger" data-action="delete" aria-label="Delete task">✕</button>
      `;
      list.appendChild(li);
    });

    emptyHint.classList.toggle("visible", todos.length === 0);

    const open = todos.filter((t) => !t.completed).length;
    tileMeta.textContent = open === 1 ? "1 open" : `${open} open`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: cryptoId(), text, completed: false, important: false });
    input.value = "";
    persist();
  });

  // event delegation for complete / important / delete
  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest(".item-row");
    const todo = todos.find((t) => t.id === row.dataset.id);
    if (!todo) return;

    if (btn.dataset.action === "complete") todo.completed = !todo.completed;
    if (btn.dataset.action === "important") todo.important = !todo.important;
    if (btn.dataset.action === "delete") todos = todos.filter((t) => t.id !== todo.id);

    persist();
  });

  render();
})();

/* ============================================================
   3. DAILY PLANNER
   ============================================================ */
(function initPlanner() {
  const container = document.getElementById("slot-list");
  const START_HOUR = 6; // 6 AM
  const END_HOUR = 23; // 11 PM inclusive

  let planner = loadJSON(STORE.planner, {});
  let saveTimer = null;

  function formatHour(h) {
    const period = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
  }

  function render() {
    container.innerHTML = "";
    const currentHour = new Date().getHours();

    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const row = document.createElement("div");
      row.className = "slot-row" + (h === currentHour ? " is-now" : "");
      row.innerHTML = `
        <span class="slot-time mono">${formatHour(h)}</span>
        <input type="text" class="slot-input" data-hour="${h}" placeholder="Nothing planned" maxlength="120" value="${escapeAttr(planner[h] || "")}" />
      `;
      container.appendChild(row);
    }
  }

  container.addEventListener("input", (e) => {
    const field = e.target.closest(".slot-input");
    if (!field) return;
    const hour = field.dataset.hour;
    const value = field.value;

    if (value.trim() === "") delete planner[hour];
    else planner[hour] = value;

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveJSON(STORE.planner, planner), 350);
  });

  render();
  // re-highlight the current hour every minute without losing focus/typing
  setInterval(() => {
    if (!document.activeElement || !document.activeElement.classList.contains("slot-input")) {
      render();
    }
  }, 60000);
})();

/* ============================================================
   4. DAILY GOALS
   ============================================================ */
(function initGoals() {
  const form = document.getElementById("goal-form");
  const input = document.getElementById("goal-input");
  const list = document.getElementById("goal-list");
  const emptyHint = document.getElementById("goal-empty");
  const fill = document.getElementById("goal-progress-fill");
  const progressText = document.getElementById("goal-progress-text");
  const tileMeta = document.getElementById("tile-meta-goals");

  let goals = loadJSON(STORE.goals, []);

  function persist() {
    saveJSON(STORE.goals, goals);
    render();
  }

  function render() {
    list.innerHTML = "";
    goals.forEach((goal) => {
      const li = document.createElement("li");
      li.className = "item-row" + (goal.completed ? " completed" : "");
      li.dataset.id = goal.id;
      li.innerHTML = `
        <button class="item-check" data-action="complete" aria-label="Mark goal complete">${goal.completed ? "✓" : ""}</button>
        <span class="item-text">${escapeHTML(goal.text)}</span>
        <button class="icon-btn danger" data-action="delete" aria-label="Delete goal">✕</button>
      `;
      list.appendChild(li);
    });

    emptyHint.classList.toggle("visible", goals.length === 0);

    const done = goals.filter((g) => g.completed).length;
    const total = goals.length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    fill.style.width = `${pct}%`;
    progressText.textContent = `${done} of ${total} completed`;
    tileMeta.textContent = `${done} of ${total} done`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    goals.push({ id: cryptoId(), text, completed: false });
    input.value = "";
    persist();
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest(".item-row");
    const goal = goals.find((g) => g.id === row.dataset.id);
    if (!goal) return;

    if (btn.dataset.action === "complete") goal.completed = !goal.completed;
    if (btn.dataset.action === "delete") goals = goals.filter((g) => g.id !== goal.id);

    persist();
  });

  render();
})();

/* ============================================================
   5. POMODORO TIMER
   ============================================================ */
(function initPomodoro() {
  const WORK_SECONDS = 25 * 60;
  const BREAK_SECONDS = 5 * 60;
  const CIRCUMFERENCE = 2 * Math.PI * 88; // matches SVG r=88

  const timeEl = document.getElementById("dial-time");
  const sessionEl = document.getElementById("dial-session");
  const progressEl = document.getElementById("dial-progress");
  const toggleBtn = document.getElementById("timer-toggle");
  const resetBtn = document.getElementById("timer-reset");
  const skipBtn = document.getElementById("timer-skip");
  const tileMeta = document.getElementById("tile-meta-pomodoro");

  let mode = "work"; // "work" | "break"
  let totalSeconds = WORK_SECONDS;
  let remaining = WORK_SECONDS;
  let intervalId = null; // guarded so only one interval can ever run

  progressEl.style.strokeDasharray = `${CIRCUMFERENCE}`;

  function format(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function render() {
    timeEl.textContent = format(remaining);
    sessionEl.textContent = mode === "work" ? "Work Session" : "Break";
    const fraction = remaining / totalSeconds;
    progressEl.style.strokeDashoffset = `${CIRCUMFERENCE * (1 - fraction)}`;
    progressEl.style.stroke = mode === "work" ? "var(--accent)" : "var(--accent-2)";
    tileMeta.textContent = `${format(remaining)} · ${mode === "work" ? "Work" : "Break"}`;
  }

  function switchMode(nextMode) {
    mode = nextMode;
    totalSeconds = mode === "work" ? WORK_SECONDS : BREAK_SECONDS;
    remaining = totalSeconds;
    render();
  }

  function tick() {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      toggleBtn.textContent = "Start";
      notifyDone();
      switchMode(mode === "work" ? "break" : "work");
      return;
    }
    render();
  }

  function notifyDone() {
    sessionEl.textContent = mode === "work" ? "Work complete!" : "Break complete!";
    try {
      // gentle audible cue; ignored if audio can't play (e.g. autoplay policy)
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      /* audio not available — silent fallback */
    }
  }

  function start() {
    if (intervalId) return; // prevent duplicate intervals
    intervalId = setInterval(tick, 1000);
    toggleBtn.textContent = "Pause";
  }

  function pause() {
    clearInterval(intervalId);
    intervalId = null;
    toggleBtn.textContent = "Start";
  }

  toggleBtn.addEventListener("click", () => (intervalId ? pause() : start()));

  resetBtn.addEventListener("click", () => {
    pause();
    remaining = totalSeconds;
    render();
  });

  skipBtn.addEventListener("click", () => {
    pause();
    switchMode(mode === "work" ? "break" : "work");
  });

  render();
})();

/* ============================================================
   6. MOTIVATION QUOTE
   ============================================================ */
(function initQuote() {
  const textEl = document.getElementById("quote-text");
  const authorEl = document.getElementById("quote-author");
  const refreshBtn = document.getElementById("quote-refresh");

  const FALLBACK_QUOTES = [
    { text: "Well done is better than well said.", author: "Benjamin Franklin" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Anonymous" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "What we do today can improve all our tomorrows.", author: "Ralph Marston" },
  ];

  function setLoading() {
    textEl.textContent = "Fetching a fresh thought…";
    authorEl.textContent = "";
  }

  function display(text, author) {
    textEl.textContent = text;
    authorEl.textContent = author || "";
  }

  function showFallback() {
    const pick = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    display(pick.text, pick.author);
  }

  async function fetchQuote() {
    setLoading();
    refreshBtn.disabled = true;
    try {
      const res = await fetch("https://api.quotable.io/random");
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      display(data.content, data.author);
    } catch {
      showFallback(); // network/API failure — never leave the card blank
    } finally {
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener("click", fetchQuote);
  fetchQuote();
})();

/* ============================================================
   7. DATE & TIME (always visible)
   ============================================================ */
(function initClock() {
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");
  const greetingEl = document.getElementById("greeting-period");
  const eyebrowEl = document.getElementById("hero-eyebrow");

  const DATE_FMT = { weekday: "short", day: "numeric", month: "short", year: "numeric" };

  function periodOf(hour) {
    if (hour >= 5 && hour <= 10) return { key: "morning", label: "morning", eyebrow: "Morning briefing" };
    if (hour >= 11 && hour <= 15) return { key: "midday", label: "afternoon", eyebrow: "Midday checkpoint" };
    if (hour >= 16 && hour <= 19) return { key: "evening", label: "evening", eyebrow: "Evening wind-down" };
    return { key: "night", label: "evening", eyebrow: "Late-night ops" };
  }

  function update() {
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    dateEl.textContent = now.toLocaleDateString([], DATE_FMT);

    const { key, label, eyebrow } = periodOf(now.getHours());
    greetingEl.textContent = label;
    eyebrowEl.textContent = eyebrow;
    document.body.dataset.period = key;
  }

  update(); // run immediately so it doesn't wait a full second to appear
  setInterval(update, 1000);
})();

/* ============================================================
   8. WEATHER WIDGET (always visible)
   ============================================================ */
(function initWeather() {
  const iconEl = document.getElementById("weather-icon");
  const tempEl = document.getElementById("weather-temp");
  const placeEl = document.getElementById("weather-place");

  // Fallback location used if geolocation is denied or unavailable.
  const FALLBACK = { lat: 17.25, lon: 80.15, name: "Khammam, IN" };

  const WEATHER_CODES = {
    0: ["Clear sky", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
    51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Dense drizzle", "🌦️"],
    61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
    71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "🌨️"],
    80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌦️"], 82: ["Violent showers", "⛈️"],
    95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
  };

  function describe(code) {
    return WEATHER_CODES[code] || ["Conditions unknown", "🌡️"];
  }

  async function fetchWeather(lat, lon, placeName) {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`
      );
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      const [label, icon] = describe(data.current_weather.weathercode);
      tempEl.textContent = `${Math.round(data.current_weather.temperature)}°C`;
      iconEl.textContent = icon;
      placeEl.textContent = `${placeName} · ${label}`;
    } catch {
      tempEl.textContent = "—";
      iconEl.textContent = "⚠️";
      placeEl.textContent = "Weather unavailable";
    }
  }

  function useFallback() {
    fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
  }

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, "Your location"),
      () => useFallback(), // permission denied or unavailable — fall back gracefully
      { timeout: 6000 }
    );
  } else {
    useFallback();
  }
})();

/* ============================================================
   9. THEME SWITCH (light / dark)
   ============================================================ */
(function initTheme() {
  const toggle = document.getElementById("theme-toggle");
  const label = document.getElementById("theme-toggle-label");

  // Applied at script-eval time (before first paint below the fold) to avoid a flash of the wrong theme.
  const saved = loadJSON(STORE.theme, null) || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(saved);

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    toggle.setAttribute("aria-pressed", String(theme === "light"));
    label.textContent = theme === "light" ? "Light" : "Dark";
  }

  toggle.addEventListener("click", () => {
    const next = document.body.dataset.theme === "light" ? "dark" : "light";
    applyTheme(next);
    saveJSON(STORE.theme, next);
  });
})();

/* ============================================================
   Utilities
   ============================================================ */
function cryptoId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHTML(str).replace(/"/g, "&quot;");
}
