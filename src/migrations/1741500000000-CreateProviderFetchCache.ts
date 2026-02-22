import {MigrationInterface, QueryRunner, Table, TableIndex} from "typeorm";

export class CreateProviderFetchCache1741500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "provider_fetch_cache",
                columns: [
                    {name: "id", type: "varchar", length: "36", isPrimary: true, isGenerated: true, generationStrategy: "uuid"},
                    {name: "provider_key", type: "varchar", length: "100", isNullable: false},
                    {name: "cache_key", type: "varchar", length: "64", isNullable: false},
                    {name: "url", type: "text", isNullable: false},
                    {name: "status_code", type: "int", isNullable: false},
                    {name: "fetched_at", type: "timestamp", isNullable: false},
                    {name: "expires_at", type: "timestamp", isNullable: false},
                    {name: "body", type: "longtext", isNullable: true},
                ],
            }),
            true,
        );

        await queryRunner.createIndex(
            "provider_fetch_cache",
            new TableIndex({
                name: "IDX_provider_fetch_cache_key",
                columnNames: ["provider_key", "cache_key"],
                isUnique: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("provider_fetch_cache");
    }
}
