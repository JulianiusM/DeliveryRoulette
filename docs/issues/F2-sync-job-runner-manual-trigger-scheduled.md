# F2: Sync job runner (manual trigger + scheduled)

Milestone: M5 Provider framework
Labels: type:feature, area:provider, prio:P1

## Summary
Implement sync pipeline and job runner to ingest menus from connectors and recompute inference.

## Dependencies
- F1
- C2

## Acceptance criteria
- [ ] Admin-only endpoint triggers a sync run (per connector or all).
- [ ] Scheduled sync can be enabled via env interval.
- [ ] Sync updates menus using upsert semantics and triggers diet inference recompute.

## Tasks
- [ ] Implement ProviderSyncService pipeline: normalize -> upsert -> infer.
- [ ] Add locking to avoid concurrent runs (DB lock or job table).
- [ ] Add minimal SyncJob tracking entity if needed.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
