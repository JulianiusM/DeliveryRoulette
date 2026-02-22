# Database Guide

This document covers the database design, entity relationships, migration workflow and configuration for DeliveryRoulette.

## Table of Contents

- [Entity-Relationship Overview](#entity-relationship-overview)
- [Entities](#entities)
- [Migrations](#migrations)
- [Configuration](#configuration)
- [Testing with a Real Database](#testing-with-a-real-database)

---

## Entity-Relationship Overview

```
Restaurant ──┬── MenuCategory ──── MenuItem
             ├── RestaurantProviderRef
             ├── DietManualOverride
             └── DietInferenceResult

DietTag (standalone lookup table)

User ──┬── UserPreference
       ├── UserDietPreference ──── DietTag
       ├── UserRestaurantPreference ──── Restaurant
       └── SuggestionHistory ──── Restaurant

ProviderSourceConfig
ProviderCredential
ProviderFetchCache

SyncJob
SyncAlert

Session (express-session store)
```

---

## Entities

All entities live under `src/modules/database/entities/` and are grouped by domain.

### Restaurant domain

| Entity | Table | Description |
|--------|-------|-------------|
| `Restaurant` | `restaurants` | Core restaurant record (name, address, active flag) |
| `RestaurantProviderRef` | `restaurant_provider_refs` | Links a restaurant to an external delivery provider |

### Menu domain

| Entity | Table | Description |
|--------|-------|-------------|
| `MenuCategory` | `menu_categories` | Category within a restaurant's menu |
| `MenuItem` | `menu_items` | Individual menu item with optional price |

### Diet domain

| Entity | Table | Description |
|--------|-------|-------------|
| `DietTag` | `diet_tags` | Seed-able lookup table (`VEGAN`, `HALAL`, …) |
| `DietInferenceResult` | `diet_inference_results` | Heuristic inference from menu text |
| `DietManualOverride` | `diet_manual_overrides` | Manual per-restaurant diet tag override |

### User domain

| Entity | Table | Description |
|--------|-------|-------------|
| `User` | `users` | User account (local or OIDC) |
| `UserPreference` | `user_preferences` | Delivery area, cuisine preferences |
| `UserDietPreference` | `user_diet_preferences` | Per-user diet tag selection |
| `UserRestaurantPreference` | `user_restaurant_preferences` | Favorites and do-not-suggest flags |

### Suggestion domain

| Entity | Table | Description |
|--------|-------|-------------|
| `SuggestionHistory` | `suggestion_history` | Past suggestion results for recency exclusion |

### Sync domain

| Entity | Table | Description |
|--------|-------|-------------|
| `SyncJob` | `sync_jobs` | Tracks provider sync runs |
| `SyncAlert` | `sync_alerts` | Alerts raised during sync |
| `ProviderSourceConfig` | `provider_source_configs` | Per-provider sync configuration |
| `ProviderCredential` | `provider_credentials` | Encrypted provider API credentials |
| `ProviderFetchCache` | `provider_fetch_caches` | Cached responses from providers |

### Infrastructure

| Entity | Table | Description |
|--------|-------|-------------|
| `Session` | `sessions` | Express session store (connect-typeorm) |

---

## Migrations

Migrations live in `src/migrations/` and are executed by TypeORM.

### Running migrations

```bash
# Apply all pending migrations
npm run typeorm:migrate

# Revert the last migration
npm run typeorm migration:revert migrationDataSource.ts
```

### Creating a new migration

```bash
npm run typeorm migration:create src/migrations/DescriptiveName
```

Edit the generated file and implement both `up()` and `down()` methods.

### Migration best practices

1. **Always create migrations** for schema changes — never use `synchronize: true` in production.
2. **Make migrations idempotent** — use `IF NOT EXISTS` / `IF EXISTS` where possible.
3. **Test both directions** — verify that `revert` cleanly undoes the migration.
4. **Name descriptively** — e.g. `CreateSuggestionHistory`, `AddDietTagIsActive`.

### Seeding

Diet tags are seeded via a dedicated script:

```bash
npm run seed:diet-tags
```

The seed is idempotent and safe to run repeatedly.

---

## Configuration

Database connection is configured through environment variables (or the centralized `settings.csv`). See [CONFIGURATION.md](CONFIGURATION.md) for the full list.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_TYPE` | `mariadb` | `mariadb` or `mysql` |
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `3306` | Database port |
| `DB_USER` | `user` | Database username |
| `DB_PASSWORD` | `password` | Database password |
| `DB_NAME` | `database` | Database name |

The data source is initialized in `src/modules/database/dataSource.ts` with `synchronize: false` and timezone set to UTC.

---

## Testing with a Real Database

Database integration tests use a dedicated test database to avoid touching development data.

### Docker quick start

```bash
docker compose -f docker-compose.mariadb.test.yml up -d
```

This starts a MariaDB 10.11 container with credentials:

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Port | `3306` |
| Root password | `root` |
| Database | `deliveryroulette_test` |
| User | `deliveryroulette` |
| Password | `deliveryroulette` |

### Test environment file

Copy the example and adjust if needed:

```bash
cp tests/.env.test.example tests/.env.test
```

### Running database tests

```bash
npm test                  # includes database tests
npm run test:all          # full suite including E2E
```

E2E tests use a separate database (`deliveryroulette_e2e`). See `.env.e2e.example` for its configuration.

---

## Related Documentation

- [Architecture](ARCHITECTURE.md) — system layers and design patterns
- [Development Guide](DEVELOPMENT.md) — full development workflow
- [Configuration](CONFIGURATION.md) — settings module and env vars
