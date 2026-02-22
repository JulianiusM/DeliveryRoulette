/**
 * Database test keywords – reusable helpers for DB integration tests.
 */
import {DataSource, DataSourceOptions} from 'typeorm';

const env = (k: string, d?: string) => process.env[k] ?? d ?? '';

/** Base connection options shared by all DB test data sources. */
function baseOptions(): Partial<DataSourceOptions> {
    return {
        type: 'mariadb',
        host: env('TEST_DB_HOST', '127.0.0.1'),
        port: Number(env('TEST_DB_PORT', '3306')),
        username: env('TEST_DB_USER', 'root'),
        password: env('TEST_DB_PASSWORD', 'password'),
        database: env('TEST_DB_NAME', 'deliveryroulette_test'),
        logging: env('TEST_DB_LOGGING', 'false') === 'true',
        timezone: 'Z' as any,
    } as Partial<DataSourceOptions>;
}

/**
 * Create a DataSource for migration-only testing (no synchronize, no entities).
 */
export function createMigrationDataSource(): DataSource {
    return new DataSource({
        ...baseOptions(),
        synchronize: false,
        entities: [],
        migrations: ['src/migrations/*.ts'],
    } as DataSourceOptions);
}

/**
 * Create a DataSource with full entity + migration support (synchronize on).
 */
export function createFullDataSource(): DataSource {
    return new DataSource({
        ...baseOptions(),
        synchronize: true,
        entities: ['src/modules/database/entities/**/*.ts'],
        migrations: ['src/migrations/*.ts'],
    } as DataSourceOptions);
}

/**
 * Drop all tables in the database (clean slate).
 */
export async function dropAllTables(ds: DataSource): Promise<void> {
    await ds.query('SET FOREIGN_KEY_CHECKS = 0');
    const rows: {table_name: string}[] = await ds.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`,
    );
    for (const row of rows) {
        await ds.query(`DROP TABLE IF EXISTS \`${row.table_name}\``);
    }
    await ds.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Create the `users` table manually.
 * This table is required by several migrations as a FK target but has no
 * dedicated migration file (managed by TypeORM synchronize in production).
 */
export async function createUsersTable(ds: DataSource): Promise<void> {
    await ds.query(`
        CREATE TABLE IF NOT EXISTS \`users\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`username\` varchar(50) NOT NULL,
            \`name\` varchar(50) NOT NULL,
            \`email\` varchar(100) NOT NULL,
            \`PASSWORD\` varchar(255) NULL,
            \`is_active\` tinyint(1) NULL DEFAULT 0,
            \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`activation_token\` varchar(255) NULL,
            \`activation_token_expiration\` datetime NULL,
            \`reset_token\` varchar(255) NULL,
            \`reset_token_expiration\` datetime NULL,
            \`oidc_sub\` varchar(255) NULL,
            \`oidc_issuer\` varchar(255) NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`email\` (\`email\`),
            UNIQUE INDEX \`username\` (\`username\`)
        ) ENGINE=InnoDB
    `);
}

/**
 * List all user-created table names in the current database.
 */
export async function listTableNames(ds: DataSource): Promise<string[]> {
    const rows: {table_name: string}[] = await ds.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`,
    );
    return rows.map((r) => r.table_name).sort();
}

/**
 * Truncate a table (fast delete of all rows).
 */
export async function truncateTable(ds: DataSource, table: string): Promise<void> {
    await ds.query('SET FOREIGN_KEY_CHECKS = 0');
    await ds.query(`TRUNCATE TABLE \`${table}\``);
    await ds.query('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Insert a row and return generated id.
 */
export async function insertRow(
    ds: DataSource,
    table: string,
    data: Record<string, unknown>,
): Promise<any> {
    const cols = Object.keys(data).map((c) => `\`${c}\``).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    const result = await ds.query(
        `INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`,
        values,
    );
    return result;
}

/**
 * Assert that inserting a duplicate row throws a constraint error.
 */
export async function expectDuplicateInsertToFail(
    ds: DataSource,
    table: string,
    data: Record<string, unknown>,
): Promise<void> {
    await expect(insertRow(ds, table, data)).rejects.toThrow(/Duplicate entry|ER_DUP_ENTRY/);
}
