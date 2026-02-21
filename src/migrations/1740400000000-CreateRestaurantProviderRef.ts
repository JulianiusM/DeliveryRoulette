import {MigrationInterface, QueryRunner, Table, TableIndex} from "typeorm";

export class CreateRestaurantProviderRef1740400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "restaurant_provider_refs",
                columns: [
                    {
                        name: "id",
                        type: "varchar",
                        length: "36",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "uuid",
                    },
                    {
                        name: "restaurant_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "provider_key",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "external_id",
                        type: "varchar",
                        length: "255",
                        isNullable: true,
                    },
                    {
                        name: "url",
                        type: "varchar",
                        length: "500",
                    },
                    {
                        name: "last_sync_at",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50",
                        default: "'active'",
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

        // Unique constraint on (provider_key, external_id) when external_id is present.
        // MariaDB does not support partial unique indexes, but a unique index on
        // (provider_key, external_id) still satisfies the requirement because NULL
        // values are treated as distinct, so multiple rows with the same provider_key
        // and NULL external_id are allowed.
        await queryRunner.createIndex(
            "restaurant_provider_refs",
            new TableIndex({
                name: "UQ_provider_external_id",
                columnNames: ["provider_key", "external_id"],
                isUnique: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("restaurant_provider_refs", true);
    }
}
