import {MigrationInterface, QueryRunner, Table, TableForeignKey} from "typeorm";

export class CreateUserPreference1740300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_preferences",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "user_id",
                        type: "int",
                        isUnique: true,
                    },
                    {
                        name: "delivery_area",
                        type: "varchar",
                        length: "150",
                        default: "''",
                    },
                    {
                        name: "cuisine_includes",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "cuisine_excludes",
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
            }),
            true
        );

        await queryRunner.createForeignKey(
            "user_preferences",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("user_preferences");
        if (table) {
            const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf("user_id") !== -1);
            if (foreignKey) {
                await queryRunner.dropForeignKey("user_preferences", foreignKey);
            }
        }
        await queryRunner.dropTable("user_preferences");
    }
}
