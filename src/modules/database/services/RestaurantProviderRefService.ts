import {AppDataSource} from '../dataSource';
import {RestaurantProviderRef} from '../entities/restaurant/RestaurantProviderRef';

export interface ProviderRefUpsertInput {
    restaurantId: string;
    providerKey: string;
    externalId?: string | null;
    providerNativeId?: string | null;
    providerIdentityJson?: string | null;
    url: string;
}

export async function listByRestaurant(restaurantId: string): Promise<RestaurantProviderRef[]> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.find({
        where: {restaurantId},
        order: {providerKey: 'ASC', createdAt: 'ASC'},
    });
}

export async function getById(id: string): Promise<RestaurantProviderRef | null> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.findOne({where: {id}});
}

export async function getByIdForRestaurant(
    id: string,
    restaurantId: string,
): Promise<RestaurantProviderRef | null> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await repo.findOne({where: {id, restaurantId}});
}

export async function getByProviderIdentity(
    providerKey: string,
    identity: {
        externalId?: string | null;
        providerNativeId?: string | null;
    },
): Promise<RestaurantProviderRef | null> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    return await findByIdentity(repo, providerKey, {
        externalId: normalizeIdentity(identity.externalId),
        providerNativeId: normalizeIdentity(identity.providerNativeId),
    });
}

export async function addProviderRef(data: ProviderRefUpsertInput): Promise<RestaurantProviderRef> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    const ref = repo.create({
        restaurantId: data.restaurantId,
        providerKey: data.providerKey,
        externalId: data.externalId || null,
        providerNativeId: data.providerNativeId || null,
        providerIdentityJson: data.providerIdentityJson || null,
        url: data.url,
        status: 'active',
    });
    return await repo.save(ref);
}

export async function removeProviderRef(id: string, restaurantId: string): Promise<boolean> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    const ref = await repo.findOne({where: {id, restaurantId}});
    if (!ref) return false;
    await repo.remove(ref);
    return true;
}

/**
 * Ensure a provider ref exists for the given provider identity.
 * Updates an existing row when it already exists for the same provider identity
 * or for the same restaurant/provider combination.
 */
export async function ensureProviderRef(data: ProviderRefUpsertInput): Promise<RestaurantProviderRef> {
    const repo = AppDataSource.getRepository(RestaurantProviderRef);
    const externalId = normalizeIdentity(data.externalId);
    const providerNativeId = normalizeIdentity(data.providerNativeId);

    let ref = await findByIdentity(repo, data.providerKey, {
        externalId,
        providerNativeId,
    });

    if (ref && ref.restaurantId !== data.restaurantId) {
        throw new Error(
            `Provider identity ${data.providerKey}:${externalId ?? providerNativeId ?? data.url} is already linked to another restaurant`,
        );
    }

    if (!ref && !externalId && !providerNativeId) {
        ref = await repo.findOne({
            where: {
                restaurantId: data.restaurantId,
                providerKey: data.providerKey,
            },
            order: {
                createdAt: 'ASC',
            },
        });
    }

    if (!ref) {
        return await addProviderRef({
            ...data,
            externalId,
            providerNativeId,
        });
    }

    ref.externalId = externalId ?? ref.externalId ?? null;
    ref.providerNativeId = providerNativeId ?? ref.providerNativeId ?? null;
    ref.providerIdentityJson = data.providerIdentityJson ?? ref.providerIdentityJson ?? null;
    ref.url = data.url || ref.url;
    ref.status = 'active';
    ref.updatedAt = new Date();
    return await repo.save(ref);
}

async function findByIdentity(
    repo: import('typeorm').Repository<RestaurantProviderRef>,
    providerKey: string,
    identity: {
        externalId?: string | null;
        providerNativeId?: string | null;
    },
): Promise<RestaurantProviderRef | null> {
    if (identity.externalId) {
        const byExternalId = await repo.findOne({
            where: {
                providerKey,
                externalId: identity.externalId,
            },
        });
        if (byExternalId) {
            return byExternalId;
        }
    }

    if (identity.providerNativeId) {
        return await repo.findOne({
            where: {
                providerKey,
                providerNativeId: identity.providerNativeId,
            },
        });
    }

    return null;
}

function normalizeIdentity(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
}
