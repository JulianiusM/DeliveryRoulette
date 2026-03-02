import {MigrationInterface, QueryRunner, Table, TableForeignKey} from 'typeorm';

/**
 * Normalize DietTag: replace JSON columns with proper child tables
 * (diet_tag_keywords, diet_tag_dishes, diet_tag_allergen_exclusions).
 *
 * Migrates existing JSON data into the child rows, then drops the JSON columns.
 */
export class NormalizeDietTagJsonColumns1742600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Create child tables ──────────────────────────────
        await queryRunner.createTable(new Table({
            name: 'diet_tag_keywords',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '150', isNullable: false},
            ],
        }), true);

        await queryRunner.createTable(new Table({
            name: 'diet_tag_dishes',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '150', isNullable: false},
            ],
        }), true);

        await queryRunner.createTable(new Table({
            name: 'diet_tag_allergen_exclusions',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '150', isNullable: false},
            ],
        }), true);

        // ── Foreign keys ─────────────────────────────────────
        await this.safeCreateForeignKey(queryRunner, 'diet_tag_keywords', new TableForeignKey({
            columnNames: ['diet_tag_id'],
            referencedTableName: 'diet_tags',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await this.safeCreateForeignKey(queryRunner, 'diet_tag_dishes', new TableForeignKey({
            columnNames: ['diet_tag_id'],
            referencedTableName: 'diet_tags',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));
        await this.safeCreateForeignKey(queryRunner, 'diet_tag_allergen_exclusions', new TableForeignKey({
            columnNames: ['diet_tag_id'],
            referencedTableName: 'diet_tags',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
        }));

        // ── Migrate existing JSON data (if columns still exist) ───
        const table = await queryRunner.getTable('diet_tags');
        const hasJsonColumns = table?.findColumnByName('keyword_whitelist_json');

        if (hasJsonColumns) {
            const tags: Array<{id: string; keyword_whitelist_json: string | null; dish_whitelist_json: string | null; allergen_exclusions_json: string | null}> = await queryRunner.query(
                `SELECT id, keyword_whitelist_json, dish_whitelist_json, allergen_exclusions_json FROM diet_tags`,
            );

            for (const tag of tags) {
                await this.migrateJsonColumn(queryRunner, 'diet_tag_keywords', tag.id, tag.keyword_whitelist_json);
                await this.migrateJsonColumn(queryRunner, 'diet_tag_dishes', tag.id, tag.dish_whitelist_json);
                await this.migrateJsonColumn(queryRunner, 'diet_tag_allergen_exclusions', tag.id, tag.allergen_exclusions_json);
            }

            // ── Drop JSON columns ────────────────────────────────
            await queryRunner.dropColumn('diet_tags', 'keyword_whitelist_json');
            await queryRunner.dropColumn('diet_tags', 'dish_whitelist_json');
            await queryRunner.dropColumn('diet_tags', 'allergen_exclusions_json');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add JSON columns (if they don't exist)
        const table = await queryRunner.getTable('diet_tags');
        if (!table?.findColumnByName('keyword_whitelist_json')) {
            await queryRunner.query(`ALTER TABLE diet_tags ADD COLUMN keyword_whitelist_json TEXT NULL`);
        }
        if (!table?.findColumnByName('dish_whitelist_json')) {
            await queryRunner.query(`ALTER TABLE diet_tags ADD COLUMN dish_whitelist_json TEXT NULL`);
        }
        if (!table?.findColumnByName('allergen_exclusions_json')) {
            await queryRunner.query(`ALTER TABLE diet_tags ADD COLUMN allergen_exclusions_json TEXT NULL`);
        }

        // Migrate data back from child tables into JSON columns
        const tags: Array<{id: string}> = await queryRunner.query(`SELECT id FROM diet_tags`);
        for (const tag of tags) {
            const kwRows: Array<{value: string}> = await queryRunner.query(`SELECT value FROM diet_tag_keywords WHERE diet_tag_id = ?`, [tag.id]);
            const dishRows: Array<{value: string}> = await queryRunner.query(`SELECT value FROM diet_tag_dishes WHERE diet_tag_id = ?`, [tag.id]);
            const aeRows: Array<{value: string}> = await queryRunner.query(`SELECT value FROM diet_tag_allergen_exclusions WHERE diet_tag_id = ?`, [tag.id]);

            await queryRunner.query(
                `UPDATE diet_tags SET keyword_whitelist_json = ?, dish_whitelist_json = ?, allergen_exclusions_json = ? WHERE id = ?`,
                [
                    kwRows.length > 0 ? JSON.stringify(kwRows.map((r) => r.value)) : null,
                    dishRows.length > 0 ? JSON.stringify(dishRows.map((r) => r.value)) : null,
                    aeRows.length > 0 ? JSON.stringify(aeRows.map((r) => r.value)) : null,
                    tag.id,
                ],
            );
        }

        // Drop child tables
        await queryRunner.dropTable('diet_tag_allergen_exclusions', true);
        await queryRunner.dropTable('diet_tag_dishes', true);
        await queryRunner.dropTable('diet_tag_keywords', true);
    }

    private async migrateJsonColumn(queryRunner: QueryRunner, tableName: string, tagId: string, jsonValue: string | null): Promise<void> {
        if (!jsonValue) return;
        try {
            const values = JSON.parse(jsonValue);
            if (!Array.isArray(values)) return;
            for (const value of values) {
                if (typeof value !== 'string' || !value.trim()) continue;
                await queryRunner.query(
                    `INSERT INTO ${tableName} (id, diet_tag_id, value) VALUES (UUID(), ?, ?)`,
                    [tagId, value.trim()],
                );
            }
        } catch {
            // Invalid JSON — skip silently
        }
    }

    private async safeCreateForeignKey(queryRunner: QueryRunner, tableName: string, fk: TableForeignKey): Promise<void> {
        try {
            await queryRunner.createForeignKey(tableName, fk);
        } catch {
            // FK already exists (e.g. created by synchronize)
        }
    }
}
