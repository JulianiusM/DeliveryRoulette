# F4: Credentials storage module (encrypted at rest)

Milestone: M5 Provider framework
Labels: type:feature, area:provider, prio:P1

## Summary
Add module for storing provider credentials encrypted at rest. Required for official partner API connectors.

## Dependencies
- F1
- A2

## Acceptance criteria
- [ ] Credentials can be stored (global or per user) and are encrypted with a server-side key from env.
- [ ] Secrets are never logged; redaction is enforced in error logs.

## Tasks
- [ ] Create ProviderCredential entity + migration.
- [ ] Add crypto helper module with tests.
- [ ] Add basic UI or admin endpoint to set credentials (optional for MVP).

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
