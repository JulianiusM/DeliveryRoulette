# B3: User preferences (delivery area + cuisine include/exclude)

Milestone: M1 Core domain
Labels: type:feature, area:ui, prio:P1

## Summary
Add per-user preferences stored in DB and editable via /settings.

## Dependencies
- A4
- A3

## Acceptance criteria
- [ ] GET/POST /settings allows storing default delivery area and cuisine include/exclude filters.
- [ ] Preferences persist per user and are loaded on dashboard.

## Tasks
- [ ] Create UserPreference entity + migration.
- [ ] Implement SettingsController and service.
- [ ] Create Pug settings form.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
