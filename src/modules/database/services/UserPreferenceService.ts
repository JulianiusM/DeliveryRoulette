import {AppDataSource} from '../dataSource';
import {UserPreference} from '../entities/user/UserPreference';

export async function getByUserId(userId: number): Promise<UserPreference | null> {
    const repo = AppDataSource.getRepository(UserPreference);
    return await repo.findOne({where: {userId}});
}

export async function upsert(userId: number, data: {
    deliveryArea?: string;
    cuisineIncludes?: string | null;
    cuisineExcludes?: string | null;
}): Promise<UserPreference> {
    const repo = AppDataSource.getRepository(UserPreference);
    let pref = await repo.findOne({where: {userId}});

    if (!pref) {
        pref = repo.create({userId});
    }

    if (data.deliveryArea !== undefined) pref.deliveryArea = data.deliveryArea;
    if (data.cuisineIncludes !== undefined) pref.cuisineIncludes = data.cuisineIncludes;
    if (data.cuisineExcludes !== undefined) pref.cuisineExcludes = data.cuisineExcludes;
    pref.updatedAt = new Date();

    return await repo.save(pref);
}
