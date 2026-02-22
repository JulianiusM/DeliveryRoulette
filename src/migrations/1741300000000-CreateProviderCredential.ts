import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex} from "typeorm";

export class CreateProviderCredential1741300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "provider_credentials",
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
                        name: "provider_key",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "credential_key",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "encrypted_value",
                        type: "text",
                    },
                    {
                        name: "user_id",
                        type: "int",
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
            true,
        );

        await queryRunner.createIndex(
            "provider_credentials",
            new TableIndex({
                name: "UQ_provider_credential_key_user",
                columnNames: ["provider_key", "credential_key", "user_id"],
                isUnique: true,
            }),
        );

        await queryRunner.createForeignKey(
            "provider_credentials",
            new TableForeignKey({
                name: "FK_provider_credential_user",
                columnNames: ["user_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("provider_credentials", true);
    }
}
