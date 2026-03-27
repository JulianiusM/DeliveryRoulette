import {AppDataSource} from '../database/dataSource';
import {ProviderSourceConfig} from '../database/entities/provider/ProviderSourceConfig';
import * as ConnectorRegistry from '../../providers/ConnectorRegistry';
import {ProviderKey} from '../../providers/ProviderKey';
import {ProviderLocationContext, ProviderServiceType} from '../../providers/ProviderTypes';
import * as userLocationService from '../database/services/UserLocationService';
import * as providerLocationRefService from '../database/services/ProviderLocationRefService';
import * as providerRefService from '../database/services/RestaurantProviderRefService';
import {queueImportFromUrl, queueListingSync, QueuedSyncJob} from './ProviderSyncService';

export interface QueuedLocationImportIssue {
    providerKey: string;
    reason: string;
}

export interface QueuedLocationImportResult {
    queuedJobs: QueuedSyncJob[];
    issues: QueuedLocationImportIssue[];
}

export interface LiveLocationCandidateResult {
    sourceConfigCount: number;
    restaurantIds: string[];
    liveRestaurantCount: number;
    matchedRestaurantCount: number;
    missingRestaurantCount: number;
    queuedImportJobs: QueuedSyncJob[];
    issues: QueuedLocationImportIssue[];
}

export async function queueSavedLocationRefreshes(
    userId: number,
    locationId: string,
): Promise<QueuedLocationImportResult> {
    const location = await userLocationService.getByIdForUser(userId, locationId);
    if (!location) {
        return {
            queuedJobs: [],
            issues: [{providerKey: 'unknown', reason: 'Saved location not found.'}],
        };
    }

    const sourceConfigs = await listEnabledSourceConfigs(userId);

    const queuedJobs: QueuedSyncJob[] = [];
    const issues: QueuedLocationImportIssue[] = [];

    for (const config of sourceConfigs) {
        try {
            const prepared = await prepareLocationAwareSource(config, location);
            if (!prepared) {
                continue;
            }

            if (prepared.issue) {
                issues.push(prepared.issue);
                continue;
            }
            if (!prepared.providerKey || !prepared.connector) {
                issues.push({
                    providerKey: config.providerKey,
                    reason: 'The provider source could not be prepared for location refresh.',
                });
                continue;
            }

            const providerLocationRef = prepared.providerLocationRef;
            if (!providerLocationRef) {
                issues.push({
                    providerKey: config.providerKey,
                    reason: 'The saved location could not be resolved for provider availability.',
                });
                continue;
            }

            const queuedJob = await queueListingSync(
                prepared.providerKey,
                prepared.listingUrl,
                providerLocationRef.id,
            );
            queuedJobs.push(queuedJob);
        } catch (err) {
            issues.push({
                providerKey: config.providerKey,
                reason: err instanceof Error ? err.message : 'The saved location refresh could not be queued.',
            });
        }
    }

    return {queuedJobs, issues};
}

export async function resolveLiveRestaurantCandidates(
    userId: number,
    locationId: string,
    serviceType: ProviderServiceType,
): Promise<LiveLocationCandidateResult> {
    if (serviceType !== 'delivery') {
        return {
            sourceConfigCount: 0,
            restaurantIds: [],
            liveRestaurantCount: 0,
            matchedRestaurantCount: 0,
            missingRestaurantCount: 0,
            queuedImportJobs: [],
            issues: [],
        };
    }

    const location = await userLocationService.getByIdForUser(userId, locationId);
    if (!location) {
        return {
            sourceConfigCount: 0,
            restaurantIds: [],
            liveRestaurantCount: 0,
            matchedRestaurantCount: 0,
            missingRestaurantCount: 0,
            queuedImportJobs: [],
            issues: [{providerKey: 'unknown', reason: 'Saved location not found.'}],
        };
    }

    const sourceConfigs = await listEnabledSourceConfigs(userId);
    const restaurantIds = new Set<string>();
    const queuedImportJobs: QueuedSyncJob[] = [];
    const queuedImportUrls = new Set<string>();
    const issues: QueuedLocationImportIssue[] = [];
    let liveRestaurantCount = 0;
    let matchedRestaurantCount = 0;
    let missingRestaurantCount = 0;

    for (const config of sourceConfigs) {
        try {
            const prepared = await prepareLocationAwareSource(config, location);
            if (!prepared) {
                continue;
            }

            if (prepared.issue) {
                issues.push(prepared.issue);
                continue;
            }
            if (!prepared.providerKey || !prepared.connector) {
                issues.push({
                    providerKey: config.providerKey,
                    reason: 'The provider source could not be prepared for live lookup.',
                });
                continue;
            }

            const liveRestaurants = await prepared.connector.listRestaurants({
                query: prepared.listingUrl,
                locationContext: prepared.locationContext,
            });
            liveRestaurantCount += liveRestaurants.length;

            for (const liveRestaurant of liveRestaurants) {
                const ref = await providerRefService.getByProviderIdentity(prepared.providerKey, {
                    externalId: liveRestaurant.externalId ?? null,
                    providerNativeId: liveRestaurant.providerNativeId ?? null,
                });

                if (ref) {
                    restaurantIds.add(ref.restaurantId);
                    matchedRestaurantCount++;
                    continue;
                }

                const importUrl = liveRestaurant.url?.trim();
                if (!prepared.connector.capabilities().canImportFromUrl || !importUrl) {
                    missingRestaurantCount++;
                    continue;
                }

                if (queuedImportUrls.has(importUrl)) {
                    missingRestaurantCount++;
                    continue;
                }

                queuedImportUrls.add(importUrl);
                queuedImportJobs.push(await queueImportFromUrl(prepared.providerKey, importUrl));
                missingRestaurantCount++;
            }
        } catch (err) {
            issues.push({
                providerKey: config.providerKey,
                reason: err instanceof Error ? err.message : 'Live provider lookup failed for this saved location.',
            });
        }
    }

    return {
        sourceConfigCount: sourceConfigs.length,
        restaurantIds: [...restaurantIds],
        liveRestaurantCount,
        matchedRestaurantCount,
        missingRestaurantCount,
        queuedImportJobs,
        issues,
    };
}

async function listEnabledSourceConfigs(userId: number): Promise<ProviderSourceConfig[]> {
    const repo = AppDataSource.getRepository(ProviderSourceConfig);
    return await repo.find({
        where: {
            userId: String(userId),
            isEnabled: true,
        },
        order: {
            updatedAt: 'DESC',
            createdAt: 'DESC',
        },
    });
}

async function prepareLocationAwareSource(
    config: ProviderSourceConfig,
    location: {
        id: string;
        label: string;
        addressLine1?: string | null;
        addressLine2?: string | null;
        city?: string | null;
        postalCode?: string | null;
        country?: string | null;
        latitude?: number | null;
        longitude?: number | null;
    },
): Promise<{
    providerKey?: ProviderKey;
    connector?: ReturnType<typeof ConnectorRegistry.resolve>;
    listingUrl: string;
    locationContext: ProviderLocationContext | null;
    providerLocationRef: Awaited<ReturnType<typeof providerLocationRefService.upsertResolvedLocation>> | null;
    issue?: QueuedLocationImportIssue;
} | null> {
    const providerKey = parseProviderKey(config.providerKey);
    if (!providerKey) {
        return {
            listingUrl: '',
            locationContext: null,
            providerLocationRef: null,
            issue: {
                providerKey: config.providerKey,
                reason: 'Unknown provider key on the saved import source.',
            },
        };
    }

    const connector = ConnectorRegistry.resolve(providerKey);
    if (!connector) {
        return {
            providerKey,
            listingUrl: '',
            locationContext: null,
            providerLocationRef: null,
            issue: {
                providerKey: config.providerKey,
                reason: 'No connector is registered for this provider.',
            },
        };
    }

    const caps = connector.capabilities();
    const listingUrl = config.listingUrl?.trim();
    if (!caps.canDiscoverFromListingUrl || !listingUrl) {
        return {
            providerKey,
            connector,
            listingUrl: listingUrl ?? '',
            locationContext: null,
            providerLocationRef: null,
            issue: {
                providerKey: config.providerKey,
                reason: 'This provider does not support location-scoped listing sync.',
            },
        };
    }

    if (connector.validateListingUrl) {
        try {
            connector.validateListingUrl(listingUrl);
        } catch (err) {
            return {
                providerKey,
                connector,
                listingUrl,
                locationContext: null,
                providerLocationRef: null,
                issue: {
                    providerKey: config.providerKey,
                    reason: err instanceof Error ? err.message : 'The saved listing URL is invalid.',
                },
            };
        }
    }

    if (!connector.resolveLocation) {
        return {
            providerKey,
            connector,
            listingUrl,
            locationContext: null,
            providerLocationRef: null,
            issue: {
                providerKey: config.providerKey,
                reason: 'This provider cannot resolve saved locations for availability refresh.',
            },
        };
    }

    const resolution = await connector.resolveLocation({
        label: location.label,
        addressLine1: location.addressLine1 ?? null,
        addressLine2: location.addressLine2 ?? null,
        city: location.city ?? null,
        postalCode: location.postalCode ?? null,
        country: location.country ?? null,
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        listingUrl,
    });

    if (!resolution) {
        return {
            providerKey,
            connector,
            listingUrl,
            locationContext: null,
            providerLocationRef: null,
        };
    }

    const providerLocationRef = await providerLocationRefService.upsertResolvedLocation(location.id, resolution);
    return {
        providerKey,
        connector,
        listingUrl,
        locationContext: {
            sourceLocationId: location.id,
            providerKey,
            providerAreaId: resolution.providerAreaId ?? null,
            providerLocationSlug: resolution.providerLocationSlug ?? null,
            latitude: resolution.latitude ?? location.latitude ?? null,
            longitude: resolution.longitude ?? location.longitude ?? null,
        },
        providerLocationRef,
    };
}

function parseProviderKey(value: string): ProviderKey | null {
    if (!Object.values(ProviderKey).includes(value as ProviderKey)) {
        return null;
    }
    return value as ProviderKey;
}
