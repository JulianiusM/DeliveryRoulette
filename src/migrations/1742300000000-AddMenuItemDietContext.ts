import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddMenuItemDietContext1742300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('menu_items', 'diet_context')) {
            return;
        }

        await queryRunner.addColumn(
            'menu_items',
            new TableColumn({
                name: 'diet_context',
                type: 'text',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('menu_items', 'diet_context'))) {
            return;
        }
        await queryRunner.dropColumn('menu_items', 'diet_context');
    }
}
