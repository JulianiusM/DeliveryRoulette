/**
 * Unit tests for ImportConnector
 * Verifies the connector implements the provider interface correctly,
 * serves import payload data, and integrates with ConnectorRegistry.
 *
 * Each test creates a fresh ImportConnector instance (no shared state)
 * to match the production pattern where each import request gets its own.
 */
import {ImportConnector} from '../../src/providers/ImportConnector';
import {ProviderKey} from '../../src/providers/ProviderKey';
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
import {
    expectedDisplayName,
    expectedProviderKey,
    samplePayload,
    emptyPayload,
    listRestaurantsExpected,
    fetchMenuCases,
} from '../data/unit/importConnectorData';

describe('ImportConnector', () => {
    test('has providerKey set to IMPORT', () => {
        const connector = new ImportConnector(samplePayload);
        expect(connector.providerKey).toBe(ProviderKey.IMPORT);
        expect(connector.providerKey).toBe(expectedProviderKey);
    });

    test('has correct displayName', () => {
        const connector = new ImportConnector(samplePayload);
        expect(connector.displayName).toBe(expectedDisplayName);
    });

    test('has syncStyle set to push', () => {
        const connector = new ImportConnector(samplePayload);
        expect(connector.syncStyle).toBe('push');
    });

    test('rateLimitPolicy returns no practical limit', () => {
        const connector = new ImportConnector(samplePayload);
        const policy = connector.rateLimitPolicy();
        expect(policy.maxRequests).toBe(Infinity);
        expect(policy.windowMs).toBeGreaterThan(0);
    });

    describe('with empty payload', () => {
        test('listRestaurants returns empty array', async () => {
            const connector = new ImportConnector(emptyPayload);
            const result = await connector.listRestaurants('anything');
            expect(result).toEqual([]);
        });
    });

    describe('with loaded payload', () => {
        test('listRestaurants returns all restaurants from payload', async () => {
            const connector = new ImportConnector(samplePayload);
            const result = await connector.listRestaurants('');
            expect(result).toHaveLength(samplePayload.restaurants.length);

            for (const expected of listRestaurantsExpected) {
                const found = result.find((r) => r.name === expected.name);
                expect(found).toBeDefined();
                expect(found!.address).toBe(expected.address);
                expect(found!.city).toBe(expected.city);
                expect(found!.externalId).toBe(expected.name);
            }
        });

        test('listRestaurants includes addressLine2 when present', async () => {
            const connector = new ImportConnector(samplePayload);
            const result = await connector.listRestaurants('');
            const burger = result.find((r) => r.name === 'Burger Barn');
            expect(burger!.addressLine2).toBe('Floor 2');
        });

        test('listRestaurants includes providerRefs when present', async () => {
            const connector = new ImportConnector(samplePayload);
            const result = await connector.listRestaurants('');
            const pizza = result.find((r) => r.name === 'Pizza Palace');
            expect(pizza!.providerRefs).toHaveLength(1);
            expect(pizza!.providerRefs![0].providerKey).toBe('ubereats');
        });

        test.each(fetchMenuCases)('$description', async ({externalId, expectedCategoryCount, expectedItemCount}) => {
            const connector = new ImportConnector(samplePayload);
            const menu = await connector.fetchMenu(externalId);
            expect(menu.categories).toHaveLength(expectedCategoryCount);

            const totalItems = menu.categories.reduce((sum, c) => sum + c.items.length, 0);
            expect(totalItems).toBe(expectedItemCount);
        });
    });

    describe('concurrency isolation', () => {
        test('two instances with different payloads are independent', async () => {
            const connector1 = new ImportConnector(samplePayload);
            const connector2 = new ImportConnector(emptyPayload);

            const result1 = await connector1.listRestaurants('');
            const result2 = await connector2.listRestaurants('');

            expect(result1).toHaveLength(2);
            expect(result2).toHaveLength(0);
        });
    });

    test('can be registered and resolved via ConnectorRegistry', () => {
        ConnectorRegistry.clearAll();
        const connector = new ImportConnector(samplePayload);

        ConnectorRegistry.register(connector);

        const resolved = ConnectorRegistry.resolve(ProviderKey.IMPORT);
        expect(resolved).toBe(connector);
        expect(ConnectorRegistry.registeredKeys()).toContain(ProviderKey.IMPORT);

        ConnectorRegistry.clearAll();
    });
});
