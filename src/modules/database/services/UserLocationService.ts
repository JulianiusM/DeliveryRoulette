import {AppDataSource} from '../dataSource';
import {UserLocation} from '../entities/user/UserLocation';
import {Repository} from 'typeorm';

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

export interface UpsertUserLocationOptions {
    makeDefault?: boolean;
}

export interface DeleteUserLocationResult {
    deleted: boolean;
    newDefaultLocation: UserLocation | null;
    remainingLocations: UserLocation[];
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
    return await upsertLocationForUser(userId, data, {makeDefault: true});
}

export async function upsertLocationForUser(
    userId: number,
    data: UpsertDefaultUserLocationInput,
    options: UpsertUserLocationOptions = {},
): Promise<UserLocation> {
    return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(UserLocation);
        const normalizedId = normalizeOptionalText(data.id);
        const userLocations = await repo.find({
            where: {userId},
            order: {
                isDefault: 'DESC',
                updatedAt: 'DESC',
                createdAt: 'DESC',
            },
        });

        let target = normalizedId
            ? await repo.findOne({where: {id: normalizedId, userId}})
            : null;

        if (!target) {
            target = repo.create({userId});
        }

        const hasStoredLocations = userLocations.some((location) => location.id !== target.id);
        const shouldMakeDefault = options.makeDefault === true || (!hasStoredLocations && !normalizedId);

        if (shouldMakeDefault) {
            await unsetOtherDefaults(repo, userId, target.id);
            target.isDefault = true;
        } else if (!target.id) {
            target.isDefault = false;
        }

        applyLocationDraft(target, data);
        return await repo.save(target);
    });
}

export async function setDefaultLocationForUser(userId: number, id: string): Promise<UserLocation | null> {
    return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(UserLocation);
        const target = await repo.findOne({where: {id, userId}});
        if (!target) {
            return null;
        }

        await unsetOtherDefaults(repo, userId, target.id);
        target.isDefault = true;
        target.updatedAt = new Date();
        return await repo.save(target);
    });
}

export async function deleteLocationForUser(userId: number, id: string): Promise<DeleteUserLocationResult> {
    return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(UserLocation);
        const target = await repo.findOne({where: {id, userId}});
        if (!target) {
            const remaining = await repo.find({
                where: {userId},
                order: {
                    isDefault: 'DESC',
                    updatedAt: 'DESC',
                    createdAt: 'DESC',
                },
            });
            return {
                deleted: false,
                newDefaultLocation: remaining.find((location) => location.isDefault) ?? remaining[0] ?? null,
                remainingLocations: remaining,
            };
        }

        const wasDefault = Boolean(target.isDefault);
        await repo.remove(target);

        let remaining = await repo.find({
            where: {userId},
            order: {
                isDefault: 'DESC',
                updatedAt: 'DESC',
                createdAt: 'DESC',
            },
        });

        let newDefaultLocation = remaining.find((location) => location.isDefault) ?? null;
        if (wasDefault && !newDefaultLocation && remaining.length > 0) {
            newDefaultLocation = remaining[0];
            newDefaultLocation.isDefault = true;
            newDefaultLocation.updatedAt = new Date();
            await repo.save(newDefaultLocation);
            remaining = await repo.find({
                where: {userId},
                order: {
                    isDefault: 'DESC',
                    updatedAt: 'DESC',
                    createdAt: 'DESC',
                },
            });
        }

        return {
            deleted: true,
            newDefaultLocation,
            remainingLocations: remaining,
        };
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

async function unsetOtherDefaults(
    repo: Repository<UserLocation>,
    userId: number,
    keepId?: string,
): Promise<void> {
    const currentDefaults = await repo.find({where: {userId, isDefault: true}});
    for (const location of currentDefaults) {
        if (keepId && location.id === keepId) {
            continue;
        }
        location.isDefault = false;
        location.updatedAt = new Date();
        await repo.save(location);
    }
}

function applyLocationDraft(target: UserLocation, data: UpsertDefaultUserLocationInput): void {
    target.label = data.label;
    target.addressLine1 = normalizeNullableText(data.addressLine1);
    target.addressLine2 = normalizeNullableText(data.addressLine2);
    target.city = normalizeNullableText(data.city);
    target.postalCode = normalizeNullableText(data.postalCode);
    target.country = normalizeNullableText(data.country);
    target.latitude = normalizeNullableNumber(data.latitude);
    target.longitude = normalizeNullableNumber(data.longitude);
    target.updatedAt = new Date();
    if (!target.lastUsedAt) {
        target.lastUsedAt = new Date();
    }
}
