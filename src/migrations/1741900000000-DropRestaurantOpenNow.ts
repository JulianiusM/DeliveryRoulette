import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class DropRestaurantOpenNow1741900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('restaurants', 'is_open_now')) {
            await queryRunner.dropColumn('restaurants', 'is_open_now');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('restaurants', 'is_open_now'))) {
            await queryRunner.addColumn('restaurants', new TableColumn({
                name: 'is_open_now',
                type: 'tinyint',
                width: 1,
                isNullable: true,
            }));
        }
    }
}
