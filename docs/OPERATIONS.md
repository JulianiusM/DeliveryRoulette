# Operations Guide

Operational notes for running and monitoring a DeliveryRoulette instance.

## Table of Contents

- [Health Check](#health-check)
- [Logging](#logging)
- [Provider Sync](#provider-sync)
- [Backup & Restore](#backup--restore)
- [Environment Checklist](#environment-checklist)

---

## Health Check

The application exposes a `GET /health` endpoint that returns JSON:

```json
{
  "status": "healthy",
  "version": "0.1.0-rc.0",
  "uptime": 3600,
  "db": "ok"
}
```

| Field | Description |
|-------|-------------|
| `status` | `healthy` when everything is fine, `degraded` when the DB is unreachable |
| `version` | Application version from `package.json` |
| `uptime` | Process uptime in seconds |
| `db` | `ok` or `unavailable` |

HTTP status is **200** when healthy, **503** when degraded. Use this endpoint for load-balancer or container orchestrator probes.

---

## Logging

DeliveryRoulette uses **pino** for structured JSON logging.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |

### Sensitive field redaction

The following fields are automatically replaced with `[REDACTED]` in log output:

- `password`, `secret`, `token`, `authorization`, `cookie`
- `req.headers.authorization`, `req.headers.cookie`

### HTTP request logging

HTTP requests are logged via `pino-http` (included as middleware in the Express pipeline).

---

## Provider Sync

External delivery providers can be synced automatically or manually.

### Scheduled sync

If `syncIntervalMs` is set to a positive number, a background timer runs the sync at that interval. Configure via:

```bash
SYNC_INTERVAL_MS=3600000   # every hour
```

Set to `0` to disable scheduled sync.

### Manual sync

Trigger a sync through the application UI or by calling the sync route while authenticated.

### Sync artifacts

| Entity | Purpose |
|--------|---------|
| `SyncJob` | One row per sync run with status and timing |
| `SyncAlert` | Warnings or errors raised during a run |
| `ProviderFetchCache` | Cached provider responses to reduce API calls |

---

## Backup & Restore

### Database backup

Use `mysqldump` (or `mariadb-dump`) to create a full backup:

```bash
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > backup.sql
```

### Restore

```bash
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backup.sql
```

### What to back up

| Item | Location | Notes |
|------|----------|-------|
| Database | MariaDB | Contains all application data |
| Environment files | `.env`, `settings.csv` | Credentials and config (do **not** commit) |
| Uploads | `uploads/` | User-uploaded files (if any) |

---

## Environment Checklist

Use this checklist when deploying a new instance:

- [ ] MariaDB running and accessible
- [ ] Database created and user granted permissions
- [ ] Environment variables configured (DB, session secret, OIDC if used)
- [ ] `npm run build` completed
- [ ] `npm run typeorm:migrate` applied all migrations
- [ ] `npm run seed:diet-tags` executed
- [ ] Health endpoint returns `200` at `/health`
- [ ] HTTPS configured (reverse proxy or load balancer)
- [ ] Backups scheduled

---

## Related Documentation

- [Configuration](CONFIGURATION.md) — full list of settings and env vars
- [Database Guide](DATABASE.md) — entities, migrations, and testing
- [Architecture](ARCHITECTURE.md) — system design and deployment diagram
