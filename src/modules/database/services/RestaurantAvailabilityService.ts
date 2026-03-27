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

export interface LocationAvailabilityStats {
    providerLocationCount: number;
    coverageCount: number;
    latestSnapshotCount: number;
    freshSnapshotCount: number;
    expiredSnapshotCount: number;
    availableRestaurantCount: number;
    unavailableRestaurantCount: number;
}

interface LatestLocationSnapshotRow {
    coverageId: string;
    restaurantId: string;
    isAvailable: boolean | number | string | null;
    isTemporaryOffline: boolean | number | string | null;
    expiresAt: Date | string | null;
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
    const rows = await listLatestLocationSnapshotRows(sourceLocationId, serviceType);
    const freshRestaurantIds = new Set<string>();
    const staleRestaurantIds = new Set<string>();
    let freshSnapshotCount = 0;

    for (const row of rows) {
        if (!toBooleanFlag(row.isAvailable) || toBooleanFlag(row.isTemporaryOffline)) {
            if (isFreshSnapshot(row.expiresAt, asOf)) {
                freshSnapshotCount++;
            }
            continue;
        }

        if (isFreshSnapshot(row.expiresAt, asOf)) {
            freshSnapshotCount++;
            freshRestaurantIds.add(row.restaurantId);
            continue;
        }

        staleRestaurantIds.add(row.restaurantId);
    }

    if (freshSnapshotCount > 0) {
        return [...freshRestaurantIds];
    }

    return [...staleRestaurantIds];
}

export async function getLocationAvailabilityStats(
    sourceLocationId: string,
    serviceType: ProviderServiceType,
    asOf: Date = new Date(),
): Promise<LocationAvailabilityStats> {
    const locationRepo = AppDataSource.getRepository(ProviderLocationRef);
    const coverageRepo = AppDataSource.getRepository(RestaurantProviderCoverage);
    const [providerLocationCount, coverageCount, rows] = await Promise.all([
        locationRepo.count({
            where: {sourceLocationId},
        }),
        coverageRepo.createQueryBuilder('coverage')
            .innerJoin(ProviderLocationRef, 'location_ref', 'location_ref.id = coverage.providerLocationRefId')
            .where('location_ref.sourceLocationId = :sourceLocationId', {sourceLocationId})
            .andWhere('coverage.status = :coverageStatus', {coverageStatus: 'active'})
            .getCount(),
        listLatestLocationSnapshotRows(sourceLocationId, serviceType),
    ]);

    const availableRestaurantIds = new Set<string>();
    const unavailableRestaurantIds = new Set<string>();
    let freshSnapshotCount = 0;
    let expiredSnapshotCount = 0;

    for (const row of rows) {
        if (!isFreshSnapshot(row.expiresAt, asOf)) {
            expiredSnapshotCount++;
            continue;
        }

        freshSnapshotCount++;
        if (toBooleanFlag(row.isAvailable) && !toBooleanFlag(row.isTemporaryOffline)) {
            availableRestaurantIds.add(row.restaurantId);
        } else {
            unavailableRestaurantIds.add(row.restaurantId);
        }
    }

    return {
        providerLocationCount,
        coverageCount,
        latestSnapshotCount: rows.length,
        freshSnapshotCount,
        expiredSnapshotCount,
        availableRestaurantCount: availableRestaurantIds.size,
        unavailableRestaurantCount: unavailableRestaurantIds.size,
    };
}

async function listLatestLocationSnapshotRows(
    sourceLocationId: string,
    serviceType: ProviderServiceType,
): Promise<LatestLocationSnapshotRow[]> {
    const snapshotRepo = AppDataSource.getRepository(RestaurantProviderServiceSnapshot);
    const latestSnapshotQb = snapshotRepo.createQueryBuilder('latest')
        .select('latest.coverageId', 'coverage_id')
        .addSelect('latest.serviceType', 'service_type')
        .addSelect('MAX(latest.observedAt)', 'observed_at')
        .groupBy('latest.coverageId')
        .addGroupBy('latest.serviceType');

    return await snapshotRepo.createQueryBuilder('snapshot')
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
        .select([
            'coverage.id AS coverageId',
            'coverage.restaurantId AS restaurantId',
            'snapshot.isAvailable AS isAvailable',
            'snapshot.isTemporaryOffline AS isTemporaryOffline',
            'snapshot.expiresAt AS expiresAt',
        ])
        .getRawMany<LatestLocationSnapshotRow>();
}

function toBooleanFlag(value: boolean | number | string | null): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    if (typeof value === 'string') {
        return ['1', 'true', 'yes'].includes(value.toLowerCase());
    }
    return false;
}

function isFreshSnapshot(
    expiresAt: Date | string | null,
    asOf: Date,
): boolean {
    if (!expiresAt) {
        return true;
    }

    const parsed = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
        return false;
    }
    return parsed > asOf;
}
