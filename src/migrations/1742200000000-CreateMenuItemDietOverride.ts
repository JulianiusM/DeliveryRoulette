import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateMenuItemDietOverride1742200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "menu_item_diet_overrides",
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
                        name: "menu_item_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "diet_tag_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "supported",
                        type: "tinyint",
                        width: 1,
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
                uniques: [
                    {
                        name: "UQ_menu_item_diet_override_item_tag",
                        columnNames: ["menu_item_id", "diet_tag_id"],
                    },
                ],
                foreignKeys: [
                    {
                        name: "FK_menu_item_diet_override_item",
                        columnNames: ["menu_item_id"],
                        referencedTableName: "menu_items",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                    {
                        name: "FK_menu_item_diet_override_diet_tag",
                        columnNames: ["diet_tag_id"],
                        referencedTableName: "diet_tags",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("menu_item_diet_overrides", true);
    }
}
