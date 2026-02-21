import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique} from "typeorm";

export class CreateDietManualOverride1740700000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "diet_manual_overrides",
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
                        name: "restaurant_id",
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
                        name: "user_id",
                        type: "int",
                    },
                    {
                        name: "notes",
                        type: "text",
                        isNullable: true,
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
                    new TableUnique({
                        name: "UQ_diet_override_restaurant_tag",
                        columnNames: ["restaurant_id", "diet_tag_id"],
                    }),
                ],
                foreignKeys: [
                    new TableForeignKey({
                        name: "FK_diet_override_restaurant",
                        columnNames: ["restaurant_id"],
                        referencedTableName: "restaurants",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    }),
                    new TableForeignKey({
                        name: "FK_diet_override_diet_tag",
                        columnNames: ["diet_tag_id"],
                        referencedTableName: "diet_tags",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    }),
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("diet_manual_overrides");
    }
}
