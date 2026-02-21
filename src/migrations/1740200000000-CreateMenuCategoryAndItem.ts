import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateMenuCategoryAndItem1740200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "menu_categories",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "(UUID())",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "150",
                    },
                    {
                        name: "sort_order",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "is_active",
                        type: "tinyint",
                        width: 1,
                        default: 1,
                    },
                    {
                        name: "restaurant_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["restaurant_id"],
                        referencedTableName: "restaurants",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
            }),
            true,
        );

        await queryRunner.createTable(
            new Table({
                name: "menu_items",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "(UUID())",
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "150",
                    },
                    {
                        name: "description",
                        type: "varchar",
                        length: "500",
                        isNullable: true,
                    },
                    {
                        name: "price",
                        type: "decimal",
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: "currency",
                        type: "varchar",
                        length: "3",
                        isNullable: true,
                    },
                    {
                        name: "sort_order",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "is_active",
                        type: "tinyint",
                        width: 1,
                        default: 1,
                    },
                    {
                        name: "category_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["category_id"],
                        referencedTableName: "menu_categories",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("menu_items", true);
        await queryRunner.dropTable("menu_categories", true);
    }
}
