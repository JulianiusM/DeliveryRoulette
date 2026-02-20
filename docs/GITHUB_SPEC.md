# Delivery Roulette (DE) - GitHub Spec

This repository contains a Node.js + Express + TypeScript monolith with:
- TypeORM (MariaDB) DBAL and migrations
- Pug SSR views
- Layering: routes -> controllers -> services -> entities
- Middleware chain pattern (requireLogin, validation, asyncHandler, genericErrorHandler)
- Testing pyramid: unit + controller tests (mocked services) + database tests (real DB) + e2e (Playwright)

See:
- docs/ARCHITECTURE.md for architectural philosophy and patterns.
- docs/issues/ for issue bodies and scripts to create labels, milestones, and issues.
