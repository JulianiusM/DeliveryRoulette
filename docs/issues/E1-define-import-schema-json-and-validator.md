# E1: Define import schema (JSON) and validator

Milestone: M4 Import connector
Labels: type:feature, area:import, prio:P0

## Summary
Define versioned JSON import schema for restaurants and menus and implement strict server-side validation.

## Dependencies
- B1
- B2

## Acceptance criteria
- [ ] docs/import-schema.md documents the JSON structure and versioning.
- [ ] Invalid files are rejected with actionable error messages.

## Tasks
- [ ] Define schema types and validation (zod or similar).
- [ ] Add docs and examples.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
