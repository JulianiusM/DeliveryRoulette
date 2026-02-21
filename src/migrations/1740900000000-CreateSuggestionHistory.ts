import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateSuggestionHistory1740900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "suggestion_history",
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
                        name: "user_id",
                        type: "int",
                        isNullable: true,
                    },
                    {
                        name: "suggested_at",
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
                    {
                        columnNames: ["user_id"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "SET NULL",
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("suggestion_history", true);
    }
}
