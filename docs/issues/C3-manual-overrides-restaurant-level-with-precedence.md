# C3: Manual overrides (restaurant-level) with precedence

Milestone: M2 Diet system
Labels: type:feature, area:diet, prio:P0

## Summary
Allow users to manually mark restaurant supports/does-not-support a diet tag, overriding heuristic results.

## Dependencies
- C2
- A4
- B1

## Acceptance criteria
- [ ] User can add/remove restaurant-level overrides on restaurant detail page.
- [ ] Overrides take precedence over heuristic results when computing effective suitability.
- [ ] Override records include userId, timestamp, and optional notes.

## Tasks
- [ ] Create DietManualOverride entity + migration.
- [ ] Implement DietOverrideService (add/remove/list, compute effective).
- [ ] Integrate override UI into restaurant detail.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
