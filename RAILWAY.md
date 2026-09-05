# Deploying Pulse on Railway

Two services build from this one repo, so each needs its own start command.
Railpack (Railway's builder) takes that from a config file, and
`RAILPACK_CONFIG_FILE` selects which file a given service uses — that variable
is the only thing distinguishing the two services' builds.

| Service        | `RAILPACK_CONFIG_FILE`  | Starts             |
| -------------- | ----------------------- | ------------------ |
| `pulse-api`    | `railpack.server.json`  | `npm run server`   |
| `pulse-worker` | `railpack.worker.json`  | `npm run worker`   |

## Variables

`DATABASE_URL` is referenced from the Postgres service as
`${{Postgres.DATABASE_URL}}`. On Railway that value is the **private**
`.railway.internal` address — `DATABASE_PUBLIC_URL` is the public proxy, and
nothing here should use it. (There is no `DATABASE_PRIVATE_URL` on this
Postgres; the private one is plain `DATABASE_URL`.)

| Variable                     | api | worker | Notes                                        |
| ---------------------------- | --- | ------ | -------------------------------------------- |
| `DATABASE_URL`               | ✓   | ✓      | `${{Postgres.DATABASE_URL}}` — private        |
| `RAILPACK_CONFIG_FILE`       | ✓   | ✓      | selects the start command                     |
| `INDIAN_STOCK_API_BASE_URL`  |     | ✓      | the deployed Cloudflare Worker                |
| `TWELVE_DATA_API_KEY`        |     | ✓      | US quotes                                     |
| `CORS_ORIGIN`                | ✓   |        | the deployed frontend origin, comma-separated |

`PORT` is injected by Railway and read by `server/index.js`. Nothing sets
`RAILWAY_ENVIRONMENT` by hand — Railway provides it, and it's what flips
`exitOnUncaught` on so a crashed process gets restarted rather than lingering.

## Migrations

Schema changes are applied by hand against the database; nothing runs
automatically on deploy. The `migration_*.sql` files are idempotent
(`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`) but are deliberately not wired
into the start command — this database holds real data.
