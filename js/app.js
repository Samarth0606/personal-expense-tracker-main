/**
 * app.js
 * ------
 * Connects the web page to the logic in finance.js.
 * It reads what the person types, saves their data in the browser,
 * and redraws the page whenever something changes.
 */

// ----- Settings you can change -----
const LOCALE = "en-IN";           // controls number and date style
const CURRENCY = "INR";           // the currency code, for example "USD" or "EUR"
const STORAGE_KEY = "personal-finance-tracker.transactions";
const BUDGET_KEY = "personal-finance-tracker.budgets";

// ----- The app's memory while the page is open -----
const state = {
  transactions: [],               // always kept newest-first
  filters: { month: "all", category: "all" },
  budgets: {}                     // one amount per month, for example { "2026-10": 30000 }
};

// ----- Page elements we need to talk to -----
const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const amountError = document.getElementById("amount-error");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const statusMessage = document.getElementById("status");

const monthFilter = document.getElementById("filter-month");
const categoryFilter = document.getElementById("filter-category");

const totalIncome = document.getElementById("total-income");
const totalExpenses = document.getElementById("total-expenses");
const totalBalance = document.getElementById("total-balance");

const breakdownList = document.getElementById("breakdown-list");
const breakdownEmpty = document.getElementById("breakdown-empty");

const transactionList = document.getElementById("transaction-list");
const transactionsEmpty = document.getElementById("transactions-empty");
const transactionCount = document.getElementById("transaction-count");

const budgetLabel = document.getElementById("budget-label");
const budgetInput = document.getElementById("budget-input");
const budgetSave = document.getElementById("budget-save");
const budgetRemaining = document.getElementById("budget-remaining");
const budgetWarning = document.getElementById("budget-warning");

const resetButton = document.getElementById("reset-button");

// ----- Saving and loading -----

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  } catch (error) {
    setStatus("Could not save to this browser. Your changes will be lost when you close the page.", true);
  }
}

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return Finance.sortByDateDesc(parsed);
      }
    }
  } catch (error) {
    // If the saved data is damaged, fall through and start with samples.
  }
  return Finance.buildSampleTransactions(new Date());
}

function saveBudgets() {
  try {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
  } catch (error) {
    setStatus("Could not save to this browser. Your changes will be lost when you close the page.", true);
  }
}

function loadBudgets() {
  try {
    const saved = localStorage.getItem(BUDGET_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    // If the saved data is damaged, start with no budgets.
  }
  return {};
}

// ----- Small helpers -----

function formatMoney(amount) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY
  }).format(amount);
}

function formatMonth(monthText) {
  // monthText looks like "2026-10"
  const parts = monthText.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  return date.toLocaleDateString(LOCALE, { month: "long", year: "numeric" });
}

function formatDay(dateText) {
  // dateText looks like "2026-10-05"
  const parts = dateText.split("-");
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return date.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
}

function setStatus(message, isError) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", Boolean(isError));
}

function selectedType() {
  return form.elements["type"].value;
}

function fillSelect(select, options, selectedValue) {
  select.innerHTML = "";
  options.forEach(function (option) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.appendChild(element);
  });
  select.value = selectedValue;
}

// ----- Drawing the page -----

function renderFormCategories() {
  const options = Finance.getCategoriesFor(selectedType()).map(function (name) {
    return { value: name, label: name };
  });
  fillSelect(categorySelect, options, options[0].value);
}

function renderFilters() {
  // Month filter: "All time" plus every month that has data.
  const monthOptions = [{ value: "all", label: "All time" }].concat(
    Finance.getAvailableMonths(state.transactions).map(function (month) {
      return { value: month, label: formatMonth(month) };
    })
  );
  const monthStillExists = monthOptions.some(function (o) {
    return o.value === state.filters.month;
  });
  if (!monthStillExists) {
    state.filters.month = "all";
  }
  fillSelect(monthFilter, monthOptions, state.filters.month);

  // Category filter: "All categories" plus every category.
  const everyCategory = Finance.INCOME_CATEGORIES.concat(Finance.EXPENSE_CATEGORIES);
  const categoryOptions = [{ value: "all", label: "All categories" }].concat(
    everyCategory.map(function (name) {
      return { value: name, label: name };
    })
  );
  fillSelect(categoryFilter, categoryOptions, state.filters.category);
}

function renderSummary(visible) {
  const totals = Finance.calculateTotals(visible);
  totalIncome.textContent = formatMoney(totals.income);
  totalExpenses.textContent = formatMoney(totals.expenses);
  totalBalance.textContent = formatMoney(totals.balance);
  totalBalance.classList.toggle("is-negative", totals.balance < 0);
}

/** The month the budget applies to: the chosen month, or this month for "All time". */
function budgetMonth() {
  if (state.filters.month !== "all") {
    return state.filters.month;
  }
  return Finance.toDateString(new Date()).slice(0, 7);
}

function renderBudget() {
  const month = budgetMonth();
  const budget = state.budgets[month];
  budgetLabel.textContent = "Budget for " + formatMonth(month) + " (₹)";

  if (typeof budget !== "number") {
    budgetInput.value = "";
    budgetRemaining.textContent = "No budget set for this month.";
    budgetRemaining.classList.remove("is-negative");
    budgetWarning.hidden = true;
    return;
  }

  const status = Finance.getBudgetStatus(state.transactions, month, budget);
  budgetInput.value = status.budget;
  budgetRemaining.textContent =
    "Left to spend: " + formatMoney(status.remaining) + " of " + formatMoney(status.budget);
  budgetRemaining.classList.toggle("is-negative", status.remaining < 0);

  if (status.remaining < 0) {
    budgetWarning.textContent =
      "⚠ You are " + formatMoney(-status.remaining) + " over your budget for " + formatMonth(month) + ".";
    budgetWarning.hidden = false;
  } else {
    budgetWarning.hidden = true;
  }
}

function renderBreakdown(visible) {
  const breakdown = Finance.getCategoryBreakdown(visible);
  breakdownList.innerHTML = "";
  breakdownEmpty.hidden = breakdown.length > 0;

  breakdown.forEach(function (item) {
    const row = document.createElement("li");
    row.className = "breakdown-row";

    const label = document.createElement("div");
    label.className = "breakdown-label";

    const name = document.createElement("span");
    name.textContent = item.category;

    const amount = document.createElement("span");
    amount.className = "breakdown-amount";
    amount.textContent = formatMoney(item.total) + " (" + Math.round(item.percent) + "%)";

    label.appendChild(name);
    label.appendChild(amount);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = item.percent + "%";
    track.appendChild(fill);

    row.appendChild(label);
    row.appendChild(track);
    breakdownList.appendChild(row);
  });
}

function renderTransactions(visible) {
  transactionList.innerHTML = "";
  transactionsEmpty.hidden = visible.length > 0;
  transactionCount.textContent =
    visible.length + (visible.length === 1 ? " transaction" : " transactions");

  visible.forEach(function (t, index) {
    const row = document.createElement("li");
    row.className = "transaction-row";

    const main = document.createElement("div");
    main.className = "transaction-main";

    const title = document.createElement("span");
    title.className = "transaction-title";
    title.textContent = t.description;

    const meta = document.createElement("span");
    meta.className = "transaction-meta";
    meta.textContent = t.category + ", " + formatDay(t.date);

    main.appendChild(title);
    main.appendChild(meta);

    const amount = document.createElement("span");
    amount.className = "transaction-amount " + (t.type === "income" ? "income" : "expense");
    amount.textContent = (t.type === "income" ? "+" : "-") + formatMoney(t.amount);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button-delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", "Delete " + t.description);
    deleteButton.dataset.index = String(index);

    row.appendChild(main);
    row.appendChild(amount);
    row.appendChild(deleteButton);
    transactionList.appendChild(row);
  });
}

function render() {
  renderFilters();
  const visible = Finance.filterTransactions(state.transactions, state.filters);
  renderSummary(visible);
  renderBudget();
  renderBreakdown(visible);
  renderTransactions(visible);
}

// ----- Reacting to what the person does -----

form.addEventListener("submit", function (event) {
  event.preventDefault();

  // If the amount box is empty, show a message right under it and stop here.
  if (amountInput.value.trim() === "") {
    amountError.textContent = "How much was it?";
    amountInput.focus();
    return;
  }
  amountError.textContent = "";

  try {
    const newTransaction = Finance.createTransaction({
      description: descriptionInput.value,
      amount: amountInput.value,
      type: selectedType(),
      category: categorySelect.value,
      date: dateInput.value
    });

    state.transactions = Finance.sortByDateDesc([newTransaction].concat(state.transactions));
    saveTransactions();
    render();

    // Put the form back to how it looks when the page first opens,
    // so it is ready for the next transaction.
    descriptionInput.value = "";
    amountInput.value = "";
    form.elements["type"].value = "expense";
    renderFormCategories();
    dateInput.value = Finance.toDateString(new Date());
    descriptionInput.focus();
    setStatus("Transaction added.", false);
  } catch (error) {
    setStatus(error.message, true);
  }
});

form.elements["type"].forEach(function (radio) {
  radio.addEventListener("change", renderFormCategories);
});

monthFilter.addEventListener("change", function () {
  state.filters.month = monthFilter.value;
  render();
});

categoryFilter.addEventListener("change", function () {
  state.filters.category = categoryFilter.value;
  render();
});

budgetSave.addEventListener("click", function () {
  const amount = Number(budgetInput.value);
  if (budgetInput.value.trim() === "" || !Number.isFinite(amount) || amount <= 0) {
    setStatus("Budget must be a number greater than zero.", true);
    return;
  }

  state.budgets[budgetMonth()] = Math.round(amount * 100) / 100;
  saveBudgets();
  render();
  setStatus("Budget saved for " + formatMonth(budgetMonth()) + ".", false);
});

transactionList.addEventListener("click", function (event) {
  const button = event.target.closest(".button-delete");
  if (!button) return;

  // "index" is the position of the row that was clicked.
  const index = Number(button.dataset.index);
  state.transactions.splice(index, 1);

  saveTransactions();
  render();
  setStatus("Transaction deleted.", false);
});

resetButton.addEventListener("click", function () {
  const sure = window.confirm("Replace everything with the sample data? Your own entries will be removed.");
  if (!sure) return;

  state.transactions = Finance.buildSampleTransactions(new Date());
  state.filters = { month: "all", category: "all" };
  saveTransactions();
  render();
  setStatus("Sample data restored.", false);
});

// ----- Start the app -----

state.transactions = loadTransactions();
state.budgets = loadBudgets();
dateInput.value = Finance.toDateString(new Date());
renderFormCategories();
render();
