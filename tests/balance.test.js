const test = require("node:test");
const assert = require("node:assert");
const Finance = require("../js/finance.js");

test("balance is income minus expenses", function () {
  const transactions = [
    { id: "1", description: "Salary", amount: 85000, type: "income", category: "Salary", date: "2026-10-01" },
    { id: "2", description: "Rent", amount: 24000, type: "expense", category: "Rent", date: "2026-10-01" },
    { id: "3", description: "Groceries", amount: 2000, type: "expense", category: "Food", date: "2026-10-03" }
  ];
  const totals = Finance.calculateTotals(transactions);
  assert.deepStrictEqual(totals, { income: 85000, expenses: 26000, balance: 59000 });
});

test("balance is zero when there are no transactions", function () {
  const totals = Finance.calculateTotals([]);
  assert.deepStrictEqual(totals, { income: 0, expenses: 0, balance: 0 });
});

test("balance goes negative when spending is more than income", function () {
  const transactions = [
    { id: "1", description: "Freelance job", amount: 5000, type: "income", category: "Freelance", date: "2026-10-02" },
    { id: "2", description: "Rent", amount: 24000, type: "expense", category: "Rent", date: "2026-10-01" }
  ];
  const totals = Finance.calculateTotals(transactions);
  assert.strictEqual(totals.balance, -19000);
});

test("balance with paise is rounded to two decimal places", function () {
  const transactions = [
    { id: "1", description: "Salary", amount: 100.10, type: "income", category: "Salary", date: "2026-10-01" },
    { id: "2", description: "Tea", amount: 0.20, type: "expense", category: "Food", date: "2026-10-02" }
  ];
  const totals = Finance.calculateTotals(transactions);
  assert.strictEqual(totals.balance, 99.9);
});
