# A1: Initialize TypeScript Node/Express app skeleton

Milestone: M0 Bootstrap
Labels: type:feature, area:infra, prio:P0

## Summary
Create the base monolithic Express app in TypeScript following the layered structure from docs/ARCHITECTURE.md.
Include Pug view engine and a minimal SSR homepage and error pages.

## Dependencies
- None

## Acceptance criteria
- [ ] GET /health returns JSON { ok: true }.
- [ ] GET / renders an SSR page via Pug.
- [ ] Central async error handling middleware exists and is used by routes.
- [ ] Project runs via npm run dev.

## Tasks
- [ ] Add folder structure: src/routes, src/controller, src/services, src/entities, src/middleware, src/views, src/migrations, src/public.
- [ ] Implement Express bootstrap (app.ts/server.ts) and router mounting.
- [ ] Add generic error handler and asyncHandler middleware.
- [ ] Add base Pug layout and a minimal index page.

## Notes
- Reference layering and middleware chain patterns in docs/ARCHITECTURE.md.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
