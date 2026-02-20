# F1: Provider connector interface + registry

Milestone: M5 Provider framework
Labels: type:feature, area:provider, prio:P0

## Summary
Introduce DeliveryProviderConnector interface and a connector registry. No scraping; connectors use permitted APIs or imports.

## Dependencies
- B4

## Acceptance criteria
- [ ] Provider connector interface exists (list restaurants, fetch menu, rate limit policy).
- [ ] Registry resolves connector by providerKey and fails safely for unknown keys.

## Tasks
- [ ] Create src/providers with interface definitions and registry.
- [ ] Add ProviderKey enum and types for normalized provider restaurant/menu payloads.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
