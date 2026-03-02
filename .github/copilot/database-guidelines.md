# Database Guidelines

## Entities

- All entities should be in `src/modules/database/entities/`
- Use TypeORM decorators for entity definitions
- Include proper relationships between entities
- Use timezone 'Z' for consistent UTC handling
- **Never use `eager: true` on OneToMany relations with many child rows** — TypeORM generates Cartesian product JOINs that cause severe performance issues. Use explicit `relations: [...]` in `find()` calls or `loadRelationIdAndMap` instead.
- The global DataSource is configured with `relationLoadStrategy: 'query'` to load relations via separate SELECT queries instead of JOINs, avoiding Cartesian products when using `relations` in `find()` options.

## Migrations

- Always create migrations for schema changes
- Never use `synchronize: true` in production
- All migrations must be idempotent and work even after the database is created using syncronize: true
- Test migrations with both up and down operations
- Place migrations in `src/migrations/`

## Testing with Database

- Unit/integration tests use `deliveryroulette_test` database
- E2E tests use `deliveryroulette_e2e` database (name must contain 'e2e')
- Use the provided datasource mocks in tests
- Database tests run serially to avoid conflicts
