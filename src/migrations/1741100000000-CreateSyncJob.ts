import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateSyncJob1741100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "sync_jobs",
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
                        isNullable: true,
                    },
                    {
                        name: "status",
                        type: "varchar",
                        length: "50",
                        default: "'pending'",
                    },
                    {
                        name: "restaurants_synced",
                        type: "int",
                        default: 0,
                    },
                    {
                        name: "error_message",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "started_at",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "finished_at",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("sync_jobs", true);
    }
}
