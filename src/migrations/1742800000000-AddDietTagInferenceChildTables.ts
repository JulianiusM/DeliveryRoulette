import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableColumn} from 'typeorm';

/**
 * Create additional normalized child tables for DietTag inference data
 * and add parent_tag_key column for subdiet inheritance.
 */
export class AddDietTagInferenceChildTables1742800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add parent_tag_key column if not exists
        const table = await queryRunner.getTable('diet_tags');
        if (table && !table.findColumnByName('parent_tag_key')) {
            await queryRunner.addColumn('diet_tags', new TableColumn({
                name: 'parent_tag_key',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }));
        }

        // diet_tag_negative_keywords
        await queryRunner.createTable(new Table({
            name: 'diet_tag_negative_keywords',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '255', isNullable: false},
            ],
        }), true);

        // diet_tag_strong_signals
        await queryRunner.createTable(new Table({
            name: 'diet_tag_strong_signals',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '255', isNullable: false},
            ],
        }), true);

        // diet_tag_contradiction_patterns
        await queryRunner.createTable(new Table({
            name: 'diet_tag_contradiction_patterns',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '255', isNullable: false},
            ],
        }), true);

        // diet_tag_qualified_neg_exceptions
        await queryRunner.createTable(new Table({
            name: 'diet_tag_qualified_neg_exceptions',
            columns: [
                {name: 'id', type: 'varchar', length: '36', isPrimary: true, generationStrategy: 'uuid', default: '(UUID())'},
                {name: 'diet_tag_id', type: 'varchar', length: '36', isNullable: false},
                {name: 'value', type: 'varchar', length: '255', isNullable: false},
            ],
        }), true);

        // ── Foreign keys ─────────────────────────────────────
        const childTables = [
            'diet_tag_negative_keywords',
            'diet_tag_strong_signals',
            'diet_tag_contradiction_patterns',
            'diet_tag_qualified_neg_exceptions',
        ];
        for (const tableName of childTables) {
            await this.safeCreateForeignKey(queryRunner, tableName, new TableForeignKey({
                columnNames: ['diet_tag_id'],
                referencedTableName: 'diet_tags',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('diet_tag_qualified_neg_exceptions', true);
        await queryRunner.dropTable('diet_tag_contradiction_patterns', true);
        await queryRunner.dropTable('diet_tag_strong_signals', true);
        await queryRunner.dropTable('diet_tag_negative_keywords', true);

        const table = await queryRunner.getTable('diet_tags');
        if (table?.findColumnByName('parent_tag_key')) {
            await queryRunner.dropColumn('diet_tags', 'parent_tag_key');
        }
    }

    private async safeCreateForeignKey(queryRunner: QueryRunner, tableName: string, fk: TableForeignKey): Promise<void> {
        try {
            await queryRunner.createForeignKey(tableName, fk);
        } catch {
            // FK already exists
        }
    }
}
