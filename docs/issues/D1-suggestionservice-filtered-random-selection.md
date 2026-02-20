# D1: SuggestionService: filtered random selection

Milestone: M3 Suggestion engine
Labels: type:feature, area:suggest, prio:P0

## Summary
Implement SuggestionService that selects a random restaurant that matches user filters (diet + cuisine + active).

## Dependencies
- C5
- B1
- C3

## Acceptance criteria
- [ ] POST /suggest selects a restaurant that matches filters and redirects to result.
- [ ] Result includes reason summary (matched diets and whether override/heuristic).
- [ ] Selection never includes inactive restaurants.

## Tasks
- [ ] Implement SuggestionService query builder and randomness strategy.
- [ ] Add SuggestionController and routes (POST-redirect-GET).
- [ ] Define and persist reason JSON schema for explainability.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
