# G6: Release packaging (Docker) + docker-compose

Milestone: M6 Hardening + release
Labels: type:chore, area:infra, prio:P2

## Summary
Add Dockerfile and docker-compose for local production-like deployment.

## Dependencies
- A3

## Acceptance criteria
- [ ] Dockerfile builds production image.
- [ ] docker-compose runs app + MariaDB and documents env vars.

## Tasks
- [ ] Add Dockerfile with multi-stage build.
- [ ] Add docker-compose.yml for app+db.
- [ ] Document usage in README.

## References
- docs/ARCHITECTURE.md
- docs/GITHUB_SPEC.md
