# DeliveryRoulette — Action Items

**Generated:** February 2026
**Source:** [REVIEW_REPORT.md](REVIEW_REPORT.md)

Items are prioritized P0 (critical/blocking) → P1 (high/should-fix-soon) → P2 (medium/backlog).

---

## Summary

| Priority | Count | Categories |
|----------|-------|------------|
| P0 | 3 | Security, Documentation |
| P1 | 4 | Data Layer, Provider Integration |
| P2 | 13 | Tests, UX, Cleanup, Security, Instructions |

---

## P0 — Critical

### Issue 1: Add CSRF protection to all POST routes

**Labels:** `type:bug`, `area:security`, `prio:P0`

**Description:**
No CSRF middleware is installed or configured. All POST forms (login, register, restaurant creation, import, provider sync) are vulnerable to cross-site request forgery attacks.

**Acceptance Criteria:**
- [ ] Install and configure CSRF middleware (e.g., `csrf-csrf` or `csurf` alternative)
- [ ] Generate CSRF tokens in all form-rendering routes
- [ ] Pass CSRF tokens to all Pug templates with forms
- [ ] Validate CSRF tokens on all POST/PUT/DELETE routes
- [ ] Add CSRF error handling in `genericErrorHandler.ts`
- [ ] Add tests for CSRF token validation

**File Pointers:**
- `src/app.ts` — middleware setup
- `src/routes/*.ts` — all POST routes
- `src/views/**/*.pug` — all forms
- `docs/issues/A5-add-csrf-basic-security-middleware.md` — existing issue spec

---

### Issue 2: Add input validation chains to all routes

**Labels:** `type:bug`, `area:security`, `prio:P0`

**Description:**
`express-validator` is installed but no validation chains are defined on any route. Raw `req.body` is passed directly to controllers without sanitization or validation.

**Acceptance Criteria:**
- [ ] Add validation chains for user registration (`POST /users/register`)
- [ ] Add validation chains for user login (`POST /users/login`)
- [ ] Add validation chains for restaurant CRUD (`POST /restaurants`)
- [ ] Add validation chains for menu operations (`POST /restaurants/:id/menu`)
- [ ] Add validation chains for import apply (`POST /import/apply`)
- [ ] Add validation chains for provider URL operations (`POST /providers/:key/import`)
- [ ] Add validation chains for settings updates
- [ ] Ensure `validationErrorHandler` middleware is applied after each chain
- [ ] Add unit tests for validation chain rejection

**File Pointers:**
- `src/routes/users.ts`, `restaurants.ts`, `import.ts`, `providers.ts`
- `src/middleware/validationErrorHandler.ts` — existing handler

---

### Issue 3: Remove dead navigation links and fix index page content

**Labels:** `type:bug`, `area:frontend`, `prio:P0`

**Description:**
The navigation bar and index page contain links and descriptions from a different application template:
- Nav links to `/items`, `/games`, `/loans`, `/locations` that return 404
- Index page describes barcode scanning, item cataloging, and lending features that don't exist

**Acceptance Criteria:**
- [ ] Remove or replace nav links in `layout.pug` for non-existent routes
- [ ] Update `index.pug` to describe actual DeliveryRoulette features (restaurants, suggestions, diet preferences, provider sync)
- [ ] Update `users/dashboard.pug` to show actual metrics (restaurant count, sync status, suggestion history)
- [ ] Verify no other views reference non-existent features

**File Pointers:**
- `src/views/layout.pug` — navigation bar
- `src/views/index.pug` — landing page
- `src/views/users/dashboard.pug` — dashboard

---

## P1 — High

### Issue 4: Add transaction handling to multi-step database operations

**Labels:** `type:bug`, `area:backend`, `prio:P1`

**Description:**
No services use database transactions. Multi-step operations like `upsertFromProvider()` and `computeForRestaurant()` can leave inconsistent state on partial failure.

**Acceptance Criteria:**
- [ ] Wrap `RestaurantService.upsertFromProvider()` in a transaction
- [ ] Wrap `DietInferenceService.computeForRestaurant()` in a transaction
- [ ] Wrap `UserService.findOrCreateUserFromOidc()` in a transaction
- [ ] Add tests verifying rollback on partial failure

**File Pointers:**
- `src/modules/database/services/RestaurantService.ts`
- `src/modules/database/services/DietInferenceService.ts`
- `src/modules/database/services/UserService.ts`

---

### Issue 5: Add foreign key indexes on frequently-queried columns

**Labels:** `type:chore`, `area:database`, `prio:P1`

**Description:**
Foreign key columns that are frequently used in queries lack explicit indexes, potentially causing full table scans.

**Acceptance Criteria:**
- [ ] Create migration adding index on `menu_categories.restaurant_id`
- [ ] Create migration adding index on `menu_items.category_id`
- [ ] Create migration adding index on `diet_inference_results.restaurant_id`
- [ ] Create migration adding index on `user_diet_preferences.user_id`
- [ ] Create migration adding index on `user_restaurant_preferences.user_id`
- [ ] Create migration adding index on `suggestion_history.user_id`
- [ ] Verify indexes are created and used in query plans

**File Pointers:**
- `src/migrations/` — add new migration file
- Existing migrations for reference: `1740200000000-CreateMenuCategoryAndItem.ts`

---

### Issue 6: Enforce rate limiting for provider HTTP requests

**Labels:** `type:feature`, `area:backend`, `prio:P1`

**Description:**
Connectors declare `rateLimitPolicy()` but it is never checked or enforced. The global HTTP concurrency limiter exists but doesn't respect per-provider rate limits.

**Acceptance Criteria:**
- [ ] Implement token-bucket or sliding-window rate limiter in `httpClient.ts`
- [ ] Consume `rateLimitPolicy()` from connectors when making requests
- [ ] Add tests for rate limit enforcement
- [ ] Log when rate limits are hit

**File Pointers:**
- `src/modules/lib/httpClient.ts`
- `src/providers/lieferando/LieferandoConnector.ts:72-73`

---

### Issue 7: Integrate cache service with provider connectors

**Labels:** `type:feature`, `area:backend`, `prio:P1`

**Description:**
`ProviderFetchCacheService` exists with full cache-hit/miss/TTL logic but the Lieferando connector uses native `fetch()` directly, bypassing caching entirely.

**Acceptance Criteria:**
- [ ] Modify connector HTTP calls to go through `ProviderFetchCacheService.getOrFetch()`
- [ ] Respect cache TTL settings (`listingTtlSeconds`, `menuTtlSeconds`) from settings
- [ ] Add tests for cache hit, miss, and expiry scenarios
- [ ] Verify sync performance improvement with caching

**File Pointers:**
- `src/providers/lieferando/LieferandoConnector.ts`
- `src/modules/providers/ProviderFetchCacheService.ts`
- `src/modules/settings.ts` — cache TTL settings

---

## P2 — Medium / Backlog

### Issue 8: Add ProviderFetchCacheService tests

**Labels:** `type:test`, `area:backend`, `prio:P2`

**Description:**
The `ProviderFetchCacheService` has zero test coverage. All caching logic (hit/miss, TTL expiration, URL hashing, database persistence) is untested.

**Acceptance Criteria:**
- [ ] Add tests for cache hit scenario
- [ ] Add tests for cache miss scenario
- [ ] Add tests for TTL expiration
- [ ] Add tests for URL hashing consistency
- [ ] Add tests for failed fetch handling

**File Pointers:**
- `src/modules/providers/ProviderFetchCacheService.ts`
- `tests/unit/` — add new test file

---

### Issue 9: Add LieferandoConnector integration tests

**Labels:** `type:test`, `area:backend`, `prio:P2`

**Description:**
Only the Lieferando HTML parser is tested. The connector's `fetchMenu()`, `listRestaurants()`, and `validateImportUrl()` methods have no integration tests with mocked HTTP.

**Acceptance Criteria:**
- [ ] Add tests for `fetchMenu()` with mocked HTTP responses
- [ ] Add tests for `listRestaurants()` with mocked HTTP responses
- [ ] Add tests for `validateImportUrl()` with valid/invalid URLs
- [ ] Add tests for timeout and network error handling

**File Pointers:**
- `src/providers/lieferando/LieferandoConnector.ts`
- `tests/unit/` — add new test file
- `tests/fixtures/lieferando/` — existing fixtures

---

### Issue 10: Add middleware tests

**Labels:** `type:test`, `area:backend`, `prio:P2`

**Description:**
`authMiddleware`, `validationErrorHandler`, `pushConnectorAuthMiddleware`, and `paramHandler` have no unit tests.

**Acceptance Criteria:**
- [ ] Add tests for `authMiddleware` (authenticated, unauthenticated, expired session)
- [ ] Add tests for `validationErrorHandler` (valid, invalid inputs)
- [ ] Add tests for `pushConnectorAuthMiddleware` (valid token, invalid token, missing token)
- [ ] Add tests for `paramHandler` (valid params, invalid params)

**File Pointers:**
- `src/middleware/*.ts`
- `tests/middleware/` — add new test files (directory exists in project structure)

---

### Issue 11: Add protocol validation to provider URL validation

**Labels:** `type:bug`, `area:security`, `prio:P2`

**Description:**
Provider URL validation checks the domain but not the protocol. Could accept `http:`, `ftp:`, or `file:` URLs if validation is bypassed.

**Acceptance Criteria:**
- [ ] Add `url.protocol === 'https:'` check in `validateImportUrl()` and `validateListingUrl()`
- [ ] Add tests for rejected non-HTTPS protocols
- [ ] Document the validation in connector interface

**File Pointers:**
- `src/providers/lieferando/LieferandoConnector.ts:89-107`

---

### Issue 12: Set httpOnly explicitly and add Content-Security-Policy

**Labels:** `type:chore`, `area:security`, `prio:P2`

**Description:**
Session cookie relies on default `httpOnly` behavior instead of explicitly setting it. No Content-Security-Policy headers are configured.

**Acceptance Criteria:**
- [ ] Add `httpOnly: true` to session cookie config in `app.ts`
- [ ] Add basic CSP headers via middleware (e.g., `helmet`)
- [ ] Document security headers in `OPERATIONS.md`

**File Pointers:**
- `src/app.ts:50-67`
- `docs/OPERATIONS.md`

---

### Issue 13: Fix sync job locking race condition

**Labels:** `type:bug`, `area:backend`, `prio:P2`

**Description:**
Sync job locking uses optimistic check-then-insert pattern. Two concurrent sync requests could both pass the lock check and start duplicate jobs.

**Acceptance Criteria:**
- [ ] Replace optimistic lock with database-level constraint (unique partial index on `status='in_progress'`)
- [ ] Or use `INSERT ... ON CONFLICT` pattern
- [ ] Add test for concurrent sync prevention

**File Pointers:**
- `src/modules/sync/ProviderSyncService.ts:35-38`

---

### Issue 14: Delete outdated documentation files

**Labels:** `type:docs`, `area:docs`, `prio:P2`

**Description:**
Several documentation files describe features from a different application template and have no relevance to DeliveryRoulette.

**Acceptance Criteria:**
- [ ] Delete `docs/GAMES_MODULE_REVIEW.md`
- [ ] Delete `docs/GAME_SUGGESTION.md`
- [ ] Delete `docs/ACTIVITY_REQUIREMENTS_ALGORITHM.md`
- [ ] Delete `docs/user-guide/GAMES.md`
- [ ] Update `docs/README.md` index to remove references to deleted files
- [ ] Review `docs/issues/` directory for irrelevant issues from wrong template

**File Pointers:**
- Files listed above

---

### Issue 15: Rewrite ARCHITECTURE.md to match actual application

**Labels:** `type:docs`, `area:docs`, `prio:P2`

**Description:**
`docs/ARCHITECTURE.md` contains large sections describing surveys, packing lists, activities, drivers, and games — none of which exist. It needs to accurately describe the restaurant/menu/diet/provider/suggestion architecture.

**Acceptance Criteria:**
- [ ] Remove/replace sections referencing surveys, packing, activities, drivers, games
- [ ] Add sections for: Restaurant management, Menu system, Diet inference, Provider integration, Suggestion engine, Sync pipeline
- [ ] Verify all file paths and entity names match the actual codebase
- [ ] Update entity relationship diagram

**File Pointers:**
- `docs/ARCHITECTURE.md` — lines 14, 21, 52, 109-111, 213-265, 317-321, 404, 438-448, 483-end

---

### Issue 16: Add database service unit tests

**Labels:** `type:test`, `area:backend`, `prio:P2`

**Description:**
13 database services have no direct unit tests. They are only tested indirectly through controller tests.

**Acceptance Criteria:**
- [ ] Add tests for `RestaurantService` (CRUD, search, provider upsert)
- [ ] Add tests for `MenuService` (category/item CRUD)
- [ ] Add tests for `SuggestionService` (filtering, randomization)
- [ ] Add tests for `DietOverrideService` (override application)
- [ ] Add tests for `SyncAlertService` (alert CRUD)

**File Pointers:**
- `src/modules/database/services/*.ts`
- `tests/unit/` or `tests/database/` — add new test files

---

### Issue 17: Fix Copilot/AI instruction references

**Labels:** `type:docs`, `area:docs`, `prio:P2`

**Description:**
The testing quick reference file references `tests/data/builders/` which does not exist. The reference should be corrected.

**Acceptance Criteria:**
- [ ] Fix or remove reference to `tests/data/builders/` in `.github/copilot/testing-quick-reference.md`
- [ ] Verify all file paths in AI instruction files are accurate

**File Pointers:**
- `.github/copilot/testing-quick-reference.md`

---

### Issue 18: Remove settings for non-existent features

**Labels:** `type:chore`, `area:backend`, `prio:P2`

**Description:**
`src/modules/settings.ts` still contains `paginationDefaultGames` which references a non-existent Games module.

**Acceptance Criteria:**
- [ ] Remove `paginationDefaultGames` from settings type, defaults, key mapping, and coercion
- [ ] Verify no code references this setting

**File Pointers:**
- `src/modules/settings.ts`

---

### Issue 19: Fix dashboard to show actual DeliveryRoulette metrics

**Labels:** `type:bug`, `area:frontend`, `prio:P2`

**Description:**
`dashboard.pug` shows item/loan stats and quick action buttons for non-existent features (Items, Locations, Barcode Scan, Lending). It should show restaurant count, suggestion stats, and relevant quick actions.

**Acceptance Criteria:**
- [ ] Replace item/loan stats with restaurant and suggestion metrics
- [ ] Update quick action buttons to point to Restaurants, Suggestions, Import, Providers
- [ ] Update route handler to pass correct data

**File Pointers:**
- `src/views/users/dashboard.pug`
- `src/routes/users.ts`

---

### Issue 20: Add OIDC/email module tests

**Labels:** `type:test`, `area:backend`, `prio:P2`

**Description:**
OIDC authentication flow and email sending have no tests. At minimum, unit tests for the non-external-dependent logic should exist.

**Acceptance Criteria:**
- [ ] Add basic tests for email template generation
- [ ] Add tests for OIDC session handling helpers

**File Pointers:**
- `src/modules/oidc.ts`
- `src/modules/email.ts`

---

## Dependency Map

```
Issue 1 (CSRF)          — independent
Issue 2 (Validation)    — independent
Issue 3 (Dead links)    — independent
Issue 4 (Transactions)  — independent
Issue 5 (FK indexes)    — independent
Issue 6 (Rate limiting) — independent, but complements Issue 7
Issue 7 (Cache integration) — depends on Issue 8 (cache tests)
Issue 8 (Cache tests)   — independent
Issue 9 (Connector tests) — independent
Issue 10 (Middleware tests) — independent
Issue 11 (Protocol validation) — independent
Issue 12 (Cookie/CSP)   — independent
Issue 13 (Sync locking) — independent
Issue 14 (Delete docs)  — independent
Issue 15 (Rewrite ARCHITECTURE.md) — after Issue 14
Issue 16 (Service tests) — independent
Issue 17 (AI instruction refs) — independent
Issue 18 (Dead settings) — independent
Issue 19 (Dashboard fix) — extends Issue 3
Issue 20 (OIDC/email tests) — independent
```
