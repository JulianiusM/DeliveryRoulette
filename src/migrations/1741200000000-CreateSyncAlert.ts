import {MigrationInterface, QueryRunner, Table, TableForeignKey} from "typeorm";

export class CreateSyncAlert1741200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "sync_alerts",
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
                        name: "provider_key",
                        type: "varchar",
                        length: "100",
                    },
                    {
                        name: "type",
                        type: "varchar",
                        length: "50",
                    },
                    {
                        name: "message",
                        type: "text",
                    },
                    {
                        name: "dismissed",
                        type: "tinyint",
                        width: 1,
                        default: 0,
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

        await queryRunner.createForeignKey(
            "sync_alerts",
            new TableForeignKey({
                columnNames: ["restaurant_id"],
                referencedTableName: "restaurants",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("sync_alerts", true);
    }
}
