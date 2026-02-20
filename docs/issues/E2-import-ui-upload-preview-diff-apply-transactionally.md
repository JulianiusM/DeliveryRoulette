# E2: Import UI: upload + preview diff + apply transactionally

Milestone: M4 Import connector
Labels: type:feature, area:import, prio:P0

## Summary
Implement SSR flow to upload an import file, show preview diff, then apply changes transactionally.

## Dependencies
- E1
- C2

## Acceptance criteria
- [ ] Upload page accepts JSON file and runs validation.
- [ ] Preview shows new/updated restaurants and menu changes.
- [ ] Apply step writes data transactionally per restaurant and triggers inference recompute.

## Tasks
- [ ] Implement ImportService: parse -> diff -> apply.
- [ ] Add controller/routes and Pug templates (upload/preview/result).
- [ ] Ensure transactional apply and error handling.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
