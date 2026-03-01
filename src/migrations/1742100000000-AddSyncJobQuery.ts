import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddSyncJobQuery1742100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('sync_jobs', 'sync_query')) {
            return;
        }

        await queryRunner.addColumn('sync_jobs', new TableColumn({
            name: 'sync_query',
            type: 'text',
            isNullable: true,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('sync_jobs', 'sync_query'))) {
            return;
        }

        await queryRunner.dropColumn('sync_jobs', 'sync_query');
    }
}
