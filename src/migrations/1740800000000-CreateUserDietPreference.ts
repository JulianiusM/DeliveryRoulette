import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateUserDietPreference1740800000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_diet_preferences",
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
                        name: "user_id",
                        type: "int",
                    },
                    {
                        name: "diet_tag_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ["user_id"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                    {
                        columnNames: ["diet_tag_id"],
                        referencedTableName: "diet_tags",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
                uniques: [
                    {
                        name: "UQ_user_diet_preference_user_tag",
                        columnNames: ["user_id", "diet_tag_id"],
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("user_diet_preferences", true);
    }
}
