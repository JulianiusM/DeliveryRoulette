import {AppDataSource} from '../dataSource';
import {UserLocation} from '../entities/user/UserLocation';

export interface UpsertDefaultUserLocationInput {
    id?: string | null;
    label: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

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

export async function upsertDefaultLocationForUser(
    userId: number,
    data: UpsertDefaultUserLocationInput,
): Promise<UserLocation> {
    return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(UserLocation);
        const normalizedId = normalizeOptionalText(data.id);

        let target = normalizedId
            ? await repo.findOne({where: {id: normalizedId, userId}})
            : null;

        if (!target) {
            target = await repo.findOne({
                where: {userId, isDefault: true},
                order: {
                    updatedAt: 'DESC',
                    createdAt: 'DESC',
                },
            });
        }

        if (!target) {
            target = repo.create({userId});
        }

        const currentDefaults = await repo.find({where: {userId, isDefault: true}});
        for (const location of currentDefaults) {
            if (location.id === target.id) {
                continue;
            }
            location.isDefault = false;
            location.updatedAt = new Date();
            await repo.save(location);
        }

        target.label = data.label;
        target.addressLine1 = normalizeNullableText(data.addressLine1);
        target.addressLine2 = normalizeNullableText(data.addressLine2);
        target.city = normalizeNullableText(data.city);
        target.postalCode = normalizeNullableText(data.postalCode);
        target.country = normalizeNullableText(data.country);
        target.latitude = normalizeNullableNumber(data.latitude);
        target.longitude = normalizeNullableNumber(data.longitude);
        target.isDefault = true;
        target.updatedAt = new Date();
        if (!target.lastUsedAt) {
            target.lastUsedAt = new Date();
        }

        return await repo.save(target);
    });
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

function normalizeOptionalText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}

function normalizeNullableText(value?: string | null): string | null {
    return normalizeOptionalText(value);
}

function normalizeNullableNumber(value?: number | null): number | null {
    return Number.isFinite(value) ? Number(value) : null;
}
