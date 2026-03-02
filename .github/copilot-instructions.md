# GitHub Copilot Instructions for DeliveryRoulette

This is the main instruction file for GitHub Copilot. Additional detailed guidelines are organized in modular files:

- [Project Overview](copilot/project-overview.md) - Project description and dependencies
- [Code Style Guidelines](copilot/code-style.md) - TypeScript and file organization
- [Database Guidelines](copilot/database-guidelines.md) - Entities, migrations, and database testing
- [Testing Quick Reference](copilot/testing-quick-reference.md) - Testing patterns summary
- [Building and Running](copilot/build-and-run.md) - Development, build, and CI information
- [Common Tasks](copilot/common-tasks.md) - Frequent workflows and security notes

For comprehensive documentation:
- **[docs/README.md](../docs/README.md)** - Documentation index and navigation
- **[docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)** - System architecture and design
- **[docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)** - Development workflow
- **[docs/TESTING_GUIDE.md](../docs/TESTING_GUIDE.md)** - Complete testing guide
- **[docs/TEST_REVIEW.md](../docs/TEST_REVIEW.md)** - Test quality review (⭐⭐⭐⭐⭐)
- **[AGENTS.md](../AGENTS.md)** - General AI agent guidance

## Quick Reference

### Project Structure
- `src/modules/` - Application modules (database, user, etc.)
- `src/migrations/` - Database migrations
- `src/controller/` - Business logic controllers
- `src/routes/` - Express routes (page navigation and API)
- `tests/` - All test files (unit, controller, middleware, database, e2e)
- `tests/data/` - Test data files for data-driven testing
- `tests/keywords/` - Test keywords for keyword-driven testing

### Key Principles
1. **TypeScript**: Use strict typing, interfaces over types, async/await
2. **Database**: Always create migrations, never use synchronize in production
3. **Testing**: Use data-driven and keyword-driven approaches (see TESTING.md)
4. **Security**: Never commit secrets, validate all input, hash passwords
5. **Configuration**: Use the centralized settings module (`src/modules/settings.ts`) for all configuration constants. Never hardcode values like timeouts, limits, or thresholds.
6. **Following Directions**: Always follow user directions. If you are not sure, make reasonable assumptions. Interpret requirements conservatively.
7. **Generic approach**: If the user asks you to fix all tests, fix all tests including database and e2e tests. Fix all issues including those that are not influenced or caused by your changes.
8. **Pre-commit requirement**: **ALWAYS run all tests before committing. All tests must pass. Fix all test failures, including unrelated ones.** Run the following commands in order:
   - `npm run build` — TypeScript compilation + asset copy
   - `npm test -- --passWithNoTests` — Jest tests (unit, controller, middleware, database)
   - `npm run test:client` — Frontend tests (Jest + MSW)
   - `npx playwright test` — E2E tests (requires build + e2e:prepare)
9. **Dark theme**: All UI pages use Bootstrap dark theme (`text-bg-dark`, `table-dark`, `text-white`, `text-white-50` for muted)

## Configuration Management

All configuration constants are centralized in `src/modules/settings.ts`. This includes:
- Token expiration times
- Rate limiting parameters
- Pagination defaults and limits
- Description length constraints
- Provider sync intervals and HTTP settings
- Cache TTL values (listing, menu)

**Never hardcode these values in business logic**. Always use `settings.value.<propertyName>` to access them.

Example:
```typescript
import settings from '../modules/settings';

// Good
const limit = options?.limit || settings.value.paginationDefaultRestaurants;

// Bad
const limit = options?.limit || 30;  // Hardcoded constant
```

## Testing Approach

The project uses **data-driven** and **keyword-driven** testing approaches. For complete details, see [TESTING.md](../TESTING.md).

### Quick Summary

**Test Structure:**
- Test data in `tests/data/<type>/` - Separated from logic
- Test keywords in `tests/keywords/<type>/` - Reusable actions
- Test files in `tests/<type>/` - Focus on test flow

**Writing Tests:**
```typescript
// Import data and keywords
import { testData } from '../data/controller/featureData';
import { setupMock, verifyResult } from '../keywords/common/controllerKeywords';

// Data-driven test
test.each(testData)('$description', async (testCase) => {
    setupMock(service.method, testCase.expected);
    const result = await controller.method(testCase.input);
    verifyResult(result, testCase.expected);
});
```

**Test Types:**
- **Unit tests** (`tests/unit/`) - Individual functions, mocked dependencies
- **Controller tests** (`tests/controller/`) - Business logic, mocked services
- **Middleware tests** (`tests/middleware/`) - Request/response handling
- **Database tests** (`tests/database/`) - Real database operations
- **E2E tests** (`tests/e2e/`) - Complete user workflows with Playwright

See [Testing Quick Reference](copilot/testing-quick-reference.md) for more details.

## E2E Testing Patterns

E2E tests follow the same data-driven and keyword-driven patterns. Key points:

- **Test data**: All constants (URLs, selectors, messages) in `tests/data/e2e/*.ts`
- **Keywords**: Reusable actions in `tests/keywords/e2e/*.ts`
  - `authKeywords.ts` - Authentication (login, register, verify)
  - `restaurantKeywords.ts` - Restaurant operations (create, navigate)
  - `menuKeywords.ts` - Menu management
  - `importKeywords.ts` - Import operations (upload, apply)
  - `suggestKeywords.ts` - Suggestion requests
  - `dietKeywords.ts` - Diet preference workflows
- **For-loop pattern**: Use `for (const data of testData)` to iterate test cases
- **Zero hardcoded strings**: All constants externalized to data files

**Example:**
```typescript
// Import data and keywords
import { restaurantCreationData } from '../data/e2e/restaurantData';
import { loginUser } from '../keywords/e2e/authKeywords';
import { createRestaurant } from '../keywords/e2e/restaurantKeywords';

// Data-driven test
for (const data of restaurantCreationData) {
    test(data.description, async ({ page }) => {
        await loginUser(page, testCredentials.username, testCredentials.password);
        await page.goto(data.createUrl);
        await createRestaurant(page, data.name, data.address);
        await page.waitForURL((url) => data.expectedRedirectPattern.test(url.pathname));
    });
}
```

**E2E Test Organization:**
- `main-workflow.spec.ts` - Register → Restaurant → Menu → Override → Suggest
- `import-workflow.spec.ts` - Import → Preview → Apply → Suggest
- `button-functionality.spec.ts` - UI button interactions

**Important E2E Guidelines:**
- Use Playwright test framework
- Mock OIDC for frontend testing (no real authentication)
- Use `.env.e2e` configuration
- Tests run against built application
- Clear cookies/session in `test.beforeEach`
- Use keywords for common operations
- Test both positive and negative paths

For detailed E2E testing patterns and examples, see [TESTING.md](../TESTING.md) and [tests/e2e/README.md](../tests/e2e/README.md).

## Provider Integration Architecture

DeliveryRoulette integrates with delivery platforms (currently Lieferando) to sync restaurant and menu data.

### Provider Connector Pattern

```
src/providers/
├── ProviderKey.ts             # Enum of provider identifiers
├── DeliveryProviderConnector.ts  # Base class for connectors
├── ImportConnector.ts         # Base for import-capable providers
├── ConnectorRegistry.ts       # Service locator for registered connectors
├── ConnectorBootstrap.ts      # Initialize all provider connectors
├── ProviderTypes.ts           # Type definitions for connectors
└── lieferando/                # Lieferando implementation
    ├── LieferandoConnector.ts # Connector (fetch restaurants, menus, validate URLs)
    ├── lieferandoParsing.ts   # HTML parsing (JSON-LD, preloaded state, heuristic fallback)
    └── lieferandoTypes.ts     # Lieferando-specific types
```

**Plugin isolation rules:**
1. Connectors must NOT import app internals (services, controllers, database)
2. App code must NOT reference specific connectors by name — use `ConnectorRegistry`
3. Connectors receive data via method parameters, return results via interfaces
4. Each connector folder could be extracted to a separate package without breaking the app

### Sync Pipeline

```
ProviderSyncService → ConnectorRegistry.get(providerKey)
    → connector.listRestaurants(query)     # Discover restaurants
    → restaurantService.upsert()           # Persist restaurant data
    → connector.fetchMenu(externalId)      # Fetch menu HTML
    → menuService.upsert()                 # Persist menu categories/items
    → dietInferenceService.compute()       # Auto-detect diet suitability
    → syncAlertService.check()             # Generate alerts for stale data
```

### Key Entities

- **Restaurant**: Name, address, city, opening hours, active status
- **MenuCategory / MenuItem**: Menu structure with prices, allergens, and diet context
- **DietTag**: Diet types (vegetarian, vegan, gluten-free, lactose-free, halal)
- **DietInferenceResult**: Auto-detected diet suitability per restaurant (using keyword matching + allergen exclusion)
- **DietManualOverride**: User corrections to diet detection
- **UserDietPreference**: Per-user diet tag selections
- **UserRestaurantPreference**: Favorites and exclusions
- **SuggestionHistory**: Past random suggestions
- **RestaurantProviderRef**: Link between restaurant and external provider
- **ProviderCredential**: Encrypted API credentials
- **ProviderSourceConfig**: Provider sync source configuration
- **ProviderFetchCache**: Cached provider HTTP responses
- **SyncJob / SyncAlert**: Sync tracking and alert management

### Diet Inference Engine

The diet inference engine (`DietInferenceService`) uses a multi-signal heuristic approach:

1. **Positive keyword matching**: Scans item names/descriptions for diet-related keywords
2. **Dish whitelist**: Recognizes known diet-compatible dishes (e.g., "falafel" → vegan)
3. **Allergen-based exclusion**: Uses item allergen data to disqualify items (e.g., eggs → not vegan). Exclusion rules are stored per diet tag in `allergenExclusionsJson` on the `DietTag` entity, making them data-driven and configurable.
4. **Negative keyword filtering**: Detects contradicting ingredients (e.g., "beef" → not vegetarian)
5. **Context-aware false positive detection**: Filters out misleading matches (e.g., "vegan mayo" on a beef burger)
6. **Confidence scoring**: Rates results as LOW/MEDIUM/HIGH based on evidence strength
7. **Subdiet inheritance**: VEGAN matches inherit VEGETARIAN evidence

The engine version (`ENGINE_VERSION`) is bumped when rules change, triggering recomputation.

### Suggestion Engine

The suggestion service (`SuggestionService`) filters restaurants by:
1. Active status
2. Opening hours (optional "open now" filter using `computeIsOpenNowFromOpeningHours`)
3. Diet compatibility (all required diet tags must be supported)
4. Cuisine filters (include/exclude)
5. User preferences (favorites boosted, do-not-suggest excluded)

## Additional Resources
