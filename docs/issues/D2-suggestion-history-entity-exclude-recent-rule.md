# D2: Suggestion history entity + exclude recent rule

Milestone: M3 Suggestion engine
Labels: type:feature, area:suggest, prio:P0

## Summary
Persist suggestion history and exclude recently suggested restaurants by default.

## Dependencies
- D1

## Acceptance criteria
- [ ] SuggestionHistory rows are created on each suggestion.
- [ ] Exclude last N suggestions (default N=3) when selecting new suggestion.

## Tasks
- [ ] Create SuggestionHistory entity + migration.
- [ ] Update SuggestionService to query recent suggestions and exclude them.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
