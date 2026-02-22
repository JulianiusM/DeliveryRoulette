# DeliveryRoulette Architecture

This document describes the overall architecture, design patterns, and technical decisions in the DeliveryRoulette application.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Application Layers](#application-layers)
- [Database Design](#database-design)
- [Frontend Architecture](#frontend-architecture)
- [Authentication & Authorization](#authentication--authorization)
- [Testing Architecture](#testing-architecture)
- [Provider Integration](#provider-integration)
- [Design Patterns](#design-patterns)

---

## System Overview

DeliveryRoulette is a **monolithic web application** for restaurant management, dietary preference tracking, and delivery suggestions with the following characteristics:

- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MariaDB with TypeORM
- **Frontend**: Server-rendered Pug templates + vanilla JavaScript/TypeScript (Bootstrap dark theme)
- **Authentication**: OIDC (OpenID Connect) + local login
- **Testing**: Jest + Playwright

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client Browser                     │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │ Pug Views  │  │ Client JS   │  │ Bootstrap UI │ │
│  └────────────┘  └─────────────┘  └──────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────┴────────────────────────────────┐
│              Express.js Application                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Routes     │→ │ Controllers  │→ │ Services   │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
│  ┌─────────────┐  ┌──────────────┐                 │
│  │ Middleware  │  │ Permissions  │                 │
│  └─────────────┘  └──────────────┘                 │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│              MariaDB Database (TypeORM)              │
│  ┌───────────────────────────────────────────────┐ │
│  │  Entities: Users, Restaurants, Menus, DietTags  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 24.x | Runtime environment |
| TypeScript | Latest | Type-safe JavaScript |
| Express.js | 5.x | Web framework |
| TypeORM | Latest | ORM for database access |
| Pug | 3.x | Template engine |
| bcryptjs | Latest | Password hashing |
| express-session | Latest | Session management |
| express-validator | Latest | Input validation |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | Latest | Type-safe client code |
| Bootstrap | 5.3.x | UI framework |
| esbuild | Latest | Fast bundling |
| SASS | Latest | CSS preprocessing |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| MariaDB | ≥ 10.4 | Relational database |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Jest | Latest | Unit/integration testing |
| Playwright | Latest | E2E testing |
| MSW | Latest | API mocking |
| Testing Library | Latest | DOM testing |

---

## Application Layers

### 1. Routes Layer

**Location**: `src/routes/`

**Responsibility**: Define HTTP endpoints and route requests to controllers.

```typescript
// src/routes/restaurants.ts
router.get('/', requireLogin, asyncHandler(restaurantController.list));
router.post('/create', requireLogin, asyncHandler(restaurantController.create));
```

**Patterns:**
- One route file per feature
- Middleware applied at route level
- Use `asyncHandler` for async routes

### 2. Middleware Layer

**Location**: `src/middleware/`

**Responsibility**: Request preprocessing, authentication, authorization.

**Key Middleware:**
- `requireLogin` - Ensures user is authenticated
- `genericErrorHandler` - Centralized error handling
- `validationErrorHandler` - Express-validator error handling
- `asyncHandler` - Error handling wrapper for async routes
- `requestIdMiddleware` - Request tracking with unique IDs
- `pushConnectorAuthMiddleware` - Provider API token authentication

### 3. Controller Layer

**Location**: `src/controller/`

**Responsibility**: Business logic orchestration, request/response handling.

```typescript
// Controller pattern
export default {
    async create(req: Request, res: Response): Promise<void> {
        // 1. Validate input
        // 2. Call service layer
        // 3. Handle response
    }
};
```

**Patterns:**
- Controllers don't access database directly
- All business logic in controllers
- Services handle data access
- Return data, not responses (except render/redirect)

### 4. Service Layer

**Location**: `src/modules/database/services/`

**Responsibility**: Database access, transactions, data integrity.

```typescript
// Service pattern
export class RestaurantService {
    async createRestaurant(data: CreateRestaurantDto): Promise<Restaurant> {
        const restaurant = restaurantRepo.create(data);
        return await restaurantRepo.save(restaurant);
    }
}
```

**Patterns:**
- One service per entity
- Use transactions for multi-step operations
- Return entities, not query results
- Handle database errors

### 5. Entity Layer

**Location**: `src/modules/database/entities/`

**Responsibility**: Database schema definition, relationships.

```typescript
@Entity()
export class Restaurant {
    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column()
    name: string;
    
    @Column({ nullable: true })
    city: string;
}
```

**Patterns:**
- One entity per table
- Define relationships with decorators
- Use TypeORM features (timestamps, etc.)
- Validation in controller, not entity

---

## Database Design

### Entity Relationship Overview

```
User ───┬─── UserPreference
        ├─── UserDietPreference ─── DietTag
        ├─── UserRestaurantPreference ─── Restaurant
        └─── SuggestionHistory ─── Restaurant

Restaurant ───┬─── MenuCategory ─── MenuItem
              ├─── RestaurantProviderRef
              ├─── DietInferenceResult ─── DietTag
              └─── DietManualOverride ─── DietTag

ProviderCredential
ProviderSourceConfig
ProviderFetchCache
SyncJob ─── SyncAlert
```

### Key Entities

#### Users
- Authentication via OIDC or local accounts
- Email verification system
- Password reset functionality

#### Restaurants
- Name, address, city, postal code, country
- Active/inactive status
- Provider references for external delivery platforms

#### Menus
- Menu categories per restaurant
- Menu items with name, description, price, currency

#### Diet System
- Diet tags (vegetarian, vegan, gluten-free, etc.)
- Diet inference results (auto-detected from menu items)
- Manual overrides for incorrect detections
- User diet preferences for suggestion filtering

#### Suggestions
- Random restaurant suggestion engine
- Suggestion history tracking

#### Provider Integration
- Provider credentials (encrypted)
- Source configurations
- Fetch cache with TTL
- Sync jobs and alerts

### Migrations

**Location**: `src/migrations/`

**Patterns:**
- Always create migrations for schema changes
- Never use `synchronize: true` in production
- Make migrations idempotent (use IF EXISTS/IF NOT EXISTS)
- Test both `up` and `down` methods
- Name migrations descriptively

---

## Frontend Architecture

### Modular Structure

**Location**: `src/public/js/`

```
js/
├── core/           # Foundation utilities
│   ├── http.ts             # HTTP client
│   ├── navigation.ts       # Navigation helpers
│   ├── form-utils.ts       # Form utilities
│   ├── formatting.ts       # Data formatting
│   ├── dom.ts              # DOM manipulation
│   ├── clipboard.ts        # Copy-to-clipboard
│   └── password-validation.ts # Password validation
├── shared/         # Shared UI behaviors
│   ├── alerts.ts           # Alert messages
│   ├── drag-drop.ts        # Drag & drop
│   ├── inline-edit.ts      # Inline editing
│   ├── ui-helpers.ts       # UI utilities
│   └── date-range-modal.ts # Date range picker
├── modules/        # Feature-specific widgets
│   ├── suggest.ts          # Suggestion engine
│   └── timezone-select.ts  # Timezone picker
└── *.ts           # Page-level scripts
    └── stub.ts            # Main entry point
```

### Module Pattern

```typescript
// Module initialization
export function init(): void {
    // Initialize module
}

// Expose via window
declare global {
    interface Window {
        DeliveryRouletteApp: {
            init: () => void;
        };
    }
}

window.DeliveryRouletteApp = window.DeliveryRouletteApp || {};
window.DeliveryRouletteApp.init = init;
```

### Client-Side Principles

1. **Reuse core/shared helpers** - Don't duplicate HTTP, DOM, or permission logic
2. **Load permissions early** - Use `loadPerms()` before checking permissions
3. **Type-safe DOM queries** - Cast elements to specific types
4. **Document with JSDoc** - Explain complex functions
5. **Minimize HTTP calls** - Batch when possible

---

## Authentication & Authorization

### Authentication (OIDC)

```typescript
// OIDC Provider: src/modules/oidc.ts
// Supports OpenID Connect authentication with auto-provisioning
```

**Flow:**
1. User attempts login
2. If OIDC configured, redirect to provider
3. Provider authenticates and returns
4. Application creates/updates local user (JIT provisioning)
5. Session established

### Authorization

Authorization is handled through session-based authentication:
- `requireLogin` middleware checks for authenticated session
- User roles and permissions stored in session
- Route-level middleware enforces access control

---

## Testing Architecture

### Testing Pyramid

```
       /\        E2E Tests (7 files, 424 tests)
      /  \       - Complete user workflows
     /    \      - Playwright + real browser
    /------\     
   / Database \  Database Tests (7 files, 1000+ tests)
  /   Tests   \  - Real database operations
 /------------\ 
/  Controller  \ Controller Tests (7 files, 518 tests)
| & Unit Tests | - Mocked services
|  (60 files)  | - Business logic focus
+--------------+
|Frontend Tests| Frontend Tests (43 files, 2900+ tests)
| (No Backend) | - MSW for API mocking
+--------------+ - Testing Library for DOM
```

### Testing Patterns

#### Data-Driven Testing

```typescript
// tests/data/controller/restaurantData.ts
export const createRestaurantData = [
    {
        description: 'creates restaurant with valid data',
        input: { name: 'Pizza Place', city: 'Berlin' },
        expected: { id: '123', name: 'Pizza Place' },
    },
];

// tests/controller/restaurant.test.ts
test.each(createRestaurantData)('$description', async (testCase) => {
    // Test implementation
});
```

#### Keyword-Driven Testing

```typescript
// tests/keywords/common/controllerKeywords.ts
export function setupMock(mockFn: jest.Mock, returnValue: any): void {
    mockFn.mockResolvedValue(returnValue);
}

export function verifyResult(actual: any, expected: any): void {
    expect(actual).toEqual(expected);
}

// Usage in tests
setupMock(service.create, testCase.expected);
const result = await controller.create(testCase.input);
verifyResult(result, testCase.expected);
```

### Test Organization

- **Unit tests**: Test individual functions in isolation
- **Controller tests**: Test business logic with mocked services
- **Database tests**: Test data operations with real database
- **Frontend tests**: Test client code with MSW (no backend)
- **E2E tests**: Test complete workflows with Playwright

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing documentation.

---

## Provider Integration

DeliveryRoulette integrates with external delivery platforms (currently Lieferando) to sync restaurant and menu data.

### Provider Connector Architecture

```
src/providers/
├── ProviderKey.ts             # Provider identifier enum
├── DeliveryProviderConnector.ts  # Base connector class
├── ImportConnector.ts         # Import-capable connector base
├── ConnectorRegistry.ts       # Service locator for connectors
├── ConnectorBootstrap.ts      # Connector initialization
├── ProviderTypes.ts           # Type definitions
└── lieferando/                # Lieferando implementation
    ├── LieferandoConnector.ts # Fetch restaurants, menus, validate URLs
    ├── lieferandoParsing.ts   # HTML parsing (JSON-LD, preloaded state, heuristics)
    └── lieferandoTypes.ts     # Lieferando-specific types
```

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

### HTML Parsing Strategy

Lieferando parsing uses a three-tier resilient approach:
1. **JSON-LD** — Structured data from `<script type="application/ld+json">`
2. **Preloaded state** — `__NEXT_DATA__`, `__NUXT__`, `__PRELOADED_STATE__`
3. **HTML heuristics** — DOM-based extraction with multiple fallback strategies

### Plugin Isolation

Connectors are treated as external plugins:
- Connectors must NOT import app internals
- App code must NOT reference specific connectors by name
- Use `ConnectorRegistry` for all connector lookups
- Each connector folder could be extracted to a separate package

---

## Design Patterns

### 1. Repository Pattern

Service layer uses repository pattern:

```typescript
class RestaurantService {
    async findById(id: string): Promise<Restaurant | null> {
        return await restaurantRepo.findOne({ where: { id } });
    }
}
```

### 2. DTO Pattern

Data Transfer Objects for API boundaries:

```typescript
interface CreateRestaurantDto {
    name: string;
    addressLine1: string;
    city: string;
}

// Validated in controller
// Transformed to entity in service
```

### 3. Middleware Chain Pattern

Request processing through middleware chain:

```typescript
router.post('/create', 
    requireLogin,        // Authentication
    requirePerm('EDIT'), // Authorization
    validate(),          // Validation
    asyncHandler(        // Error handling
        controller.create
    )
);
```

### 4. Factory Pattern

Permission middleware factory:

```typescript
export function requirePerm(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Check permission
        if (hasPermission) next();
        else res.status(403).send();
    };
}
```

### 5. Strategy Pattern

Authentication strategies:

```typescript
passport.use('local', new LocalStrategy(...));
passport.use('oidc', new OIDCStrategy(...));

// Use based on configuration
app.use(passport.authenticate(strategy));
```

### 6. Observer Pattern

Event emitters for logging and monitoring:

```typescript
eventEmitter.on('user.login', (user) => {
    logger.info(`User ${user.id} logged in`);
});
```

---

## Performance Considerations

### Database

- **Indexes**: Added on foreign keys and frequently queried columns
- **Transactions**: Used for multi-step operations
- **Connection Pooling**: Configured in TypeORM
- **Query Optimization**: Use `EXPLAIN` for slow queries

### Caching

- **Session Store**: TypeORM-backed session store
- **Provider Cache**: `ProviderFetchCache` table with configurable TTL
- **Static Assets**: Nginx caching (production)

### Frontend

- **Bundling**: esbuild for fast, optimized bundles
- **Lazy Loading**: Modules loaded on demand
- **Minification**: Production builds minified
- **CDN**: Bootstrap and libraries from CDN

---

## Security Architecture

### Security Layers

1. **Input Validation**: express-validator available (chains to be added per route)
2. **Output Escaping**: Pug auto-escapes by default
3. **Authentication**: OIDC + bcrypt password hashing
4. **Authorization**: Session-based with requireLogin middleware
5. **Session Security**: Secure cookies, HTTPS-only in production, SameSite=lax
6. **SQL Injection**: Parameterized queries via TypeORM
7. **Credential Encryption**: AES-256-GCM for provider credentials
8. **Logging Safety**: Pino logger with automatic secret redaction

### Security Best Practices

- ✅ Passwords hashed with bcrypt
- ✅ Sessions use secure cookies in production
- ✅ Output escaped in Pug templates
- ✅ HTTPS enforced in production
- ✅ Database credentials in environment variables
- ✅ Provider credentials encrypted at rest (AES-256-GCM)
- ✅ URL validation with domain whitelist for provider connectors
- ✅ Structured logging with secret redaction

---

## Deployment Architecture

### Development

```
Node.js (nodemon) ──→ TypeScript ──→ Source
     ↓                                 ↑
esbuild (watch) ─────────────────────┘
```

### Production

```
[Nginx] ──→ [Node.js App] ──→ [MariaDB]
   ↓              ↓
[Static         [Sessions]
 Assets]        (TypeORM Store)
```

**Production Checklist:**
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Static assets compiled and cached
- [ ] HTTPS certificates installed
- [ ] Monitoring and logging configured
- [ ] Backups configured
- [ ] Rate limiting enabled

---

## Scalability Considerations

### Current State: Monolith

The application is currently a monolith, suitable for:
- Small to medium user bases (< 10,000 users)
- Single server deployment
- Moderate traffic (< 1,000 req/min)

### Future Scaling Options

If needed, consider:

1. **Horizontal Scaling**: Load balancer + multiple app instances
2. **Database Optimization**: Read replicas, connection pooling
3. **Caching Layer**: Redis for sessions and data caching
4. **CDN**: Static assets served from CDN
5. **Microservices**: Split by feature (if truly necessary)

---

## Monitoring and Observability

### Logging

- **Pino**: Structured JSON logging
- **Levels**: Error, Warn, Info, Debug
- **Redaction**: Automatic redaction of passwords, secrets, tokens, cookies
- **Request IDs**: Unique request tracking via requestIdMiddleware

### Metrics

Consider adding:
- Response times
- Error rates
- Database query times
- User activity

### Health Checks

```typescript
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: await checkDatabase(),
        version: process.env.npm_package_version
    });
});
```

---

## Future Architecture Considerations

### Potential Improvements

1. **API Layer**: Add REST or GraphQL API for mobile apps
2. **Real-time**: WebSockets for live updates
3. **Background Jobs**: Queue system for long-running tasks
4. **File Storage**: S3 or similar for file uploads
5. **Email Queue**: Asynchronous email sending
6. **Search**: Elasticsearch for full-text search

### Migration Paths

If requirements grow:
- Extract services to microservices (feature by feature)
- Add API gateway for service orchestration
- Implement event-driven architecture
- Add message queue (RabbitMQ, Kafka)

---

## Documentation Links

- **Testing**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Development**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **Frontend Testing**: [FRONTEND_TESTING.md](FRONTEND_TESTING.md)
- **Database**: [DATABASE.md](DATABASE.md)

---

**Last Updated:** February 2026  
**Architecture Version:** 2.0  
**Next Review:** Quarterly or with major changes
