import {MigrationInterface, QueryRunner, TableColumn} from 'typeorm';

export class AddUserRole1743000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('users', 'role')) {
            return;
        }

        await queryRunner.addColumn('users', new TableColumn({
            name: 'role',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'user'",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasColumn('users', 'role')) {
            await queryRunner.dropColumn('users', 'role');
        }
    }
}
