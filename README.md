# Dashboard CSV → Vercel

Minimal Next.js + TypeScript dashboard that accepts a CSV (exported from the user's XLSX) and renders simple charts.

How to run locally

1. From `dashboard-vercel` install deps:

```bash
npm install
npm run dev
```

2. Open `http://localhost:3000` and upload your CSV.

Deploy to Vercel

1. Push this repository to GitHub.
2. Connect the repo in Vercel and set the root to the project folder (if needed).
3. Vercel will run `npm install` and `npm run build` automatically.

Notes
- The page expects the same column headers as described; the parser normalizes keys by collapsing extra spaces.
- If your CSV uses semicolon separators or different locale formatting, export using commas or adjust the CSV export.
