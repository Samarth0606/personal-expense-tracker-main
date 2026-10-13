# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A personal finance tracker in plain HTML, CSS and JavaScript. It has no build step, no dependencies, no framework and no server. To run it, open `index.html` in a browser. All data lives in the browser's `localStorage`. Tracked in git (initial commit `c3b5ff2`).

## Commands

- Run all tests: `npm test` (runs `node --test`; needs Node 18+)
- Run one test file: `node --test tests/finance.test.js`
- Run one test by name: `node --test --test-name-pattern="goes negative" tests/finance.test.js`
- Test files live in `tests/`. `npm test` finds and runs every `*.test.js` file there automatically:
  - `tests/finance.test.js`: budget status (`getBudgetStatus`)
  - `tests/balance.test.js`: total balance (`calculateTotals`): income minus expenses, empty list, negative balance, rounding to paise
- Seek permission everytime you need to make a change

There is no lint or build setup.

## Architecture

The code is split into two layers, and the split matters:

- `js/finance.js`: pure logic (validation, filtering, totals, budget status, category breakdown, sample data). It never touches the DOM. A UMD-style wrapper exposes it as the `Finance` global in the browser and through `module.exports` in Node. This file is the only one that can be tested. Put new logic here, and add each new public function to the object returned at the bottom of the file.
- `js/app.js`: DOM wiring. It holds a single `state` object (`transactions`, `filters`, `budgets`). Every change follows the same path: update `state`, call `save*()`, then call `render()`. `render()` rebuilds every section from `state` (filters, summary, budget, breakdown, list). The file runs top to bottom as a classic script. It is not a module, and it depends on `finance.js` loading first (see the script order in `index.html`).

Data conventions:
- Dates are `YYYY-MM-DD` strings. Months are `YYYY-MM` strings, and month filtering uses `date.slice(0, 7)`. String comparison is used for sorting. `toDateString` uses the local calendar day.
- Amounts are always positive. The sign comes from `type` (`"income"` or `"expense"`). Money values go through `round2`.
- Categories are fixed lists in `finance.js` (`INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`). `createTransaction` rejects a category that doesn't match its type.
- `state.transactions` stays sorted newest-first.
- `localStorage` keys: `personal-finance-tracker.transactions` and `personal-finance-tracker.budgets` (a map from month to amount). If saved data is missing or damaged, the app falls back to sample data from `buildSampleTransactions(today)`.
- Budgets count only expenses in the chosen month. When the month filter is "All time", the budget applies to the current month.

## Currency

`LOCALE` and `CURRENCY` are at the top of `js/app.js`. The ₹ symbol is also hard-coded in the `index.html` labels and in the budget label string in `renderBudget()` in `app.js`.

## Audience

The README is written for non-developers, and the code comments are written in plain beginner-friendly language. Keep that style.
