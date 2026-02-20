# A5: Add CSRF + basic security middleware

Milestone: M0 Bootstrap
Labels: type:feature, area:infra, prio:P0

## Summary
Add CSRF protection for form POSTs and basic security headers. Ensure it works with Pug SSR forms.

## Dependencies
- A4

## Acceptance criteria
- [ ] All POST routes used by SSR forms validate CSRF tokens.
- [ ] Templates include CSRF hidden field where required.
- [ ] Security headers are enabled (at least sane defaults).

## Tasks
- [ ] Add CSRF middleware and session integration.
- [ ] Expose csrfToken to templates.
- [ ] Add helmet (or minimal headers) and configure.
- [ ] Add rate limiting to auth endpoints (optional in MVP).

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
