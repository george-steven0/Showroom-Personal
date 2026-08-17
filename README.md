# Showroom

A personal tool for a car-trading business: track cars bought from
suppliers, cars sold to buyers, supplier debt, capital, profit and
expenses.

## Stack

- **Frontend** (`frontend/`) — React 19, Vite, Ant Design 6, Redux Toolkit
  + RTK Query, Tailwind CSS v4, i18next (English/Arabic, RTL), react-hook-form
  + zod, echarts, `@react-pdf/renderer` + `react-to-print`, `xlsx`.
- **Backend** (`backend/`) — NestJS, Prisma, SQLite, JWT auth.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env   # fill in a real JWT_SECRET and admin credentials
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run start:dev
```

The API listens on `http://localhost:3000` (`/api/*`, plus `/health`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5190` (a fixed, non-default port
— 5173 tends to collide with other local projects' dev servers on this
machine) and proxies `/api` and `/health` to the backend.

Sign in with the admin username/password set in `backend/.env`
(`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`).

## What it does

- **Suppliers** — simple CRUD (name, address, phone).
- **Buying bills** — one bill can list several cars, each with its own
  supplier, chassis/motor number, model year, price and how much was
  actually paid at the time (the rest becomes supplier debt).
- **Selling bills** — pick a car still in stock, the buying-side fields
  fill in automatically; enter the selling price, date and buyer details.
- **Accounts** — running capital balance (goes negative when a purchase
  outspends what's on hand — that negative figure *is* how much is owed),
  a "who I owe" list per car/supplier with a "record payment" action,
  a profit panel with week/month/year/custom filters and a trend chart,
  and an expense ledger. Selling a car returns its full price to capital;
  buying, paying a supplier, and logging an expense all draw it down.
- **Summary** — a full debit/credit journal of every cash movement, with
  the same date filters, Excel export and print.

## Deployment

To run this permanently on a Windows PC as a background service that
starts on boot (no port 80, reachable at `http://elostaz-showroom.local:5000`),
see [`backend/deploy/README.md`](backend/deploy/README.md).

## Design notes

Every cash-affecting action (a purchase payment, a debt settlement, a
sale, an expense, a capital top-up) writes one row to a single ledger
table (`CashTransaction`). That table is the only source of truth for
both the Accounts page's capital figure and the Summary page's journal —
neither is computed independently, so they can't drift apart.
