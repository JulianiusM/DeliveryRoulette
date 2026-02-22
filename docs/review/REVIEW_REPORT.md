# DeliveryRoulette — Full Repository Review Report

**Date:** February 2026
**Scope:** All source files, configuration, migrations, views, scripts, tests, and documentation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture and Layering](#a-architecture-and-layering)
3. [Data Layer and Migrations](#b-data-layer-and-migrations)
4. [Provider Integration Quality](#c-provider-integration-quality)
5. [Security](#d-security)
6. [Tests](#e-tests)
7. [UX and User Flows](#f-ux-and-user-flows)
8. [Maintainability and Cleanup](#g-maintainability-and-cleanup)
9. [Documentation](#h-documentation)
10. [Copilot/AI Instructions](#i-copilotai-instructions)

---

## Executive Summary

DeliveryRoulette is a well-structured Express.js + TypeORM + Pug application for restaurant management with Lieferando provider integration, dietary preference tracking, and random restaurant suggestions. The codebase demonstrates strong architecture patterns (clean MVC separation, service layer, connector plugin pattern) and comprehensive testing infrastructure (data-driven Jest + Playwright E2E).

**Critical findings:**

| Severity | Count | Summary |
|----------|-------|---------|
| 🔴 Critical | 3 | CSRF missing, input validation missing, massive outdated template content in docs/instructions |
| 🟠 High | 4 | No transactions in multi-step operations, rate limiting not enforced, caching unused by connectors, FK indexes missing |
| 🟡 Medium | 6 | httpOnly not explicit, protocol validation incomplete, test coverage gaps, dead nav links in UI |
| 🟢 Low | 5 | Minor doc formatting, unused docs files, test builder reference nonexistent |

---

## A) Architecture and Layering

### ✅ Strengths

**Clean MVC separation** — Controllers never access the database directly. All database operations are delegated to the service layer:
- `src/controller/restaurantController.ts` → calls `RestaurantService`, `MenuService`, `ProviderRefService`
- `src/controller/suggestionController.ts` → calls `SuggestionService`, `SuggestionHistoryService`
- No `AppDataSource` or `getRepository()` calls in any controller

**Service layer owns business logic** — Services handle password hashing, token generation, OIDC provisioning, diet inference, and data validation:
- `src/modules/database/services/UserService.ts` (327 lines) — auth, tokens, OIDC
- `src/modules/database/services/DietInferenceService.ts` (256 lines) — keyword matching, confidence scoring
- `src/modules/database/services/RestaurantService.ts` (102 lines) — CRUD + provider upsert

**Provider connector isolation** — Connectors (`src/providers/`) are pure external adapters:
- `LieferandoConnector` only calls Lieferando APIs, no app internals
- `ConnectorRegistry` provides service-locator pattern
- Connectors return data via defined interfaces; the app handles persistence

**Centralized error handling** — Three custom error types (`ExpectedError`, `APIError`, `ValidationError`) with a unified handler in `src/middleware/genericErrorHandler.ts`:
- Stack traces only exposed in development
- Proper HTTP status mapping
- Structured logging for 5xx errors

**Configuration management** — All constants centralized in `src/modules/settings.ts` (390 lines, 50+ settings). Loaded from CSV/environment variables.

### ⚠️ Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| A1 | `asyncHandler` wrapper used but not all routes wrap their handlers | Medium | `src/routes/*.ts` |
| A2 | No request-level context propagation (e.g., for per-request logging correlation) beyond `requestIdMiddleware` | Low | `src/middleware/requestIdMiddleware.ts` |

---

## B) Data Layer and Migrations

### ✅ Strengths

**Entity-migration consistency** — All 18 entities have corresponding migrations (15 migration files). Entities match runtime usage.

**Synchronize disabled** — `synchronize: false` in `src/modules/database/dataSource.ts:29`. Safe for production.

**All migrations reversible** — Every migration has a proper `down()` method with correct table drop order and foreign key handling.

**Unique constraints** — Proper composite unique indexes on:
- `DietInferenceResult(restaurant_id, diet_tag_id, engine_version)`
- `UserDietPreference(user_id, diet_tag_id)`
- `UserRestaurantPreference(user_id, restaurant_id)`
- `RestaurantProviderRef(provider_key, external_id)`

**UTC timezone handling** — `timezone: 'Z'` in DataSource config. DATE columns treated as strings to prevent parsing issues.

### ⚠️ Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| B1 | **No transactions** — Zero transaction usage across all services. Multi-step operations like `upsertFromProvider()` and `computeForRestaurant()` can leave inconsistent state on partial failure | 🟠 High | `src/modules/database/services/RestaurantService.ts`, `DietInferenceService.ts` |
| B2 | **Missing FK indexes** — No explicit indexes on `restaurant_id` FK in `menu_categories` and `diet_inference_results`, or `user_id` FK in preference tables. These columns are frequently queried | 🟠 High | `src/migrations/1740200000000-*.ts`, `1740600000000-*.ts` |
| B3 | Session entity not found in `src/modules/database/entities/` despite being used by express-session TypeORM store | 🟡 Medium | `src/app.ts` |

---

## C) Provider Integration Quality

### ✅ Strengths

**Resilient parsing** — Three-tier HTML parsing in `src/providers/lieferando/lieferandoParsing.ts`:
1. JSON-LD extraction (structured data)
2. Preloaded state (`__NEXT_DATA__`, `__NUXT__`) with max search depth
3. HTML heuristic fallback with multiple strategies

**Graceful degradation** — Parse failures return empty results with warnings rather than throwing. Per-restaurant error isolation in sync pipeline.

**URL validation** — Domain whitelist prevents SSRF: only `lieferando.de` and `www.lieferando.de` accepted (`LieferandoConnector.ts:89-107`).

**HTTP client safety** — Timeout protection, concurrency limiting, and honest User-Agent in `src/modules/lib/httpClient.ts`.

**Sync status reporting** — `SyncResult` includes per-restaurant success/error detail. Stale restaurant detection creates alerts.

### ⚠️ Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| C1 | **Rate limiting not enforced** — Connector declares `rateLimitPolicy()` but it's never checked. Global concurrency limit exists but no per-provider rate limiting | 🟠 High | `src/providers/lieferando/LieferandoConnector.ts:72-73`, `src/modules/lib/httpClient.ts` |
| C2 | **Caching unused** — `ProviderFetchCacheService` exists but connectors use native `fetch()` directly, bypassing the cache entirely | 🟠 High | `src/providers/lieferando/LieferandoConnector.ts`, `src/modules/providers/ProviderFetchCacheService.ts` |
| C3 | **Protocol validation incomplete** — URL domain is validated but protocol is not explicitly checked for `https:` only. Could accept `http:`, `ftp:`, `file:` if validation is bypassed | 🟡 Medium | `src/providers/lieferando/LieferandoConnector.ts:89-107` |
| C4 | Sync job lock is optimistic (check-then-insert); race condition possible between check and insert | 🟡 Medium | `src/modules/sync/ProviderSyncService.ts:35-38` |

---

## D) Security

### ✅ Strengths

**Credential encryption** — AES-256-GCM with random IV and authentication tag in `src/modules/lib/crypto.ts`. Industrial-strength for provider credentials.

**Session security** — Secure cookies in production (`secure: true`), `sameSite: "lax"`, 1-day TTL, TypeORM-backed session store.

**Logging safety** — Pino logger with automatic redaction of `password`, `secret`, `token`, `authorization`, `cookie` fields.

**HTML escaping** — Pug templates use safe `#{}` interpolation (auto-escaped). No evidence of unsafe `!{}` usage. Additional `htmlUtils.ts` for manual sanitization.

### 🔴 Critical Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| D1 | **No CSRF protection** — No CSRF middleware installed. All POST forms vulnerable. Documented in `docs/issues/A5` but not implemented | 🔴 Critical | `src/app.ts` |
| D2 | **No input validation** — `express-validator` installed but zero validation chains on any route. Raw `req.body` passed directly to controllers | 🔴 Critical | `src/routes/users.ts`, `restaurants.ts`, `import.ts`, `providers.ts` |

### Other Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| D3 | `httpOnly` not explicitly set on session cookie (relies on default behavior) | 🟡 Medium | `src/app.ts:50-67` |
| D4 | No Content-Security-Policy headers configured | 🟡 Medium | `src/app.ts` |

---

## E) Tests

### ✅ Strengths

**Comprehensive parser testing** — 15+ tests for Lieferando listing/menu parsing with real HTML fixtures in `tests/fixtures/lieferando/`.

**Data-driven approach** — All tests use externalized test data in `tests/data/` with `test.each()` parameterization.

**Keyword-driven E2E** — Reusable keywords in `tests/keywords/e2e/` (auth, import, menu, restaurant, suggestion, diet).

**Deterministic tests** — No live HTTP calls detected. All external dependencies mocked.

**E2E coverage** — Three end-to-end workflows:
- `main-workflow.spec.ts` — Register → Restaurant → Menu → Override → Suggest
- `import-workflow.spec.ts` — Import → Preview → Apply → Suggest
- `button-functionality.spec.ts` — UI button interactions

### ⚠️ Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| E1 | **ProviderFetchCacheService untested** — All caching logic (hit/miss, TTL, URL hashing) completely uncovered | 🟡 Medium | `src/modules/providers/ProviderFetchCacheService.ts` |
| E2 | **LieferandoConnector integration untested** — Only parsing tested; connector's `fetchMenu()` + `listRestaurants()` never tested with mocked HTTP | 🟡 Medium | `src/providers/lieferando/LieferandoConnector.ts` |
| E3 | **13 database services have no direct tests** — Only tested indirectly through controllers | 🟡 Medium | `src/modules/database/services/*.ts` |
| E4 | **Middleware untested** — `authMiddleware`, `validationErrorHandler`, `pushConnectorAuthMiddleware` have no tests | 🟡 Medium | `src/middleware/*.ts` |
| E5 | **OIDC/email modules untested** — Authentication flow and email sending have no tests | 🟡 Medium | `src/modules/oidc.ts`, `src/modules/email.ts` |
| E6 | `testing-quick-reference.md` references `tests/data/builders/` which does not exist | 🟢 Low | `.github/copilot/testing-quick-reference.md:34,48` |

---

## F) UX and User Flows

### ✅ Strengths

**Provider settings** — Clear per-provider configuration with listing URL sync and single-restaurant import.

**Restaurant management** — Full CRUD with address, status, favorites, provider references, and diet suitability display.

**Suggestion engine** — Diet-aware random suggestion with advanced filters (diet requirements, cuisine inclusion/exclusion).

**Import system** — JSON/CSV upload with preview page showing diff badges (New/Updated/Unchanged) before apply.

**Sync alerts** — Stale restaurant detection and diet override conflict alerts.

### ⚠️ Issues

| ID | Issue | Severity | File(s) |
|----|-------|----------|---------|
| F1 | **Dead navigation links** — `layout.pug` and `index.pug` contain nav links to `/items`, `/games`, `/loans`, `/locations` which don't exist in this app | 🟡 Medium | `src/views/layout.pug`, `src/views/index.pug` |
| F2 | Index page references features from a different app (barcode scanning, item cataloging, lending) | 🟡 Medium | `src/views/index.pug` |
| F3 | Dashboard (`users/dashboard.pug`) may reference item/loan counts that don't exist | 🟡 Medium | `src/views/users/dashboard.pug` |

---

## G) Maintainability and Cleanup

### Dead / Outdated Files

| File | Issue | Action |
|------|-------|--------|
| `docs/GAMES_MODULE_REVIEW.md` | Documents non-existent Games module | Delete |
| `docs/GAME_SUGGESTION.md` | Documents non-existent game suggestion | Delete |
| `docs/ACTIVITY_REQUIREMENTS_ALGORITHM.md` | Documents non-existent activity scheduling | Delete |
| `docs/user-guide/GAMES.md` | 590-line guide for non-existent Games module | Delete |

### Outdated Content in Otherwise-Valid Files

| File | Issue |
|------|-------|
| `docs/ARCHITECTURE.md` | Lines 14, 21, 52, 109-111, 213-265, 317-321, 404, 438-448, 483-550+ reference surveys, packing, activities, drivers, games — none of which exist |
| `docs/user-guide/README.md` | Entire content describes item cataloging, barcode scanning, lending — nothing about restaurants |
| `.github/copilot-instructions.md` | Lines 148-425 contain 278 lines of Games Module Architecture documentation |
| `.github/copilot/project-overview.md` | Line 3: "survey management application" |
| `AGENTS.md` | Lines 7, 431 reference "item cataloging" and "items, locations, loans, scanning" |

### Code Quality

- ✅ TypeScript strict mode enabled
- ✅ Consistent async/await usage
- ✅ Proper error class hierarchy
- ✅ Clean module boundaries
- ⚠️ Some settings reference non-existent features (e.g., `paginationDefaultGames` in settings.ts)

---

## H) Documentation

### Current State

The documentation is **extensive** (30+ files) but **significantly outdated**. Approximately 40% of content describes features from a different application template (item cataloging, games, barcode scanning, lending).

### What Accurately Documents DeliveryRoulette

| File | Status |
|------|--------|
| `docs/DATABASE.md` | ✅ Current — restaurant/menu/diet entities |
| `docs/CONFIGURATION.md` | ✅ Current — settings module |
| `docs/OPERATIONS.md` | ✅ Current — health, logging, sync |
| `docs/DEVELOPMENT.md` | ✅ Current — dev workflow |
| `docs/TESTING_GUIDE.md` | ✅ Current — testing patterns |
| `docs/TEST_REVIEW.md` | ✅ Current — test quality |
| `docs/FRONTEND_TESTING.md` | ✅ Current — MSW testing |
| `docs/import-schema.md` | ✅ Current — import format |
| `docs/UI_REDESIGN_*.md` | ✅ Current — UI phases |
| `docs/UX_IMPROVEMENTS_2026_01.md` | ✅ Current |

### What Needs Rewriting

| File | Issue |
|------|-------|
| `docs/ARCHITECTURE.md` | Mixed correct/incorrect content; games/survey/activity sections must be replaced with restaurant/provider/diet architecture |
| `docs/user-guide/README.md` | Entirely about item cataloging app; must be rewritten for DeliveryRoulette |
| `docs/README.md` | Index mostly correct but links to deleted files need updating |

---

## I) Copilot/AI Instructions

### Current State

Three instruction sources exist with significant overlap and outdated content:

1. **`.github/copilot-instructions.md`** — Main file. Lines 1-147 are mostly correct. Lines 148-425 are entirely about a Games Module that doesn't exist.
2. **`.github/copilot/` modular files** — 6 files with minor issues (wrong project description, nonexistent builder references, outdated branch names).
3. **`AGENTS.md`** — Root-level guide. Mostly correct but has 2 wrong references and overlaps with copilot-instructions.md.

### Key Problems

- **278 lines of fictional content** in copilot-instructions.md (Games Module Architecture section)
- **Wrong project description** in project-overview.md ("survey management")
- **Nonexistent references** to `tests/data/builders/`, survey data, entity keywords
- **E2E test file names** in instructions don't match actual test files
- **No instructions** about the actual DeliveryRoulette domain (restaurants, menus, diet preferences, Lieferando connector, sync pipeline)

---

## Summary of All Findings

| ID | Category | Severity | Finding |
|----|----------|----------|---------|
| D1 | Security | 🔴 Critical | No CSRF protection on POST routes |
| D2 | Security | 🔴 Critical | No input validation chains on any route |
| G1 | Docs/Instructions | 🔴 Critical | 278 lines of fictional Games Module in copilot-instructions |
| B1 | Data Layer | 🟠 High | No transaction handling in multi-step operations |
| B2 | Data Layer | 🟠 High | Missing foreign key indexes |
| C1 | Provider | 🟠 High | Rate limiting declared but not enforced |
| C2 | Provider | 🟠 High | Cache service exists but unused by connectors |
| D3 | Security | 🟡 Medium | httpOnly not explicitly set on session cookie |
| D4 | Security | 🟡 Medium | No Content-Security-Policy headers |
| C3 | Provider | 🟡 Medium | No protocol validation on provider URLs |
| C4 | Provider | 🟡 Medium | Optimistic sync job locking (race condition) |
| E1 | Tests | 🟡 Medium | ProviderFetchCacheService untested |
| E2 | Tests | 🟡 Medium | LieferandoConnector integration untested |
| E3 | Tests | 🟡 Medium | Database services untested directly |
| E4 | Tests | 🟡 Medium | Middleware untested |
| E5 | Tests | 🟡 Medium | OIDC/email untested |
| F1 | UX | 🟡 Medium | Dead nav links to non-existent features |
| F2 | UX | 🟡 Medium | Index page describes wrong app |
| E6 | Tests | 🟢 Low | Builder reference in docs doesn't exist |
| A1 | Architecture | 🟢 Low | Not all routes use asyncHandler consistently |
| A2 | Architecture | 🟢 Low | Limited request-level context propagation |

---

## Second Review — Additional Findings (February 2026)

The following issues were discovered during a second review pass after initial implementation:

### J. Dead Code from Previous Application

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| J1 | `package.json` name is `inventory-management` instead of `delivery-roulette` | 🔴 High | ✅ Fixed |
| J2 | `settings.ts` contains gaming API keys (Steam, RAWG, Twitch, BoardGameAtlas, metadataEnrichment) | 🔴 High | ✅ Fixed |
| J3 | `CONFIGURATION.md` documents dead pagination settings and gaming metadata scoring | 🟡 Medium | ✅ Fixed |
| J4 | `button-functionality.spec.ts` references barcode-delete and loan-return CSS classes | 🟡 Medium | ✅ Fixed |

### K. CSRF Implementation Gaps

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| K1 | CSRF `getSessionIdentifier` uses `req.session.id` which changes between GET/POST with `saveUninitialized:false` | 🔴 High | ✅ Fixed |
| K2 | Client-side AJAX requests (`http.ts`) don't include CSRF tokens | 🔴 High | ✅ Fixed |
| K3 | Multipart file upload bypasses CSRF because multer runs after CSRF middleware | 🔴 High | ✅ Fixed |
| K4 | Rate limiter `max:10` too low for parallel E2E test execution | 🟡 Medium | ✅ Fixed |
