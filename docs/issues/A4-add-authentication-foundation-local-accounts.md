# A4: Add authentication foundation (local accounts)

Milestone: M0 Bootstrap
Labels: type:feature, area:auth, prio:P0

## Summary
Implement local account registration and login with sessions. This is sufficient for MVP; OIDC can be added later.

## Dependencies
- A3

## Acceptance criteria
- [ ] Users can register, login, and logout.
- [ ] Protected routes require authentication (redirect to login).
- [ ] Passwords are hashed (bcrypt) and never stored in plaintext.
- [ ] Session cookie uses secure defaults (httpOnly; secure in prod).

## Tasks
- [ ] Create User entity and migration.
- [ ] Add AuthService for user creation and credential verification.
- [ ] Add AuthController and routes (GET/POST login, GET/POST register, POST logout).
- [ ] Add Pug views for auth pages.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
