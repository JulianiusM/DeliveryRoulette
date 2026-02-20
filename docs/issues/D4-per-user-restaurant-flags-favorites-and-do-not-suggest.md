# D4: Per-user restaurant flags: favorites and do-not-suggest

Milestone: M3 Suggestion engine
Labels: type:feature, area:suggest, prio:P2

## Summary
Allow users to mark restaurants as favorites and/or excluded from suggestions.

## Dependencies
- B1
- D1

## Acceptance criteria
- [ ] User can toggle favorite and do-not-suggest on restaurant detail page.
- [ ] Suggestion engine respects do-not-suggest; optional include-favorites-only mode can be added later.

## Tasks
- [ ] Create UserRestaurantPreference entity + migration.
- [ ] Add UI toggles and service methods.
- [ ] Update SuggestionService to respect flags.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
