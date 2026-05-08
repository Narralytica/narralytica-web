# Narralytica Web

Narralytica is a crypto market context terminal. It gives readers a structured view of market pulse, liquidity, ETF flows, macro catalysts, news, treasury activity, and narrative rotation without presenting itself as a simple buy/sell signal tool.

This repository is the website. It renders the terminal interface and reads prepared payloads from Supabase through server-side Next.js API routes.

## What This Repo Does

- Displays the Narralytica terminal experience.
- Renders market pulse, structure, analysis, events, watchlists, and desk views.
- Reads terminal payloads from Supabase via `/api/terminal-data`.
- Keeps provider secrets out of the browser.

The backend that fetches, calculates, and publishes the data lives in a separate Narralytica backend repository.

## Data Flow

```text
Backend repo
-> publishes terminal payloads to Supabase
-> this website reads Supabase from /api/terminal-data
-> React components render the terminal
```

The website does not run the main market-data pipeline. It only reads the finished payloads.

## Main Files

- `app/page.tsx`  
  Main app shell and view switching.
- `app/api/terminal-data/route.ts`  
  Reads terminal payloads from Supabase.
- `app/api/hot-news/route.ts`  
  Lightweight hot-news proxy used by the relationship module.
- `components/narralytica/market-terminal.tsx`  
  Main terminal, desk, analysis, events, and watch sections.
- `components/narralytica/relationship-module.tsx`  
  Relationship and event-impact exploration view.

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Environment

The website needs read-only Supabase credentials.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

The route also accepts these local names:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Do not add provider API keys or the Supabase service-role key to this website. Those belong in the backend only.

## Deployment

On Vercel, set:

```env
SUPABASE_URL
SUPABASE_ANON_KEY
```

Before the deployed website can show fresh data, the backend must publish rows into `public.terminal_payloads` in Supabase.

## Notes

- `.next/`, `.vercel/`, `node_modules/`, logs, and env files are ignored by git.
- The website is a read layer; storage and refresh timing are handled outside this repo.
- Keep public-facing docs high level. Do not commit internal keys, generated build output, or private runtime data.
