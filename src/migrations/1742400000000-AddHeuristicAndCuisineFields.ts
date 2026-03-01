import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddHeuristicAndCuisineFields1742400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('menu_items', 'allergens'))) {
            await queryRunner.addColumn(
                'menu_items',
                new TableColumn({
                    name: 'allergens',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }

        if (!(await queryRunner.hasColumn('restaurants', 'provider_cuisines_json'))) {
            await queryRunner.addColumn(
                'restaurants',
                new TableColumn({
                    name: 'provider_cuisines_json',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }

        if (!(await queryRunner.hasColumn('restaurants', 'cuisine_inference_json'))) {
            await queryRunner.addColumn(
                'restaurants',
                new TableColumn({
                    name: 'cuisine_inference_json',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }

        if (!(await queryRunner.hasColumn('diet_tags', 'keyword_whitelist_json'))) {
            await queryRunner.addColumn(
                'diet_tags',
                new TableColumn({
                    name: 'keyword_whitelist_json',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }

        if (!(await queryRunner.hasColumn('diet_tags', 'dish_whitelist_json'))) {
            await queryRunner.addColumn(
                'diet_tags',
                new TableColumn({
                    name: 'dish_whitelist_json',
                    type: 'text',
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('diet_tags', 'dish_whitelist_json')) {
            await queryRunner.dropColumn('diet_tags', 'dish_whitelist_json');
        }

        if (await queryRunner.hasColumn('diet_tags', 'keyword_whitelist_json')) {
            await queryRunner.dropColumn('diet_tags', 'keyword_whitelist_json');
        }

        if (await queryRunner.hasColumn('restaurants', 'cuisine_inference_json')) {
            await queryRunner.dropColumn('restaurants', 'cuisine_inference_json');
        }

        if (await queryRunner.hasColumn('restaurants', 'provider_cuisines_json')) {
            await queryRunner.dropColumn('restaurants', 'provider_cuisines_json');
        }

        if (await queryRunner.hasColumn('menu_items', 'allergens')) {
            await queryRunner.dropColumn('menu_items', 'allergens');
        }
    }
}
