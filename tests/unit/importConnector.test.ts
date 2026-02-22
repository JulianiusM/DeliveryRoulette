/**
 * Unit tests for ImportConnector
 * Verifies the connector implements the provider interface correctly
 * and that the sync runner can invoke it.
 */
import {ImportConnector} from '../../src/providers/ImportConnector';
import {ProviderKey} from '../../src/providers/ProviderKey';
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
import {
    expectedDisplayName,
    expectedProviderKey,
    listRestaurantsQueries,
    fetchMenuIds,
} from '../data/unit/importConnectorData';

describe('ImportConnector', () => {
    test('has providerKey set to IMPORT', () => {
        expect(ImportConnector.providerKey).toBe(ProviderKey.IMPORT);
        expect(ImportConnector.providerKey).toBe(expectedProviderKey);
    });

    test('has correct displayName', () => {
        expect(ImportConnector.displayName).toBe(expectedDisplayName);
    });

    describe('listRestaurants', () => {
        test.each(listRestaurantsQueries)('$description', async ({query}) => {
            const result = await ImportConnector.listRestaurants(query);
            expect(result).toEqual([]);
        });
    });

    describe('fetchMenu', () => {
        test.each(fetchMenuIds)('$description', async ({externalId}) => {
            const result = await ImportConnector.fetchMenu(externalId);
            expect(result).toEqual({categories: []});
        });
    });

    test('rateLimitPolicy returns no practical limit', () => {
        const policy = ImportConnector.rateLimitPolicy();
        expect(policy.maxRequests).toBe(Infinity);
        expect(policy.windowMs).toBeGreaterThan(0);
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
