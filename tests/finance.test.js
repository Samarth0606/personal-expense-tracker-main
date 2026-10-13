const test = require("node:test");
const assert = require("node:assert");
const Finance = require("../js/finance.js");

const transactions = [
  { id: "1", description: "Groceries", amount: 2000, type: "expense", category: "Food", date: "2026-10-03" },
  { id: "2", description: "Rent", amount: 24000, type: "expense", category: "Rent", date: "2026-10-01" },
  { id: "3", description: "Salary", amount: 85000, type: "income", category: "Salary", date: "2026-10-01" },
  { id: "4", description: "Cab", amount: 900, type: "expense", category: "Transport", date: "2026-09-28" }
];

test("getBudgetStatus counts only that month's expenses", function () {
  const status = Finance.getBudgetStatus(transactions, "2026-10", 30000);
  assert.deepStrictEqual(status, { budget: 30000, spent: 26000, remaining: 4000 });
});

test("getBudgetStatus ignores income", function () {
  const status = Finance.getBudgetStatus(transactions, "2026-10", 30000);
  assert.strictEqual(status.spent, 26000);
});

test("getBudgetStatus ignores other months", function () {
  const status = Finance.getBudgetStatus(transactions, "2026-09", 5000);
  assert.deepStrictEqual(status, { budget: 5000, spent: 900, remaining: 4100 });
});

test("getBudgetStatus goes negative when overspent", function () {
  const status = Finance.getBudgetStatus(transactions, "2026-10", 20000);
  assert.strictEqual(status.remaining, -6000);
});
