# Nexora

Nexora is an institutional-style quantitative asset pool built around the
`$NXR` ecosystem. It gives participants a clear view of their position in a
managed liquidity pool, the activity of its quantitative strategies, and the
way pool results are distributed across participants.

The product is designed to feel like a focused investment terminal: dense
where information matters, quiet where it does not, and straightforward to
use on both mobile and desktop.

## Product Overview

Nexora combines four connected parts:

### `$NXR` ecosystem token

`$NXR` is the unit used to represent a participant's stake in the pool. A
user's token balance determines their proportional ownership of the circulating
pool and is used when calculating their share of generated results.

### Quantitative trading engine

Nexora's revenue engine uses automated quantitative strategies designed to
identify market-neutral opportunities across digital-asset venues. The system
monitors order books and market data from venues such as Binance and Bybit,
looking for price differences in assets such as BTC, ETH, and SOL.

The product surface will make this activity understandable through live market
data, strategy activity, execution records, and performance information rather
than presenting an opaque balance number.

### Shared liquidity pool

Trading results flow into a collective pool. Participant distributions are
calculated dynamically from each user's share of the circulating `$NXR` supply
and the pool's distributable results. The model is based on proportional
participation rather than a fixed interest promise.

### First-loss reserve

The pool includes a reserve layer funded during profitable periods. When a
strategy experiences a drawdown, the reserve is designed to absorb losses first
according to the pool's operating rules, separating strategy-level loss
handling from the participant ledger.

## Participant Experience

The primary user journey is:

1. Sign in with Google.
2. Enter a private investor dashboard.
3. View USD balance, `$NXR` balance, pool ownership, and unclaimed results.
4. Fund the account and acquire `$NXR` through the supported funding flow.
5. Monitor market conditions, quantitative strategy activity, pool health, and
   reserve status.
6. Review deposits, purchases, distributions, and account activity in a clear
   personal ledger.

The authenticated root route (`/`) is the private destination after login.
The authentication route is `/auth`. The privacy policy is available at
`/privacy`.

## Planned Dashboard

The dashboard will be organized around the information a participant needs
most often:

- **Pool summary:** total pool value, distributable results, and reserve status.
- **Portfolio:** `$NXR` balance, USD balance, pool ownership percentage, and
  account-level results.
- **Market view:** `$NXR` price, historical candles, live market indicators,
  and relevant digital-asset feeds.
- **Quant terminal:** readable HFT bot and arbitrage activity, including venue
  pairs, assets, execution time, spread, and realized result.
- **Funding:** supported deposit flow and clear transaction status.
- **Ledger:** deposits, `$NXR` purchases, distributions, and account events.

The interface follows the Obsidian Void and Neon Slate direction: deep obsidian
backgrounds, slate surfaces, crisp borders, emerald performance accents,
crimson drawdown states, and cyan live-data indicators. Components will be
mobile-first while retaining a dense institutional layout on larger screens.

## Backend Foundation

The current application uses Next.js with Appwrite as the backend platform.
Appwrite is responsible for:

- Google authentication and user sessions.
- User and account identity data.
- Database collections for wallets, balances, transactions, pool data, and
  strategy activity.
- Document-level permissions for participant data.
- Future realtime updates for market and strategy activity.

The current Appwrite client is configured in `src/lib/appwrite.js`. Browser
authentication uses the Appwrite Web SDK. Google OAuth redirects to `/` after a
successful sign-in and returns to `/auth?error=oauth` when the flow fails.

The local Appwrite configuration is stored in `.env` and is intentionally
ignored by Git. Use `.env.example` as the configuration template.

## Current Routes

- `/auth` - Google sign-in and session entry point.
- `/` - authenticated application destination, currently reserved for the
  investor dashboard.
- `/privacy` - Nexora privacy policy.

Unauthenticated visitors to `/` are redirected to `/auth`. Authenticated
visitors who open `/auth` are redirected to `/`.

## Development

Install dependencies:

```bash
npm install
```

Start the development server with hot reload:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run a production validation build when preparing a release:

```bash
npm run build
```

## Configuration

The required public Appwrite settings are:

```env
NEXT_PUBLIC_APPWRITE_PROJECT_ID=6aa1173b002524b6310f
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=nexora
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
```

Google OAuth must be enabled in the Appwrite project and the application's
hostnames must be configured in the Appwrite platform settings. Production
deployment is connected to the `main` branch of:

`https://github.com/omktrd-lab/nexora-llc`

## Project Direction

Nexora is being built incrementally. Authentication and the protected route
boundary are the first foundation. The next major surface is the authenticated
investor dashboard, followed by the participant ledger, wallet data model,
funding flows, market feeds, quantitative activity terminal, and reserve
reporting.

The product should remain simple to understand even as the underlying system
becomes sophisticated. Every screen should answer a practical question for the
participant: what do I own, how is the pool performing, what is the strategy
doing, and what is the current state of the reserve?