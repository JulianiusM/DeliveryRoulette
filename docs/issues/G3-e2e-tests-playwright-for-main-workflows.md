# G3: E2E tests (Playwright) for main workflows

Milestone: M6 Hardening + release
Labels: type:test, area:ui, prio:P1

## Summary
Add Playwright end-to-end tests for critical user workflows.

## Dependencies
- D3
- E2

## Acceptance criteria
- [ ] E2E covers: register/login -> create restaurant -> add menu -> inference -> override -> suggest.
- [ ] E2E covers: import -> preview -> apply -> suggest.
- [ ] Tests run in CI and are stable.

## Tasks
- [ ] Add Playwright config and CI integration.
- [ ] Implement page objects or helper functions per testing guide patterns.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
