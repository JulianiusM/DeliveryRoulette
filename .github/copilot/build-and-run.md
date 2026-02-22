# Building and Running

## Development

```bash
npm run server          # Run server with client watch mode
npm run server:dev      # Run server only
npm run server:client   # Build client assets in watch mode
```

## Production Build

```bash
npm run build           # Build everything
npm run build:server    # Build server only
npm run build:client    # Build client only
```

## Testing

```bash
npm test                  # Run Jest tests (unit, controller, middleware, database)
npm run test:client       # Run frontend tests (Jest + MSW)
npm run e2e               # Run Playwright E2E tests
npm run e2e:headed        # Run E2E tests with visible browser
npm run test:all          # One-click: setup + build + run all tests
```

### Pre-commit Test Sequence (mandatory)

Always run **all three** test suites before committing:

```bash
npm run build                         # 1. Build application
npm test -- --passWithNoTests         # 2. Jest tests (backend + DB)
npm run test:client                   # 3. Frontend tests
npx playwright test                   # 4. E2E tests (requires build)
```

## CI Pipeline

The GitHub Actions CI pipeline:

- Runs on push to `master` or `dev` branches
- Runs on pull requests to `master` or `dev`
- Also triggers on the `ts-migration` branch
- Sets up MariaDB 10.11 service container
- Sets up Node.js 24
- Creates test and E2E databases with proper users
- Runs all unit, integration, frontend, and E2E tests
- Uploads coverage reports and Playwright reports as artifacts

### Environment Files

- `tests/.env.test` - Configuration for unit/integration tests
- `.env.e2e` - Configuration for E2E tests
- Both files are created automatically in CI
