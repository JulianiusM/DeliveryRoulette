# C4: Show diet suitability with explanations in UI

Milestone: M2 Diet system
Labels: type:feature, area:ui, prio:P1

## Summary
Display effective diet suitability on restaurant pages and provide an explanation panel.

## Dependencies
- C3

## Acceptance criteria
- [ ] Restaurant detail shows each diet tag: effective status + score + confidence.
- [ ] Explanation shows either manual override reason or heuristic matched items/keywords.

## Tasks
- [ ] Add view partials for diet display.
- [ ] Controller loads inference + overrides and computes effective view model.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
