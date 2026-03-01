import {MigrationInterface, QueryRunner} from 'typeorm';
import {DEFAULT_DIET_TAGS} from '../modules/database/services/DietTagService';

export class SeedDefaultDietTags1742000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const tag of DEFAULT_DIET_TAGS) {
            await queryRunner.query(
                `
                    INSERT INTO diet_tags (\`key\`, label)
                    VALUES (?, ?)
                    ON DUPLICATE KEY UPDATE
                        label = VALUES(label),
                        updated_at = CURRENT_TIMESTAMP
                `,
                [tag.key, tag.label],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const keys = DEFAULT_DIET_TAGS.map((tag) => tag.key);
        if (keys.length === 0) {
            return;
        }

        const placeholders = keys.map(() => '?').join(', ');
        await queryRunner.query(
            `DELETE FROM diet_tags WHERE \`key\` IN (${placeholders})`,
            keys,
        );
    }
}
