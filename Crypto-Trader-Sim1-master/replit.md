# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── crypto-trading/     # React + Vite crypto trading simulator
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Crypto Trading Simulator

### Features
- Live TradingView chart widgets (BTC, ETH, SHIB)
- Live order book with real prices via CoinGecko API (Binance is geo-restricted)
- Order types: Market, Limit, Stop-Limit, Stop-Market
- Simulated portfolio with $100,000 starting balance
- Glassmorphism dark UI design

### Market Data Architecture
- Backend polls CoinGecko REST API every 3s for real prices
- WebSocket proxy at `/api/ws/market` pushes ticker + simulated order book to frontend
- Order book is algorithmically generated around real prices (Binance WebSocket geo-blocked from Replit)

### Database Schema
- `orders` - Trading order history
- `portfolio` - USD balance
- `holdings` - Per-coin holdings

### API Routes
- `GET /api/portfolio` - Get portfolio
- `POST /api/orders` - Place order
- `GET /api/orders` - Get order history
- `DELETE /api/orders/:id` - Cancel order
- `POST /api/portfolio/reset` - Reset portfolio
- `GET /api/market/prices` - Get current prices
- `WS /api/ws/market` - Live market data WebSocket

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
