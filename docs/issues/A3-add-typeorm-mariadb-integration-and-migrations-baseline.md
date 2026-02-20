# A3: Add TypeORM + MariaDB integration and migrations baseline

Milestone: M0 Bootstrap
Labels: type:feature, area:db, prio:P0

## Summary
Wire TypeORM to MariaDB with a DataSource, migration scripts, and dev/test DB configuration.

## Dependencies
- A1
- A2

## Acceptance criteria
- [ ] App connects to MariaDB using env vars.
- [ ] Migrations can be generated and run via npm scripts (db:migrate, db:generate).
- [ ] TypeORM synchronize is disabled by default (non-dev).

## Tasks
- [ ] Add TypeORM DataSource configuration (src/modules/database or src/db).
- [ ] Add npm scripts for migrations and a baseline migration.
- [ ] Add docker-compose.yml for MariaDB (dev/test).
- [ ] Add a small DB connectivity check for /health.

## Notes
- Follow migration patterns and no-synchronize guidance from docs/ARCHITECTURE.md.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
