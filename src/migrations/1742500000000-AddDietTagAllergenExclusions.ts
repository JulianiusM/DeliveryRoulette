import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddDietTagAllergenExclusions1742500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('diet_tags');
        if (table && !table.findColumnByName('allergen_exclusions_json')) {
            await queryRunner.addColumn('diet_tags', new TableColumn({
                name: 'allergen_exclusions_json',
                type: 'text',
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('diet_tags');
        if (table && table.findColumnByName('allergen_exclusions_json')) {
            await queryRunner.dropColumn('diet_tags', 'allergen_exclusions_json');
        }
    }
}
