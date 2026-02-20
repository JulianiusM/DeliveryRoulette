import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateRestaurant1740100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "restaurants",
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
                        name: "address_line1",
                        type: "varchar",
                        length: "255",
                    },
                    {
                        name: "address_line2",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "city",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "postal_code",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "country",
                        type: "varchar",
                        length: "100",
                        default: "''",
                    },
                    {
                        name: "is_active",
                        type: "tinyint",
                        width: 1,
                        default: 1,
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
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("restaurants");
    }
}
