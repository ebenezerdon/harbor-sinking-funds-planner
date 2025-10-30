# Harbor Sinking Funds Planner

Harbor is a local-first sinking funds planner that makes big purchases feel small. Set categories, targets, and monthly contributions, then track deposits and withdrawals with elegant progress charts. Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems.

## Features
- Categories with target amount, saved balance, and color
- Donut and bar charts for each category plus an overall chart
- Transactions ledger: deposits and withdrawals with dates and notes
- Monthly contribution with projected completion date
- Search and sort (by name, progress, target, recent)
- Quick deposit and withdraw actions on each card
- LocalStorage persistence and JSON export/import
- Accessible, responsive, keyboard friendly UI

## Getting Started
1. Open index.html for the landing page.
2. Click the call-to-action or open app.html to start planning.
3. Add your first category, set a target, and record contributions.

No accounts. Your data never leaves your browser.

## Tech Stack
- HTML5
- Tailwind CSS via CDN
- jQuery 3.7.x
- Modular JavaScript with a single global namespace `window.App`

## Files
- index.html: editorial landing page with CTA
- app.html: main application UI
- styles/main.css: custom CSS (no Tailwind directives)
- scripts/helpers.js: utilities and local storage
- scripts/ui.js: rendering, events, and app logic
- scripts/main.js: application entry point

## Accessibility
- Semantic HTML and ARIA roles on modals
- Visible focus states, keyboard shortcuts, responsive tables
- Respects prefers-reduced-motion

## Data Safety
All data is stored locally in your browser using localStorage under the key `sinkingfunds:v1`. Use the Export button to back up your data and Import to restore it.

## License
MIT
