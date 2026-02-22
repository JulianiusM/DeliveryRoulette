import {MigrationInterface, QueryRunner} from 'typeorm';

export class AddForeignKeyIndexes1741600000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Note: columns backing FK constraints already have implicit indexes in MariaDB.
        // These explicit indexes cover FK columns that benefit from explicit indexing
        // because they are heavily queried in WHERE clauses and JOINs.
        await queryRunner.query(`CREATE INDEX IDX_diet_inference_results_restaurant_id ON diet_inference_results (restaurant_id)`);
        await queryRunner.query(`CREATE INDEX IDX_user_diet_preferences_user_id ON user_diet_preferences (user_id)`);
        await queryRunner.query(`CREATE INDEX IDX_user_restaurant_preferences_user_id ON user_restaurant_preferences (user_id)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IDX_user_restaurant_preferences_user_id ON user_restaurant_preferences`);
        await queryRunner.query(`DROP INDEX IDX_user_diet_preferences_user_id ON user_diet_preferences`);
        await queryRunner.query(`DROP INDEX IDX_diet_inference_results_restaurant_id ON diet_inference_results`);
    }
}
