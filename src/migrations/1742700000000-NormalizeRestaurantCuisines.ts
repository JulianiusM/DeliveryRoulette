import {MigrationInterface, QueryRunner, Table, TableForeignKey} from 'typeorm';

/**
 * Normalize Restaurant: replace providerCuisinesJson with a child table.
 */
export class NormalizeRestaurantCuisines1742700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: 'restaurant_cuisines',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'restaurant_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '150', isNullable: false},
                {name: 'source', type: 'varchar', length: '20', default: "'provider'"},
            ],
        }), true);

        try {
            await queryRunner.createForeignKey('restaurant_cuisines', new TableForeignKey({
                columnNames: ['restaurant_id'],
                referencedTableName: 'restaurants',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }));
        } catch {
            // FK already exists
        }

        // Migrate existing JSON data (if column still exists)
        const table = await queryRunner.getTable('restaurants');
        if (table?.findColumnByName('provider_cuisines_json')) {
            const restaurants: Array<{id: string; provider_cuisines_json: string | null}> = await queryRunner.query(
                `SELECT id, provider_cuisines_json FROM restaurants WHERE provider_cuisines_json IS NOT NULL`,
            );

            for (const restaurant of restaurants) {
                if (!restaurant.provider_cuisines_json) continue;
                try {
                    const values = JSON.parse(restaurant.provider_cuisines_json);
                    if (!Array.isArray(values)) continue;
                    for (const value of values) {
                        if (typeof value !== 'string' || !value.trim()) continue;
                        await queryRunner.query(
                            `INSERT INTO restaurant_cuisines (id, restaurant_id, value, source) VALUES (UUID(), ?, ?, 'provider')`,
                            [restaurant.id, value.trim()],
                        );
                    }
                } catch {
                    // Invalid JSON — skip
                }
            }

            // Drop JSON column
            await queryRunner.dropColumn('restaurants', 'provider_cuisines_json');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add JSON column (if it doesn't exist)
        const table = await queryRunner.getTable('restaurants');
        if (!table?.findColumnByName('provider_cuisines_json')) {
            await queryRunner.query(`ALTER TABLE restaurants ADD COLUMN provider_cuisines_json TEXT NULL`);
        }

        // Migrate data back
        const restaurants: Array<{id: string}> = await queryRunner.query(`SELECT DISTINCT restaurant_id AS id FROM restaurant_cuisines WHERE source = 'provider'`);
        for (const restaurant of restaurants) {
            const rows: Array<{value: string}> = await queryRunner.query(
                `SELECT value FROM restaurant_cuisines WHERE restaurant_id = ? AND source = 'provider'`,
                [restaurant.id],
            );
            if (rows.length > 0) {
                await queryRunner.query(
                    `UPDATE restaurants SET provider_cuisines_json = ? WHERE id = ?`,
                    [JSON.stringify(rows.map((r) => r.value)), restaurant.id],
                );
            }
        }

        await queryRunner.dropTable('restaurant_cuisines', true);
    }
}
