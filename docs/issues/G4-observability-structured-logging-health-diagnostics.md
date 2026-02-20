# G4: Observability: structured logging + health diagnostics

Milestone: M6 Hardening + release
Labels: type:feature, area:infra, prio:P1

## Summary
Add structured logging and richer /health diagnostics while avoiding sensitive data leakage.

## Dependencies
- A1
- A3

## Acceptance criteria
- [ ] Request id is included in logs.
- [ ] /health includes DB connectivity and app version (no secrets).

## Tasks
- [ ] Add logger module (winston/pino) with redaction.
- [ ] Add request id middleware.
- [ ] Extend /health to check DB connection.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
