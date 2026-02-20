# F3: Implement ImportConnector as provider connector

Milestone: M5 Provider framework
Labels: type:feature, area:provider, prio:P1

## Summary
Wrap the import ingestion as a provider connector (providerKey=IMPORT) so the sync pipeline is unified.

## Dependencies
- E2
- F1

## Acceptance criteria
- [ ] IMPORT connector implements the provider interface and can be invoked by the sync runner.
- [ ] Restaurants created by import have RestaurantProviderRef(providerKey=IMPORT).

## Tasks
- [ ] Create ImportConnector implementation using ImportService outputs.
- [ ] Ensure provider refs are created/updated appropriately.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
