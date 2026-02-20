# C5: Diet preferences in settings and filtering integration

Milestone: M2 Diet system
Labels: type:feature, area:diet, prio:P0

## Summary
Allow users to select diet preferences/restrictions and store them; later used by suggestion engine and filters.

## Dependencies
- C1
- B3

## Acceptance criteria
- [ ] Users can select multiple diet tags in /settings.
- [ ] Preferences persist and are used as default filter input for suggestions.

## Tasks
- [ ] Add join table UserDietPreference (or equivalent) + migration.
- [ ] Update settings controller and templates.
- [ ] Add service helpers to resolve effective diet filters.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
