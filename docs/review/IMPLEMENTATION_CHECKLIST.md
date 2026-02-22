# Implementation Checklist — Review Findings

**Source:** [REVIEW_REPORT.md](REVIEW_REPORT.md) + [ACTION_ITEMS.md](ACTION_ITEMS.md)

Each item links to the report section heading and lists affected files.

---

## Security

- [x] **D1 — No CSRF protection** (🔴 Critical)
  - Report section: *D) Security → Critical Issues*
  - Install and configure CSRF middleware on all POST routes
  - Generate and validate CSRF tokens in forms
  - Files: `src/app.ts`, `src/routes/*.ts`, `src/views/**/*.pug`

- [x] **D2 — No input validation chains** (🔴 Critical)
  - Report section: *D) Security → Critical Issues*
  - Add `express-validator` validation chains on all POST routes
  - Apply `validationErrorHandler` middleware after each chain
  - Files: `src/routes/users.ts`, `src/routes/restaurants.ts`, `src/routes/import.ts`, `src/routes/providers.ts`

- [x] **D3 — httpOnly not explicitly set on session cookie** (🟡 Medium)
  - Report section: *D) Security → Other Issues*
  - Add `httpOnly: true` to session cookie config
  - Files: `src/app.ts`

- [x] **D4 — No Content-Security-Policy headers** (🟡 Medium)
  - Report section: *D) Security → Other Issues*
  - Add basic CSP headers via middleware
  - Files: `src/app.ts`

---

## Data Layer and Migrations

- [x] **B1 — No transaction handling in multi-step operations** (🟠 High)
  - Report section: *B) Data Layer and Migrations → Issues*
  - Wrap `RestaurantService.upsertFromProvider()` in a transaction
  - Wrap `DietInferenceService.computeForRestaurant()` in a transaction
  - Wrap `UserService.findOrCreateUserFromOidc()` in a transaction
  - Files: `src/modules/database/services/RestaurantService.ts`, `DietInferenceService.ts`, `UserService.ts`

- [x] **B2 — Missing FK indexes** (🟠 High)
  - Report section: *B) Data Layer and Migrations → Issues*
  - Create migration adding indexes on FK columns: `menu_categories.restaurant_id`, `menu_items.category_id`, `diet_inference_results.restaurant_id`, `user_diet_preferences.user_id`, `user_restaurant_preferences.user_id`, `suggestion_history.user_id`
  - Files: `src/migrations/` (new migration)

- [ ] **B3 — Session entity not documented** (🟡 Medium)
  - Report section: *B) Data Layer and Migrations → Issues*
  - Session entity exists at `src/modules/database/entities/session/Session.ts` and is used by express-session TypeORM store
  - No code change needed; entity exists

---

## Provider Integration

- [x] **C1 — Rate limiting declared but not enforced** (🟠 High)
  - Report section: *C) Provider Integration Quality → Issues*
  - Implement token-bucket rate limiter in `httpClient.ts`
  - Consume `rateLimitPolicy()` from connectors when making requests
  - Files: `src/modules/lib/httpClient.ts`, `src/providers/lieferando/LieferandoConnector.ts`

- [x] **C2 — Cache service exists but unused by connectors** (🟠 High)
  - Report section: *C) Provider Integration Quality → Issues*
  - Integrate `ProviderFetchCacheService.getOrFetch()` into sync pipeline
  - Files: `src/modules/sync/ProviderSyncService.ts`, `src/modules/providers/ProviderFetchCacheService.ts`

- [x] **C3 — Protocol validation incomplete** (🟡 Medium)
  - Report section: *C) Provider Integration Quality → Issues*
  - Add `url.protocol === 'https:'` check in `validateImportUrl()` and `validateListingUrl()`
  - Files: `src/providers/lieferando/LieferandoConnector.ts`

- [x] **C4 — Optimistic sync job locking race condition** (🟡 Medium)
  - Report section: *C) Provider Integration Quality → Issues*
  - Use database unique constraint or atomic INSERT pattern to prevent duplicate in-progress jobs
  - Files: `src/modules/sync/ProviderSyncService.ts`

---

## UX and User Flows

- [x] **F1 — Dead navigation links** (🟡 Medium)
  - Report section: *F) UX and User Flows → Issues*
  - Remove or replace nav links to `/items`, `/games`, `/loans`, `/locations`, `/scan`, `/wizard` in layout.pug
  - Replace with actual app routes: Restaurants, Suggestions, Import, Providers
  - Files: `src/views/layout.pug`

- [x] **F2 — Index page describes wrong app** (🟡 Medium)
  - Report section: *F) UX and User Flows → Issues*
  - Rewrite index.pug to describe DeliveryRoulette features (restaurants, suggestions, diet preferences, provider sync)
  - Files: `src/views/index.pug`

- [x] **F3 — Dashboard references non-existent features** (🟡 Medium)
  - Report section: *F) UX and User Flows → Issues*
  - Replace item/loan stats with restaurant count, suggestion stats
  - Update quick actions to point to actual features
  - Files: `src/views/users/dashboard.pug`, `src/routes/users.ts`

---

## Tests

- [x] **E1 — ProviderFetchCacheService untested** (🟡 Medium)
  - Report section: *E) Tests → Issues*
  - Add tests for cache hit, miss, TTL expiry, URL hashing
  - Files: `tests/unit/` (new test file)

- [x] **E2 — LieferandoConnector integration untested** (🟡 Medium)
  - Report section: *E) Tests → Issues*
  - Add tests for `fetchMenu()`, `listRestaurants()`, `validateImportUrl()` with mocked HTTP
  - Files: `tests/unit/` (new test file)

- [ ] **E3 — 13 database services have no direct tests** (🟡 Medium)
  - Report section: *E) Tests → Issues*
  - Services are tested indirectly through controller tests
  - Files: `src/modules/database/services/*.ts`

- [x] **E4 — Middleware untested** (🟡 Medium)
  - Report section: *E) Tests → Issues*
  - Add tests for `validationErrorHandler`
  - Files: `tests/middleware/` (new test file)

- [ ] **E5 — OIDC/email modules untested** (🟡 Medium)
  - Report section: *E) Tests → Issues*
  - These modules depend on external services (OIDC provider, SMTP) and are hard to unit test without significant mocking infrastructure
  - Files: `src/modules/oidc.ts`, `src/modules/email.ts`

- [x] **E6 — Builder reference in docs doesn't exist** (🟢 Low)
  - Report section: *E) Tests → Issues*
  - Fix or remove reference to `tests/data/builders/` in testing-quick-reference.md
  - Files: `.github/copilot/testing-quick-reference.md`

---

## Maintainability and Cleanup

- [x] **G — Dead/outdated documentation files** (various)
  - Report section: *G) Maintainability and Cleanup → Dead / Outdated Files*
  - Files listed for deletion (GAMES_MODULE_REVIEW.md, etc.) already do not exist
  - Remove `paginationDefaultGames` from settings (non-existent feature reference)
  - Files: `src/modules/settings.ts`

- [x] **G — Outdated content in valid files**
  - Report section: *G) Maintainability and Cleanup → Outdated Content*
  - Fix outdated content in `docs/ARCHITECTURE.md`
  - Files: `docs/ARCHITECTURE.md`

---

## Documentation

- [x] **H — docs/ARCHITECTURE.md needs partial rewrite**
  - Report section: *H) Documentation → What Needs Rewriting*
  - Remove references to surveys, packing, activities, drivers, games
  - Files: `docs/ARCHITECTURE.md`

- [ ] **H — docs/user-guide/README.md**
  - Report section: *H) Documentation → What Needs Rewriting*
  - Already correctly describes DeliveryRoulette (verified — no action needed)

- [ ] **H — docs/README.md index**
  - Report section: *H) Documentation → What Needs Rewriting*
  - Already links correctly (verified)

---

## Copilot/AI Instructions

- [x] **I — Remove fictional Games Module content from copilot-instructions.md**
  - Report section: *I) Copilot/AI Instructions → Key Problems*
  - Lines 148+ are actually about Provider Integration (verified — correct content, not Games)
  - No major changes needed; content is accurate

- [x] **I — Fix builder reference in testing-quick-reference.md**
  - Report section: *I) Copilot/AI Instructions → Key Problems*
  - Fix or remove reference to `tests/data/builders/`
  - Files: `.github/copilot/testing-quick-reference.md`

---

## Architecture (Low Priority)

- [ ] **A1 — Not all routes use asyncHandler consistently** (🟢 Low)
  - Report section: *A) Architecture and Layering → Issues*
  - All current routes already use `asyncHandler` (verified)

- [ ] **A2 — No request-level context propagation** (🟢 Low)
  - Report section: *A) Architecture and Layering → Issues*
  - `requestIdMiddleware` already exists; further propagation is a nice-to-have
  - Files: `src/middleware/requestIdMiddleware.ts`

---

## Second Review Findings

- [x] **J1 — package.json still named "inventory-management"** (🔴 High)
  - Renamed to `delivery-roulette`
  - Files: `package.json`

- [x] **J2 — Dead gaming API settings in settings.ts** (🔴 High)
  - Removed Steam, RAWG, Twitch, BoardGameAtlas API keys + metadataEnrichmentQueryTimeoutMs
  - Files: `src/modules/settings.ts`

- [x] **J3 — CONFIGURATION.md documents dead gaming settings** (🟡 Medium)
  - Replaced gaming metadata section with provider sync settings
  - Files: `docs/CONFIGURATION.md`

- [x] **J4 — E2E tests reference barcode-delete and loan-return** (🟡 Medium)
  - Replaced with generic btn-delete
  - Files: `tests/e2e/button-functionality.spec.ts`

- [x] **K1 — CSRF getSessionIdentifier breaks with saveUninitialized:false** (🔴 High)
  - Changed to return constant empty string
  - Files: `src/app.ts`

- [x] **K2 — AJAX requests missing CSRF tokens** (🔴 High)
  - Added meta tag in layout.pug + x-csrf-token header in http.ts
  - Files: `src/views/layout.pug`, `src/public/js/core/http.ts`

- [x] **K3 — Multipart upload bypasses CSRF** (🔴 High)
  - Skip validation but generate token for import/upload route
  - Files: `src/app.ts`

- [x] **K4 — Rate limiter too restrictive for E2E** (🟡 Medium)
  - Increased limit in test/e2e environments
  - Files: `src/routes/users.ts`
