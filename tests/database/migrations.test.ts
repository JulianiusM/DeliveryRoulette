/**
 * Database migration tests – verify that all migrations can run UP and DOWN
 * against a real MariaDB instance.
 *
 * Approach:
 *  1. Start with a clean database (all tables dropped).
 *  2. Create the `users` table manually (it has no migration but is
 *     referenced by FK in several migrations).
 *  3. Run all migrations UP and verify expected tables exist.
 *  4. Revert all migrations DOWN and verify they are removed.
 */

import {DataSource} from 'typeorm';
import {
    createMigrationDataSource,
    dropAllTables,
    createUsersTable,
    listTableNames,
} from '../keywords/database/dbKeywords';
import {expectedMigrationTables} from '../data/database/constraintData';

let ds: DataSource;

beforeAll(async () => {
    ds = createMigrationDataSource();
    await ds.initialize();
    // Start with a completely empty database
    await dropAllTables(ds);
});

afterAll(async () => {
    if (ds?.isInitialized) {
        await dropAllTables(ds);
        await ds.destroy();
    }
});

describe('Migrations', () => {
    test('all migrations run UP successfully', async () => {
        // The users table is required as a FK target but has no migration
        await createUsersTable(ds);

        // Run all 15 migrations
        const executed = await ds.runMigrations();
        expect(executed.length).toBe(15);

        // Verify every expected table now exists
        const tables = await listTableNames(ds);
        for (const expected of expectedMigrationTables) {
            expect(tables).toContain(expected);
        }
        // Also check the TypeORM migrations tracking table
        expect(tables).toContain('migrations');
    });

    test('all migrations revert DOWN successfully', async () => {
        // Revert all 15 migrations in reverse order
        for (let i = 0; i < 15; i++) {
            await ds.undoLastMigration();
        }

        const tables = await listTableNames(ds);
        // Only `users` (manually created) and `migrations` (TypeORM metadata) should remain
        for (const expected of expectedMigrationTables) {
            expect(tables).not.toContain(expected);
        }
    });

    test('migrations are idempotent – re-running UP after DOWN succeeds', async () => {
        const executed = await ds.runMigrations();
        expect(executed.length).toBe(15);

        const tables = await listTableNames(ds);
        for (const expected of expectedMigrationTables) {
            expect(tables).toContain(expected);
        }
    });
});
