const STORAGE_KEY = "hidra-diario-v1";
const RING = 326.56;
const PLAN_ID = "ganho-muscular-inbody-2026-08";
const HISTORY_DAYS = 30;

const MUSCLE_PLAN = {
  id: PLAN_ID,
  label: "ganho muscular",
  water: 2500,
  calories: 2700,
  protein: 140,
};

const defaultState = () => ({
  planId: MUSCLE_PLAN.id,
  goals: { water: MUSCLE_PLAN.water, calories: MUSCLE_PLAN.calories },
  days: {},
});

const emptyDay = () => ({
  water: [],
  meals: [],
  goals: null,
});

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const state = {
      planId: parsed?.planId || null,
      goals: {
        water: Number(parsed?.goals?.water) || MUSCLE_PLAN.water,
        calories: Number(parsed?.goals?.calories) || MUSCLE_PLAN.calories,
      },
      days: parsed?.days && typeof parsed.days === "object" ? parsed.days : {},
    };
    if (state.planId !== MUSCLE_PLAN.id) {
      state.planId = MUSCLE_PLAN.id;
      state.goals.water = MUSCLE_PLAN.water;
      state.goals.calories = MUSCLE_PLAN.calories;
    }
    return state;
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDay(state, key = todayKey()) {
  if (!state.days[key]) state.days[key] = emptyDay();
  const day = state.days[key];
  if (!Array.isArray(day.water)) day.water = [];
  if (!Array.isArray(day.meals)) day.meals = [];
  return day;
}

function stampGoals(day) {
  day.goals = {
    water: state.goals.water,
    calories: state.goals.calories,
  };
}

function dayTotals(day) {
  return {
    water: day.water.reduce((sum, item) => sum + Number(item.ml || 0), 0),
    calories: day.meals.reduce((sum, item) => sum + Number(item.kcal || 0), 0),
  };
}

function dayGoals(day) {
  return {
    water: Number(day.goals?.water) || state.goals.water,
    calories: Number(day.goals?.calories) || state.goals.calories,
  };
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = todayKey();
  if (key === today) return "Hoje";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
  if (key === yKey) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setRing(el, percent) {
  const p = Math.max(0, Math.min(percent, 100));
  el.style.strokeDashoffset = String(RING - (RING * p) / 100);
}

function recentKeys(count) {
  const keys = [];
  const d = new Date();
  for (let i = 0; i < count; i += 1) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

const els = {
  dateLabel: document.getElementById("dateLabel"),
  planLabel: document.getElementById("planLabel"),
  waterTotal: document.getElementById("waterTotal"),
  waterGoalLabel: document.getElementById("waterGoalLabel"),
  waterSummary: document.getElementById("waterSummary"),
  waterRing: document.getElementById("waterRing"),
  waterLog: document.getElementById("waterLog"),
  waterForm: document.getElementById("waterForm"),
  waterCustom: document.getElementById("waterCustom"),
  calTotal: document.getElementById("calTotal"),
  calGoalLabel: document.getElementById("calGoalLabel"),
  calSummary: document.getElementById("calSummary"),
  calRing: document.getElementById("calRing"),
  mealLog: document.getElementById("mealLog"),
  mealForm: document.getElementById("mealForm"),
  mealName: document.getElementById("mealName"),
  mealKcal: document.getElementById("mealKcal"),
  resetDay: document.getElementById("resetDay"),
  goalModal: document.getElementById("goalModal"),
  goalForm: document.getElementById("goalForm"),
  goalTitle: document.getElementById("goalTitle"),
  goalLabel: document.getElementById("goalLabel"),
  goalInput: document.getElementById("goalInput"),
  goalCancel: document.getElementById("goalCancel"),
  historyList: document.getElementById("historyList"),
  historyStreak: document.getElementById("historyStreak"),
  installBtn: document.getElementById("installBtn"),
  installTip: document.getElementById("installTip"),
};

let state = loadState();
saveState(state);
let editingGoal = null;
let deferredInstall = null;

function render() {
  const key = todayKey();
  const day = getDay(state, key);
  stampGoals(day);

  els.dateLabel.textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  els.planLabel.textContent = `Plano: ${MUSCLE_PLAN.label} · ${state.goals.water} ml · ${state.goals.calories} kcal · ~${MUSCLE_PLAN.protein} g proteína`;

  const totals = dayTotals(day);
  const goals = dayGoals(day);
  const waterPct = goals.water ? Math.round((totals.water / goals.water) * 100) : 0;
  const calPct = goals.calories ? Math.round((totals.calories / goals.calories) * 100) : 0;

  els.waterTotal.textContent = String(totals.water);
  els.calTotal.textContent = String(totals.calories);
  els.waterGoalLabel.textContent = String(state.goals.water);
  els.calGoalLabel.textContent = String(state.goals.calories);
  els.waterSummary.textContent =
    waterPct >= 100
      ? "Meta de água atingida"
      : `${waterPct}% da meta · faltam ${Math.max(goals.water - totals.water, 0)} ml`;
  els.calSummary.textContent =
    calPct >= 100
      ? "Meta de calorias atingida — bom pro ganho"
      : `${calPct}% da meta · faltam ${Math.max(goals.calories - totals.calories, 0)} kcal`;

  setRing(els.waterRing, waterPct);
  setRing(els.calRing, calPct);

  renderWaterLog(day.water);
  renderMealLog(day.meals);
  renderHistory();
}

function renderWaterLog(items) {
  els.waterLog.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nenhum gole registrado ainda.";
    els.waterLog.appendChild(li);
    return;
  }

  [...items]
    .reverse()
    .forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="meta">
          <strong>${item.ml} ml</strong>
          <span>${formatTime(item.at)}</span>
        </div>
        <div>
          <span class="amount">+${item.ml}</span>
          <button type="button" class="remove" data-remove-water="${item.id}" aria-label="Remover">remover</button>
        </div>
      `;
      els.waterLog.appendChild(li);
    });
}

function renderMealLog(items) {
  els.mealLog.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nenhuma refeição registrada ainda.";
    els.mealLog.appendChild(li);
    return;
  }

  [...items]
    .reverse()
    .forEach((item) => {
      const li = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = item.name;
      const time = document.createElement("span");
      time.textContent = formatTime(item.at);
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.append(name, time);

      const right = document.createElement("div");
      const amount = document.createElement("span");
      amount.className = "amount";
      amount.textContent = `${item.kcal} kcal`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.dataset.removeMeal = item.id;
      remove.setAttribute("aria-label", "Remover");
      remove.textContent = "remover";
      right.append(amount, remove);

      li.append(meta, right);
      els.mealLog.appendChild(li);
    });
}

function computeStreak() {
  let streak = 0;
  for (const key of recentKeys(HISTORY_DAYS)) {
    const day = state.days[key];
    if (!day) {
      if (key === todayKey()) continue;
      break;
    }
    const totals = dayTotals(day);
    const goals = dayGoals(day);
    const both = totals.water >= goals.water && totals.calories >= goals.calories;
    if (!both) {
      if (key === todayKey()) continue;
      break;
    }
    streak += 1;
  }
  return streak;
}

function renderHistory() {
  els.historyList.innerHTML = "";
  const keys = recentKeys(HISTORY_DAYS);
  let shown = 0;

  keys.forEach((key) => {
    const day = state.days[key];
    if (!day) return;

    const totals = dayTotals(day);
    if (totals.water === 0 && totals.calories === 0 && key !== todayKey()) return;

    const goals = dayGoals(day);
    const waterOk = totals.water >= goals.water;
    const calOk = totals.calories >= goals.calories;
    const both = waterOk && calOk;
    const waterPct = goals.water ? Math.min(100, Math.round((totals.water / goals.water) * 100)) : 0;
    const calPct = goals.calories ? Math.min(100, Math.round((totals.calories / goals.calories) * 100)) : 0;

    const li = document.createElement("li");
    li.className = `history-item${both ? " is-complete" : ""}`;
    li.innerHTML = `
      <div class="history-main">
        <strong>${formatDayLabel(key)}</strong>
        <span>${totals.water} ml · ${totals.calories} kcal</span>
      </div>
      <div class="history-badges">
        <span class="badge ${waterOk ? "ok" : "miss"}">Água ${waterPct}%</span>
        <span class="badge ${calOk ? "ok" : "miss"}">Kcal ${calPct}%</span>
      </div>
    `;
    els.historyList.appendChild(li);
    shown += 1;
  });

  if (!shown) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "Ainda sem histórico. Registre hoje e os dias vão aparecer aqui.";
    els.historyList.appendChild(li);
  }

  const streak = computeStreak();
  els.historyStreak.textContent =
    streak > 0 ? `${streak} dia${streak > 1 ? "s" : ""} seguido${streak > 1 ? "s" : ""} batendo tudo` : "Sem sequência ainda";
}

function persistDayChange() {
  const day = getDay(state);
  stampGoals(day);
  saveState(state);
  render();
}

function addWater(ml) {
  const amount = Math.round(Number(ml));
  if (!Number.isFinite(amount) || amount <= 0) return;
  const day = getDay(state);
  day.water.push({ id: uid(), ml: amount, at: new Date().toISOString() });
  persistDayChange();
}

function addMeal(name, kcal) {
  const cleanName = String(name || "").trim();
  const amount = Math.round(Number(kcal));
  if (!cleanName || !Number.isFinite(amount) || amount <= 0) return;
  const day = getDay(state);
  day.meals.push({
    id: uid(),
    name: cleanName,
    kcal: amount,
    at: new Date().toISOString(),
  });
  persistDayChange();
}

document.querySelectorAll("[data-water]").forEach((btn) => {
  btn.addEventListener("click", () => addWater(btn.dataset.water));
});

els.waterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addWater(els.waterCustom.value);
  els.waterForm.reset();
});

els.mealForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addMeal(els.mealName.value, els.mealKcal.value);
  els.mealForm.reset();
  els.mealName.focus();
});

els.waterLog.addEventListener("click", (e) => {
  const id = e.target.closest("[data-remove-water]")?.dataset.removeWater;
  if (!id) return;
  const day = getDay(state);
  day.water = day.water.filter((item) => item.id !== id);
  persistDayChange();
});

els.mealLog.addEventListener("click", (e) => {
  const id = e.target.closest("[data-remove-meal]")?.dataset.removeMeal;
  if (!id) return;
  const day = getDay(state);
  day.meals = day.meals.filter((item) => item.id !== id);
  persistDayChange();
});

els.resetDay.addEventListener("click", () => {
  const ok = window.confirm("Zerar água e calorias de hoje?");
  if (!ok) return;
  state.days[todayKey()] = emptyDay();
  persistDayChange();
});

document.querySelectorAll("[data-goal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    editingGoal = btn.dataset.goal;
    const isWater = editingGoal === "water";
    els.goalTitle.textContent = isWater ? "Meta de água" : "Meta de calorias";
    els.goalLabel.textContent = isWater ? "Mililitros por dia" : "Calorias por dia";
    els.goalInput.value = String(state.goals[editingGoal]);
    els.goalModal.showModal();
    els.goalInput.focus();
    els.goalInput.select();
  });
});

els.goalCancel.addEventListener("click", () => {
  els.goalModal.close();
  editingGoal = null;
});

els.goalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = Math.round(Number(els.goalInput.value));
  if (!editingGoal || !Number.isFinite(value) || value <= 0) return;
  state.goals[editingGoal] = value;
  stampGoals(getDay(state));
  saveState(state);
  editingGoal = null;
  els.goalModal.close();
  render();
});

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  els.installBtn.hidden = false;
  els.installTip.textContent = "Toque em instalar para deixar o Hidra na tela inicial.";
});

els.installBtn.addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  els.installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  els.installBtn.hidden = true;
  els.installTip.textContent = "App instalado neste aparelho.";
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

render();
