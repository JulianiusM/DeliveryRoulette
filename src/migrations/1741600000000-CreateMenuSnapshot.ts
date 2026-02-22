import {MigrationInterface, QueryRunner, Table, TableForeignKey} from "typeorm";

export class CreateMenuSnapshot1741600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "menu_snapshots",
                columns: [
                    {name: "id", type: "varchar", length: "36", isPrimary: true, isGenerated: true, generationStrategy: "uuid"},
                    {name: "restaurant_id", type: "varchar", length: "36", isNullable: false},
                    {name: "provider_key", type: "varchar", length: "100", isNullable: false},
                    {name: "source_url", type: "text", isNullable: false},
                    {name: "fetched_at", type: "timestamp", isNullable: false},
                    {name: "raw_html", type: "longtext", isNullable: true},
                    {name: "raw_text", type: "longtext", isNullable: false},
                    {name: "parse_ok", type: "tinyint", width: 1, default: 0},
                    {name: "parse_warnings_json", type: "text", isNullable: true},
                ],
            }),
            true,
        );

        await queryRunner.createForeignKey(
            "menu_snapshots",
            new TableForeignKey({
                columnNames: ["restaurant_id"],
                referencedTableName: "restaurants",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("menu_snapshots");
    }
}
