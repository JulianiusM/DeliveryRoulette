# G2: DB tests for migrations and constraints

Milestone: M6 Hardening + release
Labels: type:test, area:db, prio:P0

## Summary
Add database tests running against real MariaDB to verify migrations and constraints.

## Dependencies
- A3
- B4
- C2

## Acceptance criteria
- [ ] Migrations up/down can run in CI against MariaDB.
- [ ] Unique constraints (provider refs, inference keys) are verified.

## Tasks
- [ ] Add DB test harness using dockerized MariaDB in CI.
- [ ] Write constraint tests for key tables.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
