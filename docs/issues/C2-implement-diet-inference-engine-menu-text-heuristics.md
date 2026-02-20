# C2: Implement diet inference engine (menu text heuristics)

Milestone: M2 Diet system
Labels: type:feature, area:diet, prio:P0

## Summary
Implement menu scanning heuristics that generate diet suitability per restaurant with explainability and versioning.

## Dependencies
- B2
- C1

## Acceptance criteria
- [ ] Inference produces score 0-100 and confidence (LOW/MEDIUM/HIGH) for each diet tag per restaurant.
- [ ] Reasons include matched items and keywords in JSON.
- [ ] Engine version is stored and used as part of uniqueness.

## Tasks
- [ ] Create DietInferenceResult entity + migration (restaurantId, dietTagId, score, confidence, reasonsJson, engineVersion, computedAt).
- [ ] Implement DietInferenceService with normalization and rule sets.
- [ ] Add a recompute entrypoint callable from service layer (used after menu changes).

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
