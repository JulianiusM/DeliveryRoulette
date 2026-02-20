# B2: Menu entities (category + items) + CRUD

Milestone: M1 Core domain
Labels: type:feature, area:menu, prio:P0

## Summary
Add MenuCategory and MenuItem entities and SSR UI to manage menus per restaurant.

## Dependencies
- B1

## Acceptance criteria
- [ ] Restaurant detail page allows adding/editing categories and items.
- [ ] Items include name, description, optional price/currency.
- [ ] MenuService supports upsert and deactivation of removed items (for future sync).

## Tasks
- [ ] Create MenuCategory and MenuItem entities + migration.
- [ ] Implement MenuService methods for create/update/list and future upsert semantics.
- [ ] Integrate into restaurant detail controller and templates.
- [ ] Add validation to menu forms.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
