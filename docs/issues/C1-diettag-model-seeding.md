# C1: DietTag model + seeding

Milestone: M2 Diet system
Labels: type:feature, area:diet, prio:P0

## Summary
Add DietTag entity and seed initial diet tags (VEGAN, VEGETARIAN, GLUTEN_FREE, LACTOSE_FREE, HALAL).

## Dependencies
- A3

## Acceptance criteria
- [ ] DietTag table exists and seed is idempotent.
- [ ] Seed can be run locally and in CI without duplicating rows.

## Tasks
- [ ] Create DietTag entity + migration.
- [ ] Add seed script and document usage.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
