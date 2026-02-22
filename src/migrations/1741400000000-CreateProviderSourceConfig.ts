import {MigrationInterface, QueryRunner, Table, TableIndex} from "typeorm";

export class CreateProviderSourceConfig1741400000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "provider_source_configs",
                columns: [
                    {name: "id", type: "varchar", length: "36", isPrimary: true, isGenerated: true, generationStrategy: "uuid"},
                    {name: "user_id", type: "varchar", length: "36", isNullable: false},
                    {name: "provider_key", type: "varchar", length: "100", isNullable: false},
                    {name: "listing_url", type: "text", isNullable: false},
                    {name: "is_enabled", type: "tinyint", width: 1, default: 1},
                    {name: "created_at", type: "timestamp", default: "CURRENT_TIMESTAMP"},
                    {name: "updated_at", type: "timestamp", default: "CURRENT_TIMESTAMP"},
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("provider_source_configs");
    }
}
