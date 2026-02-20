# G1: Unit tests for diet heuristics and precedence logic

Milestone: M6 Hardening + release
Labels: type:test, area:diet, prio:P0

## Summary
Add comprehensive unit tests for the diet inference engine and override precedence rules.

## Dependencies
- C2
- C3

## Acceptance criteria
- [ ] Test cases cover German/English keywords, negative hits, confidence, and manual overrides.
- [ ] Engine versioning behavior is tested.

## Tasks
- [ ] Add fixtures for sample menus (vegan, mixed, ambiguous).
- [ ] Write unit tests for normalization and rule application.
- [ ] Write unit tests for effective suitability computation.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
