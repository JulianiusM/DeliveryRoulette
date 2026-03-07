import {AppDataSource} from '../dataSource';
import {UserLocation} from '../entities/user/UserLocation';

export async function listByUserId(userId: number): Promise<UserLocation[]> {
    const repo = AppDataSource.getRepository(UserLocation);
    return await repo.find({
        where: {userId},
        order: {
            isDefault: 'DESC',
            updatedAt: 'DESC',
            createdAt: 'DESC',
        },
    });
}

export async function getDefaultByUserId(userId: number): Promise<UserLocation | null> {
    const repo = AppDataSource.getRepository(UserLocation);
    const explicitDefault = await repo.findOne({
        where: {userId, isDefault: true},
        order: {
            updatedAt: 'DESC',
            createdAt: 'DESC',
        },
    });
    if (explicitDefault) {
        return explicitDefault;
    }

    return await repo.findOne({
        where: {userId},
        order: {
            lastUsedAt: 'DESC',
            updatedAt: 'DESC',
            createdAt: 'DESC',
        },
    });
}

export async function getByIdForUser(userId: number, id: string): Promise<UserLocation | null> {
    const repo = AppDataSource.getRepository(UserLocation);
    return await repo.findOne({where: {id, userId}});
}

export async function getOrBackfillDefaultFromDeliveryArea(
    userId: number,
    deliveryArea?: string | null,
): Promise<UserLocation | null> {
    const existing = await getDefaultByUserId(userId);
    if (existing) {
        return existing;
    }

    const legacyLabel = deliveryArea?.trim();
    if (!legacyLabel) {
        return null;
    }

    return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(UserLocation);
        const current = await repo.findOne({
            where: {userId, isDefault: true},
            order: {updatedAt: 'DESC'},
        });
        if (current) {
            return current;
        }

        const created = repo.create({
            userId,
            label: legacyLabel,
            isDefault: true,
            lastUsedAt: new Date(),
        });
        return await repo.save(created);
    });
}

export async function touchLocation(id: string): Promise<void> {
    const repo = AppDataSource.getRepository(UserLocation);
    const location = await repo.findOne({where: {id}});
    if (!location) {
        return;
    }

    location.lastUsedAt = new Date();
    location.updatedAt = new Date();
    await repo.save(location);
}
