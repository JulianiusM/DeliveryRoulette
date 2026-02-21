import 'reflect-metadata';
import {DataSource} from 'typeorm';
import {DietTag} from '../src/modules/database/entities/diet/DietTag';
import {entities, migrations, subscribers} from '../src/modules/database/__index__';

/**
 * Default diet tags to seed.
 * Each entry has a unique key and a human-readable label.
 */
export const DEFAULT_DIET_TAGS: { key: string; label: string }[] = [
    {key: 'VEGAN', label: 'Vegan'},
    {key: 'VEGETARIAN', label: 'Vegetarian'},
    {key: 'GLUTEN_FREE', label: 'Gluten-free'},
    {key: 'LACTOSE_FREE', label: 'Lactose-free'},
    {key: 'HALAL', label: 'Halal'},
];

/**
 * Idempotent seed: inserts only tags whose key does not already exist.
 * Safe to run multiple times – never duplicates rows.
 */
export async function seedDietTags(dataSource: DataSource): Promise<number> {
    const repo = dataSource.getRepository(DietTag);

    let inserted = 0;
    for (const tag of DEFAULT_DIET_TAGS) {
        const exists = await repo.findOne({where: {key: tag.key}});
        if (!exists) {
            await repo.save(repo.create(tag));
            inserted++;
        }
    }

    return inserted;
}

/* ---- CLI entry-point ---- */
async function main(): Promise<void> {
    const ds = new DataSource({
        type: (process.env.DB_TYPE as 'mariadb' | 'mysql') || 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'test',
        entities: entities,
        migrations: migrations,
        subscribers: subscribers,
        synchronize: false,
    });

    await ds.initialize();

    try {
        const count = await seedDietTags(ds);
        console.log(`Diet-tag seed complete – ${count} new tag(s) inserted.`);
    } finally {
        await ds.destroy();
    }
}

/* Run only when executed directly (not imported) */
if (require.main === module) {
    main().catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
    });
}
