"use strict";

/* =========================
   Theme Toggle (Light/Dark)
========================= */

const THEME_KEY = "bus237_theme";

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === "dark" ? "dark" : "light");

  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const next = isDark ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }
}

initTheme();

/* =========================
   Inventory App
========================= */

const STORAGE_KEY = "bus237_inventory";

let inventory = [];
let chart = null;

// DOM (some pages like About won't have these — so we guard them)
const form = document.getElementById("inventoryForm");
const nameInput = document.getElementById("itemName");
const qtyInput = document.getElementById("itemQty");
const messageEl = document.getElementById("message");
const tbody = document.getElementById("inventoryBody");
const clearBtn = document.getElementById("clearBtn");
const chartCanvas = document.getElementById("inventoryChart");

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function showMessage(text, type) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.classList.remove("ok", "err");
  if (type === "ok") messageEl.classList.add("ok");
  if (type === "err") messageEl.classList.add("err");
}

function loadInventory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(x => x && typeof x.name === "string" && typeof x.qty === "number")
      .map(x => ({
        name: x.name.trim(),
        qty: Math.trunc(x.qty)
      }))
      .filter(x => x.name.length > 0 && Number.isInteger(x.qty) && x.qty >= 0);
  } catch {
    return [];
  }
}

function saveInventory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function renderTable(items) {
  if (!tbody) return;
  tbody.innerHTML = "";

  for (const item of items) {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdQty = document.createElement("td");
    tdQty.textContent = String(item.qty);

    tr.appendChild(tdName);
    tr.appendChild(tdQty);
    tbody.appendChild(tr);
  }
}

function renderChart(items) {
  if (!chartCanvas || typeof Chart === "undefined") return;

  const labels = items.map(i => i.name);
  const data = items.map(i => i.qty);

  // Option B: low stock < 10 is red, otherwise purple
  const colors = items.map(i =>
    i.qty < 10 ? "rgba(220, 38, 38, 0.85)" : "rgba(124, 58, 237, 0.85)"
  );

  if (chart) chart.destroy();

  chart = new Chart(chartCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantity",
          data,
          backgroundColor: colors
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function validateInputs(name, qtyStr) {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, msg: "Item name cannot be empty." };

  const qtyNum = Number(qtyStr);
  if (!Number.isFinite(qtyNum)) return { ok: false, msg: "Quantity must be a number." };
  if (!Number.isInteger(qtyNum)) return { ok: false, msg: "Quantity must be a whole number." };
  if (qtyNum < 0) return { ok: false, msg: "Quantity cannot be negative." };

  return { ok: true, name: trimmed, qty: qtyNum };
}

function addItem(name, qty) {
  const key = normalizeName(name);
  const exists = inventory.some(i => normalizeName(i.name) === key);

  if (exists) {
    showMessage("Duplicate item: that name already exists.", "err");
    return;
  }

  inventory.push({ name, qty });
  saveInventory(inventory);

  renderTable(inventory);
  renderChart(inventory);

  showMessage("Item added.", "ok");
}

function clearAll() {
  inventory = [];
  localStorage.removeItem(STORAGE_KEY);

  renderTable(inventory);
  renderChart(inventory);

  showMessage("Inventory cleared (local storage wiped).", "ok");
}

/* =========================
   Wire Up Events (Dashboard)
========================= */

function initInventoryUI() {
  // If these elements don't exist, we're on about.html — do nothing.
  if (!form || !nameInput || !qtyInput || !clearBtn) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const validation = validateInputs(nameInput.value, qtyInput.value);
    if (!validation.ok) {
      showMessage(validation.msg, "err");
      return;
    }

    addItem(validation.name, validation.qty);
    form.reset();
    nameInput.focus();
  });

  clearBtn.addEventListener("click", () => {
    clearAll();
  });

  inventory = loadInventory();
  renderTable(inventory);
  renderChart(inventory);
}

initInventoryUI();
