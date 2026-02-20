# A6: CI pipeline (lint, typecheck, tests, migrations smoke)

Milestone: M0 Bootstrap
Labels: type:chore, area:infra, prio:P0

## Summary
Add GitHub Actions workflow that runs lint, typecheck, unit/controller tests, and a migrations smoke test against MariaDB.

## Dependencies
- A1
- A3

## Acceptance criteria
- [ ] CI runs on PRs and main.
- [ ] CI starts MariaDB service and runs migrations.
- [ ] CI fails on lint/type/test errors.

## Tasks
- [ ] Add ESLint + Prettier config and scripts.
- [ ] Add Jest config and initial test folder structure.
- [ ] Add .github/workflows/ci.yml with node cache + MariaDB service.
- [ ] Add scripts: test, test:db (optional), db:migrate.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
