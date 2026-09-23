# XI RPL

Class management system for XI RPL — daily journals (habits), daily check-ins, schedules, and albums, all in one monorepo.

## Monorepo Structure

```
├── apps/
│   ├── api/          # Backend API — ElysiaJS + Drizzle ORM (port 3601)
│   └── web/          # Frontend — Next.js 16 + React 19 + Tailwind 4 (port 3600)
├── packages/
│   ├── db/           # Database schema & migrations (Drizzle, PostgreSQL)
│   └── shared/       # Shared code & constants between apps
├── services/
│   └── card-checkins/ # ESP32 check-in card firmware (PlatformIO)
├── turbo.json        # Task runner pipeline
├── biome.json        # Lint & format
└── Dockerfile        # Multi-stage build (api & web)
```

## Tech Stack

| Layer   | Stack |
|---------|-------|
| Runtime | Bun 1.3+ |
| Monorepo| Turborepo + workspaces |
| API     | ElysiaJS, Drizzle ORM, PostgreSQL, JWT, Google OAuth |
| Web     | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui, Elysia Eden (type-safe client) |
| Storage | S3-compatible (S3_ENDPOINT), sharp for image processing |
| Quality | Biome (lint + format), TypeScript |

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- PostgreSQL (local or remote)

## Setup

```bash
# 1. Install dependencies
bun install

# 2. Prepare environment (copy & fill)
cp apps/api/.env.example   apps/api/.env
cp apps/web/.env.example   apps/web/.env
cp packages/db/.env.example packages/db/.env
```

Fill in the environment variables:

**`apps/api/.env`**

```
DATABASE_URL=postgres://user:pass@host:5432/xirpl
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
WEB_URL=http://localhost:3600
S3_ENDPOINT=
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
```

**`apps/web/.env`** — `API_URL=http://localhost:3601`

**`packages/db/.env`** — `DATABASE_URL=` (same as api)

```bash
# 3. Initialize database
bun run db:generate   # generate migrations from schema
bun run db:migrate    # run migrations
```

## Development

```bash
bun run dev          # all apps (turbo)
bun run dev:api      # API only
bun run dev:web      # Web only
```

- Web: http://localhost:3600
- API: http://localhost:3601 — root redirects to `http://localhost:3601/docs` (Scalar API docs)

## Scripts

| Command | Purpose |
|---------|---------|
| `bun run build` | Build all apps (turbo) |
| `bun run typecheck` | Typecheck all workspaces |
| `bun run lint` | Biome check |
| `bun run lint:fix` | Biome check + auto-fix |
| `bun run format` | Biome format |
| `bun run db:generate` / `db:migrate` / `db:push` / `db:pull` | Manage database schema |

## API Modules

- **Auth** — Google OAuth login, JWT bearer token (full docs at `/docs`)
- **Users** — class member data
- **IoT** — device endpoints (check-in cards)
- **Checkins** — daily check-ins (+ admin)
- **Journals** — journal / habit tracking (+ admin), PDF recap export (pdfkit)
- **Leaderboard** — streak rankings
- **Storage** — file uploads to S3-compatible storage
- **Notifications** — authenticated `GET`, `POST`, `PATCH`, `DELETE` at `/notifications/subscriptions`; browser-scoped check-in reminders

## Check-in push reminders

1. Generate persistent VAPID keys with `bunx web-push generate-vapid-keys`.
2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (e.g. `mailto:admin@example.com`) in the API environment. Docker Compose forwards these variables. Keep the private key secret and retain the same key pair across deployments.
3. Apply the database schema with the existing `bun run db:push` workflow, or generate/apply migrations using your deployment's migration history. This adds `notification_subscriptions`; migration artifacts are ignored by this repository. Review schema changes before applying to production.
4. Serve the web app over HTTPS (localhost works for development), then enable **Ingatkan check-in pukul 06.45 WIB** on `/habit`. Permission is requested only when enabling. iOS/iPadOS requires installation on the Home Screen.

Reminders run daily at **06:45 WIB (Asia/Jakarta, UTC+7)** while the API process is running. Only enabled subscriptions belonging to users without today's check-in qualify. Database claims prevent duplicate sends across API replicas; disabling preserves the subscription for later reactivation. Expired push endpoints are deleted. `PATCH /notifications/subscriptions` accepts `{ "endpoint": "...", "enabled": false }`, ready for a future settings screen; `GET` takes an optional endpoint and returns its enabled state plus the public VAPID key.

Push delivery is best-effort, not an exact-time alarm. Payloads expire at 06:46 WIB and the worker ignores late delivery. There is no catch-up after downtime or retry after a failed send, avoiding late/duplicate reminders. Existing OS notifications may remain visible after expiration. Missing VAPID configuration disables opt-in but still permits opt-out. Supported push providers: FCM, Mozilla, Apple, and Windows.

Runnable contract check (isolated PostgreSQL database only; apply schema first):

```bash
NOTIFICATION_CHECK_DATABASE_URL=postgres://user:pass@localhost/test_db \
  bun apps/api/src/modules/notifications/notifications.check.ts
```

The check exercises real authenticated routes and database queries, VAPID encryption, and worker event handling; external push transport is simulated.

## Docker

Separate multi-stage builds for api and web:

```bash
docker build --target api -t xirpl-api .
docker build --target web -t xirpl-web --build-arg API_URL=https://api.example.com .
```