# A2: Add configuration system and environment handling

Milestone: M0 Bootstrap
Labels: type:feature, area:infra, prio:P0

## Summary
Introduce a config module that reads env vars, validates them at boot, and exposes a typed configuration object.

## Dependencies
- A1

## Acceptance criteria
- [ ] .env.example documents all required environment variables.
- [ ] App fails fast with clear errors when required variables are missing/invalid.
- [ ] Config supports separate profiles for dev/test/prod (via NODE_ENV).

## Tasks
- [ ] Create src/config module (e.g. config.ts) with schema validation.
- [ ] Add .env.example and README snippet for setup.
- [ ] Ensure tests can inject config without requiring real secrets.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
