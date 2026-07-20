# CFP Voting System

A lightweight conference proposal voting app for collecting audience interest, ranking talks, and publishing final results when organizers are ready.

The app uses approval voting: each voter can support up to a configured number of talks. Talk order is randomized per voter to reduce position bias, live results are admin-only, and organizers can publish a public results page after review.

## Features

- Clerk-based sign-in
- First signed-in user becomes the bootstrap admin
- Optional configured admin email list for additional admins
- Admin management with safe removal rules
- Conference setup with voting window and manual open/closed override
- Explicit vote budget per voter
- Stable randomized talk order per voter
- Voters can change selections until voting closes
- Admin-only live results
- Public results page controlled by an admin publish/hide switch
- Results methodology and participation stats
- Audit trail for admin actions
- CSV talk import
- Local D1 reset and seed commands

## Project Structure

```text
apps/
  api/        Cloudflare Worker API built with Hono
  web/        React + Vite frontend
packages/
  db/         Shared database schema, types, seed data, and voting-status logic
```

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Hono
- Cloudflare Workers
- Cloudflare D1
- Clerk
- React Query
- Vitest

## Voting Model

This app uses approval voting.

Each voter gets `votes_per_voter` selections. They may use all, some, or none of those votes. Each selected talk receives one vote from that voter. Final results are ranked by total vote count.

Talk duration is intentionally not part of voting. The vote tells organizers what people want to see; scheduling decisions can happen later. If a highly voted talk deserves more time, organizers can extend it. If there is leftover schedule time, organizers can slot in lower-ranked talks.

To reduce bias:

- Voters do not see live results.
- Results stay admin-only until published.
- Talk order is randomized per voter, but stable for that voter.
- Published results include voting method and participation stats.

## Auth And Admins

Users authenticate through Clerk.

Admin behavior:

- If `admin_users` is empty, the first synced user becomes admin.
- Additional admins can be configured with `ADMIN_EMAIL`.
- `ADMIN_EMAIL` supports comma-separated or newline-separated emails.
- Admins cannot vote.
- Admins cannot remove their own admin access.
- The last remaining admin cannot be removed.

Normal signed-in users become voters automatically.

## Environment Variables

Create `apps/api/.dev.vars` for local Worker development:

```env
CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
ALLOWED_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com,other-admin@example.com
```

Create `apps/web/.env.local` for local frontend development:

```env
VITE_CLERK_PUBLISHABLE_KEY=...
VITE_API_URL=
```

Use an empty `VITE_API_URL` when the Vite dev server proxies or serves against the local API setup you are using. Set it to a full API URL if the web app should call a remote Worker.

Do not commit real `.dev.vars` or `.env.local` files.

## Install

```bash
npm install
```

## Local Database

The D1 binding is configured in `apps/api/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "cfp-voting"
database_id = "local-db"
```

Reset the local database:

```bash
npm run db:reset:local
```

Seed the local database:

```bash
npm run db:seed:local
```

Reset and seed in one step:

```bash
npm run db:reset-seed:local
```

Seed data includes:

- one open conference
- eight talks
- ten fake voters
- seeded votes
- public results hidden while seeded voting is open

Seed data does not create admins, so the next real signed-in user can still become the bootstrap admin.

## Development

Start the API:

```bash
npm run dev:api
```

Start the web app in another terminal:

```bash
npm run dev:web
```

Open:

```text
http://localhost:5173
```

## Main Workflows

### Admin Setup

1. Sign in as the first user.
2. The first synced user becomes admin.
3. Go to `Conference`.
4. Create or update the conference.
5. Set `Votes per voter`.
6. Set a voting window or manually force voting open.
7. Add talks or import a CSV.

### Voter Flow

1. Sign in.
2. View the voting page.
3. Read the voting rules and countdown.
4. Select up to the configured vote budget.
5. Change selections any time before voting closes.

### Results Flow

1. Admins view live results under `Results`.
2. Results are ranked by vote count.
3. Admins review participation stats and methodology.
4. Admin publishes results when ready.
5. Public users can visit `/results`.

## CSV Import

Talk CSV supports:

```csv
title,description,presenter_name,presenter_bio,presenter_email
Local-first Product Engineering,How to build fast tools,Anika Rao,Bio,anika@example.com
```

Required columns:

- `title`
- `presenter_name`

Optional columns:

- `description`
- `presenter_bio`
- `presenter_email`

`duration_minutes` is still tolerated for backward compatibility, but it is not used in the voting flow.

## Testing

Run API tests:

```bash
npm -w apps/api run test
```

Run shared DB package tests:

```bash
npm -w packages/db run test
```

Type-check the API:

```bash
npx tsc -p apps/api/tsconfig.json --noEmit
```

Build the web app:

```bash
npm -w apps/web run build
```

Recommended full check:

```bash
npm -w apps/api run test
npm -w packages/db run test
npx tsc -p apps/api/tsconfig.json --noEmit
npm -w apps/web run build
```

## Deployment Notes

API deployment uses Wrangler:

```bash
npm -w apps/api run deploy
```

Web deployment uses Cloudflare Pages:

```bash
npm -w apps/web run build
npm -w apps/web run deploy
```

Before production deployment:

- Create a real D1 database.
- Update `database_id` in `apps/api/wrangler.toml`.
- Set `ALLOWED_ORIGIN` to the production web origin.
- Set Clerk production keys.
- Set production secrets through Cloudflare, not committed files.
- Apply schema migrations to the production D1 database.

## Existing Database Migrations

If updating an older local or production database, add these columns/tables:

```sql
ALTER TABLE conferences ADD COLUMN results_public INTEGER NOT NULL DEFAULT 0;

ALTER TABLE talks ADD COLUMN talk_type   TEXT;
ALTER TABLE talks ADD COLUMN cfp_url     TEXT;
ALTER TABLE talks ADD COLUMN cfp_content TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id             TEXT PRIMARY KEY,
  admin_user_id  TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,
  target_type    TEXT NOT NULL,
  target_id      TEXT,
  details        TEXT,
  created_at     INTEGER NOT NULL
);
```

## Useful Commands

```bash
npm run dev:api
npm run dev:web
npm run db:reset:local
npm run db:seed:local
npm run db:reset-seed:local
npm run test:api
npm run test:db
```

## Notes

- Admins cannot vote; the voting page shows an admin preview message.
- Public results are hidden until an admin publishes them.
- The audit trail records organizer actions that affect voting, results, access, and ballot content.
- The app assumes anyone who signs up can vote.
