/**
 * Test data for provider controller tests
 */

import {ProviderKey} from '../../../src/providers/ProviderKey';

export const providerControllerLocations = {
    home: {
        id: 'loc-home',
        userId: 1,
        label: 'Home',
        addressLine1: 'Main Street 1',
        addressLine2: null,
        city: 'Neutraubling',
        postalCode: '93073',
        country: 'Germany',
        latitude: 48.9889211,
        longitude: 12.1984299,
        isDefault: true,
    },
    office: {
        id: 'loc-office',
        userId: 1,
        label: 'Office',
        addressLine1: 'Business Park 8',
        addressLine2: null,
        city: 'Regensburg',
        postalCode: '93047',
        country: 'Germany',
        latitude: null,
        longitude: null,
        isDefault: false,
    },
};

export const getProvidersPageDataCases = [
    {
        description: 'returns provider cards together with saved location options',
        userId: '1',
        providerKey: ProviderKey.LIEFERANDO,
        storedConfig: {
            id: 'config-1',
            userId: '1',
            providerKey: ProviderKey.LIEFERANDO,
            listingUrl: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
            isEnabled: true,
        },
        locations: [providerControllerLocations.home, providerControllerLocations.office],
        defaultLocation: providerControllerLocations.home,
    },
];

export const syncProviderCases = [
    {
        description: 'uses an explicitly selected saved location for listing sync resolution',
        userId: '1',
        providerKey: ProviderKey.LIEFERANDO,
        listingUrl: 'https://www.lieferando.de/en/delivery/food/neutraubling-93073',
        locationId: 'loc-home',
        selectedLocation: providerControllerLocations.home,
        resolution: {
            providerKey: ProviderKey.LIEFERANDO,
            providerAreaId: '93073',
            providerLocationSlug: 'neutraubling-93073',
            latitude: 48.9889211,
            longitude: 12.1984299,
            status: 'resolved',
            rawResolutionJson: '{"providerAreaId":"93073"}',
        },
        providerLocationRef: {
            id: 'provider-location-ref-1',
        },
        expectedJob: {
            jobId: 'job-1',
            providerKey: ProviderKey.LIEFERANDO,
            syncType: 'listing',
            status: 'pending',
        },
    },
];
