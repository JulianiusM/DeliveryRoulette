/**
 * Unit tests for ImportConnector
 * Verifies the connector implements the provider interface correctly,
 * can load/serve import payload data, and integrates with ConnectorRegistry.
 */
import {ImportConnector} from '../../src/providers/ImportConnector';
import {ProviderKey} from '../../src/providers/ProviderKey';
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
import {
    expectedDisplayName,
    expectedProviderKey,
    samplePayload,
    listRestaurantsExpected,
    fetchMenuCases,
} from '../data/unit/importConnectorData';

describe('ImportConnector', () => {
    afterEach(() => {
        ImportConnector.clearPayload();
    });

    test('has providerKey set to IMPORT', () => {
        expect(ImportConnector.providerKey).toBe(ProviderKey.IMPORT);
        expect(ImportConnector.providerKey).toBe(expectedProviderKey);
    });

    test('has correct displayName', () => {
        expect(ImportConnector.displayName).toBe(expectedDisplayName);
    });

    test('rateLimitPolicy returns no practical limit', () => {
        const policy = ImportConnector.rateLimitPolicy();
        expect(policy.maxRequests).toBe(Infinity);
        expect(policy.windowMs).toBeGreaterThan(0);
    });

    describe('without loaded payload', () => {
        test('listRestaurants returns empty array', async () => {
            const result = await ImportConnector.listRestaurants('anything');
            expect(result).toEqual([]);
        });

        test('fetchMenu returns empty menu', async () => {
            const result = await ImportConnector.fetchMenu('anything');
            expect(result).toEqual({categories: []});
        });
    });

    describe('with loaded payload', () => {
        beforeEach(() => {
            ImportConnector.loadPayload(samplePayload);
        });

        test('listRestaurants returns all restaurants from payload', async () => {
            const result = await ImportConnector.listRestaurants('');
            expect(result).toHaveLength(samplePayload.restaurants.length);

            for (const expected of listRestaurantsExpected) {
                const found = result.find((r) => r.name === expected.name);
                expect(found).toBeDefined();
                expect(found!.address).toBe(expected.address);
                expect(found!.city).toBe(expected.city);
                expect(found!.externalId).toBe(expected.name);
            }
        });

        test.each(fetchMenuCases)('$description', async ({externalId, expectedCategoryCount, expectedItemCount}) => {
            const menu = await ImportConnector.fetchMenu(externalId);
            expect(menu.categories).toHaveLength(expectedCategoryCount);

            const totalItems = menu.categories.reduce((sum, c) => sum + c.items.length, 0);
            expect(totalItems).toBe(expectedItemCount);
        });

        test('clearPayload removes loaded data', async () => {
            ImportConnector.clearPayload();
            const result = await ImportConnector.listRestaurants('');
            expect(result).toEqual([]);
        });
    });

    test('can be registered and resolved via ConnectorRegistry', () => {
        ConnectorRegistry.clearAll();

        ConnectorRegistry.register(ImportConnector);

        const resolved = ConnectorRegistry.resolve(ProviderKey.IMPORT);
        expect(resolved).toBe(ImportConnector);
        expect(ConnectorRegistry.registeredKeys()).toContain(ProviderKey.IMPORT);

        ConnectorRegistry.clearAll();
    });
});
