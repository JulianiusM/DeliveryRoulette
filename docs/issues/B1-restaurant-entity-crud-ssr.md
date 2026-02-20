# B1: Restaurant entity + CRUD (SSR)

Milestone: M1 Core domain
Labels: type:feature, area:restaurants, prio:P0

## Summary
Create Restaurant entity and SSR CRUD pages (list, create, edit, detail) with validation and service layer.

## Dependencies
- A3
- A4

## Acceptance criteria
- [ ] /restaurants lists restaurants with search and active filter.
- [ ] /restaurants/new creates a restaurant with validation errors shown in UI.
- [ ] /restaurants/:id shows detail page.
- [ ] Controllers do not access DB directly; all operations go through RestaurantService.

## Tasks
- [ ] Create Restaurant entity + migration (uuid PK, name, address fields, isActive, timestamps).
- [ ] Implement RestaurantService (create/update/find/list).
- [ ] Add RestaurantController and routes file.
- [ ] Create Pug templates for list/detail/form.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
