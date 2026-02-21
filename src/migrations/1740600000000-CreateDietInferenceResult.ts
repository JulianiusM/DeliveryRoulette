import {MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique} from "typeorm";

export class CreateDietInferenceResult1740600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "diet_inference_results",
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
                        name: "diet_tag_id",
                        type: "varchar",
                        length: "36",
                    },
                    {
                        name: "score",
                        type: "int",
                    },
                    {
                        name: "confidence",
                        type: "varchar",
                        length: "10",
                    },
                    {
                        name: "reasons_json",
                        type: "text",
                    },
                    {
                        name: "engine_version",
                        type: "varchar",
                        length: "20",
                    },
                    {
                        name: "computed_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
                uniques: [
                    new TableUnique({
                        name: "UQ_diet_inference_restaurant_tag_version",
                        columnNames: ["restaurant_id", "diet_tag_id", "engine_version"],
                    }),
                ],
                foreignKeys: [
                    new TableForeignKey({
                        name: "FK_diet_inference_restaurant",
                        columnNames: ["restaurant_id"],
                        referencedTableName: "restaurants",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    }),
                    new TableForeignKey({
                        name: "FK_diet_inference_diet_tag",
                        columnNames: ["diet_tag_id"],
                        referencedTableName: "diet_tags",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE",
                    }),
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("diet_inference_results");
    }
}
