# B4: Provider reference table (manual links)

Milestone: M1 Core domain
Labels: type:feature, area:provider, prio:P1

## Summary
Store external provider references (providerKey + url + optional externalId) per restaurant.

## Dependencies
- B1

## Acceptance criteria
- [ ] Restaurant detail page supports adding/removing provider references.
- [ ] Unique constraint on (providerKey, externalId) when externalId is present.

## Tasks
- [ ] Create RestaurantProviderRef entity + migration (restaurantId, providerKey, externalId nullable, url, lastSyncAt, status).
- [ ] Add service methods to manage refs.
- [ ] Add UI section on restaurant detail page.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
