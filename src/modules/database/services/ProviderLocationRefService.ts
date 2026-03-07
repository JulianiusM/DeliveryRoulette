import {AppDataSource} from '../dataSource';
import {ProviderLocationRef} from '../entities/provider/ProviderLocationRef';
import {ProviderLocationResolution} from '../../../providers/ProviderTypes';

export async function getById(id: string): Promise<ProviderLocationRef | null> {
    const repo = AppDataSource.getRepository(ProviderLocationRef);
    return await repo.findOne({where: {id}});
}

export async function getBySourceLocation(
    sourceLocationId: string,
    providerKey: string,
): Promise<ProviderLocationRef | null> {
    const repo = AppDataSource.getRepository(ProviderLocationRef);
    return await repo.findOne({
        where: {
            sourceLocationId,
            providerKey,
        },
    });
}

export async function upsertResolvedLocation(
    sourceLocationId: string,
    resolution: ProviderLocationResolution,
): Promise<ProviderLocationRef> {
    const repo = AppDataSource.getRepository(ProviderLocationRef);
    let ref = await repo.findOne({
        where: {
            sourceLocationId,
            providerKey: resolution.providerKey,
        },
    });

    if (!ref) {
        ref = repo.create({
            sourceLocationId,
            providerKey: resolution.providerKey,
        });
    }

    ref.providerAreaId = resolution.providerAreaId ?? null;
    ref.providerLocationSlug = resolution.providerLocationSlug ?? null;
    ref.latitude = resolution.latitude ?? null;
    ref.longitude = resolution.longitude ?? null;
    ref.status = resolution.status;
    ref.rawResolutionJson = resolution.rawResolutionJson ?? null;
    ref.lastResolvedAt = new Date();
    ref.expiresAt = resolution.expiresAt ?? null;
    ref.updatedAt = new Date();

    return await repo.save(ref);
}
