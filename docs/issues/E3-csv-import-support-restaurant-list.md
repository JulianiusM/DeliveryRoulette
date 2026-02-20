# E3: CSV import support (restaurant list)

Milestone: M4 Import connector
Labels: type:feature, area:import, prio:P2

## Summary
Add basic CSV import support for restaurant list ingestion (no menus required).

## Dependencies
- E2

## Acceptance criteria
- [ ] CSV parser maps columns to restaurant fields; mapping rules are documented.
- [ ] Preview diff works for CSV imports as well.

## Tasks
- [ ] Add CSV parsing and mapping.
- [ ] Extend preview template to show restaurant-only changes.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
