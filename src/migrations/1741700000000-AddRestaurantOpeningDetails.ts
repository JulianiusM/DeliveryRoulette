import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddRestaurantOpeningDetails1741700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnsToAdd: TableColumn[] = [];

        if (!(await queryRunner.hasColumn('restaurants', 'opening_hours'))) {
            columnsToAdd.push(new TableColumn({
                name: 'opening_hours',
                type: 'text',
                isNullable: true,
            }));
        }

        if (!(await queryRunner.hasColumn('restaurants', 'opening_days'))) {
            columnsToAdd.push(new TableColumn({
                name: 'opening_days',
                type: 'varchar',
                length: '255',
                isNullable: true,
            }));
        }

        if (columnsToAdd.length > 0) {
            await queryRunner.addColumns('restaurants', columnsToAdd);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('restaurants', 'opening_days')) {
            await queryRunner.dropColumn('restaurants', 'opening_days');
        }
        if (await queryRunner.hasColumn('restaurants', 'opening_hours')) {
            await queryRunner.dropColumn('restaurants', 'opening_hours');
        }
    }
}
