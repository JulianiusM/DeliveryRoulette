import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateUserRestaurantPreference1741000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_restaurant_preferences",
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
                        name: "restaurant_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "is_favorite",
                        type: "tinyint",
                        width: 1,
                        default: 0,
                    },
                    {
                        name: "do_not_suggest",
                        type: "tinyint",
                        width: 1,
                        default: 0,
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
                        columnNames: ["user_id"],
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                    {
                        columnNames: ["restaurant_id"],
                        referencedTableName: "restaurants",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    },
                ],
                uniques: [
                    {
                        name: "UQ_user_restaurant_preference_user_restaurant",
                        columnNames: ["user_id", "restaurant_id"],
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("user_restaurant_preferences", true);
    }
}
