import {AppDataSource} from '../dataSource';
import {RestaurantProviderCoverage} from '../entities/restaurant/RestaurantProviderCoverage';
import {RestaurantProviderServiceSnapshot} from '../entities/restaurant/RestaurantProviderServiceSnapshot';
import {ProviderLocationRef} from '../entities/provider/ProviderLocationRef';
import {ProviderServiceType} from '../../../providers/ProviderTypes';

export interface UpsertCoverageInput {
    restaurantId: string;
    restaurantProviderRefId: string;
    providerLocationRefId: string;
    status?: string;
    observedAt?: Date;
    sourceUrl?: string | null;
    rawListingJson?: string | null;
}

export interface RecordServiceSnapshotInput {
    coverageId: string;
    serviceType: ProviderServiceType;
    isAvailable: boolean;
    isTemporaryOffline?: boolean;
    isThrottled?: boolean;
    etaMin?: number | null;
    etaMax?: number | null;
    minOrderAmountMinor?: number | null;
    currency?: string | null;
    feeBandsJson?: string | null;
    bagFeeMinor?: number | null;
    serviceFeeMinor?: number | null;
    smallOrderFeeMinor?: number | null;
    observedAt?: Date;
    expiresAt?: Date | null;
    rawPayloadJson?: string | null;
}

export async function upsertCoverageFromListing(
    data: UpsertCoverageInput,
): Promise<RestaurantProviderCoverage> {
    const repo = AppDataSource.getRepository(RestaurantProviderCoverage);
    const observedAt = data.observedAt ?? new Date();
    let coverage = await repo.findOne({
        where: {
            restaurantProviderRefId: data.restaurantProviderRefId,
            providerLocationRefId: data.providerLocationRefId,
        },
    });

    if (!coverage) {
        coverage = repo.create({
            restaurantId: data.restaurantId,
            restaurantProviderRefId: data.restaurantProviderRefId,
            providerLocationRefId: data.providerLocationRefId,
            status: data.status ?? 'active',
            firstSeenAt: observedAt,
            lastSeenAt: observedAt,
            sourceUrl: data.sourceUrl ?? null,
            rawListingJson: data.rawListingJson ?? null,
        });
        return await repo.save(coverage);
    }

    coverage.restaurantId = data.restaurantId;
    coverage.status = data.status ?? coverage.status ?? 'active';
    coverage.lastSeenAt = observedAt;
    coverage.sourceUrl = data.sourceUrl ?? coverage.sourceUrl ?? null;
    coverage.rawListingJson = data.rawListingJson ?? coverage.rawListingJson ?? null;
    coverage.updatedAt = new Date();
    return await repo.save(coverage);
}

export async function recordServiceSnapshot(
    data: RecordServiceSnapshotInput,
): Promise<RestaurantProviderServiceSnapshot> {
    const repo = AppDataSource.getRepository(RestaurantProviderServiceSnapshot);
    const snapshot = repo.create({
        coverageId: data.coverageId,
        serviceType: data.serviceType,
        isAvailable: data.isAvailable,
        isTemporaryOffline: data.isTemporaryOffline ?? false,
        isThrottled: data.isThrottled ?? false,
        etaMin: data.etaMin ?? null,
        etaMax: data.etaMax ?? null,
        minOrderAmountMinor: data.minOrderAmountMinor ?? null,
        currency: data.currency ?? null,
        feeBandsJson: data.feeBandsJson ?? null,
        bagFeeMinor: data.bagFeeMinor ?? null,
        serviceFeeMinor: data.serviceFeeMinor ?? null,
        smallOrderFeeMinor: data.smallOrderFeeMinor ?? null,
        observedAt: data.observedAt ?? new Date(),
        expiresAt: data.expiresAt ?? null,
        rawPayloadJson: data.rawPayloadJson ?? null,
    });
    return await repo.save(snapshot);
}

export async function listAvailableRestaurantIdsForLocation(
    sourceLocationId: string,
    serviceType: ProviderServiceType,
    asOf: Date = new Date(),
): Promise<string[]> {
    const snapshotRepo = AppDataSource.getRepository(RestaurantProviderServiceSnapshot);

    const latestSnapshotQb = snapshotRepo.createQueryBuilder('latest')
        .select('latest.coverageId', 'coverage_id')
        .addSelect('latest.serviceType', 'service_type')
        .addSelect('MAX(latest.observedAt)', 'observed_at')
        .groupBy('latest.coverageId')
        .addGroupBy('latest.serviceType');

    const rows = await snapshotRepo.createQueryBuilder('snapshot')
        .innerJoin(RestaurantProviderCoverage, 'coverage', 'coverage.id = snapshot.coverageId')
        .innerJoin(ProviderLocationRef, 'location_ref', 'location_ref.id = coverage.providerLocationRefId')
        .innerJoin(
            `(${latestSnapshotQb.getQuery()})`,
            'latest_snapshot',
            [
                'latest_snapshot.coverage_id = snapshot.coverageId',
                'latest_snapshot.service_type = snapshot.serviceType',
                'latest_snapshot.observed_at = snapshot.observedAt',
            ].join(' AND '),
        )
        .setParameters(latestSnapshotQb.getParameters())
        .where('location_ref.sourceLocationId = :sourceLocationId', {sourceLocationId})
        .andWhere('coverage.status = :coverageStatus', {coverageStatus: 'active'})
        .andWhere('snapshot.serviceType = :serviceType', {serviceType})
        .andWhere('snapshot.isAvailable = :isAvailable', {isAvailable: 1})
        .andWhere('snapshot.isTemporaryOffline = :isTemporaryOffline', {isTemporaryOffline: 0})
        .andWhere('(snapshot.expiresAt IS NULL OR snapshot.expiresAt > :asOf)', {asOf})
        .select('DISTINCT coverage.restaurantId', 'restaurantId')
        .getRawMany<{restaurantId: string}>();

    return rows.map((row) => row.restaurantId);
}
