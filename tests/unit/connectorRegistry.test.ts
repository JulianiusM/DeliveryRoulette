/**
 * Unit tests for ConnectorRegistry
 * Tests registration, resolution, and safe handling of unknown keys.
 */
import * as ConnectorRegistry from '../../src/providers/ConnectorRegistry';
import {ProviderKey} from '../../src/providers/ProviderKey';
import {
    stubConnector,
    registerData,
    unknownKeyData,
} from '../data/unit/connectorRegistryData';

describe('ConnectorRegistry', () => {
    beforeEach(() => {
        ConnectorRegistry.clearAll();
    });

    describe('register + resolve', () => {
        test.each(registerData)('$description', ({key, displayName}) => {
            const connector = stubConnector(key, displayName);
            ConnectorRegistry.register(connector);

            const resolved = ConnectorRegistry.resolve(key);
            expect(resolved).toBeDefined();
            expect(resolved!.providerKey).toBe(key);
            expect(resolved!.displayName).toBe(displayName);
        });
    });

    describe('unknown key handling', () => {
        test.each(unknownKeyData)('$description', ({key}) => {
            const resolved = ConnectorRegistry.resolve(key);
            expect(resolved).toBeUndefined();
        });
    });

    test('replaces connector when registering same key twice', () => {
        const first = stubConnector(ProviderKey.UBER_EATS, 'First');
        const second = stubConnector(ProviderKey.UBER_EATS, 'Second');

        ConnectorRegistry.register(first);
        ConnectorRegistry.register(second);

        const resolved = ConnectorRegistry.resolve(ProviderKey.UBER_EATS);
        expect(resolved).toBe(second);
    });

    test('registeredKeys returns all registered provider keys', () => {
        ConnectorRegistry.register(stubConnector(ProviderKey.UBER_EATS, 'Uber Eats'));
        ConnectorRegistry.register(stubConnector(ProviderKey.DOORDASH, 'DoorDash'));

        const keys = ConnectorRegistry.registeredKeys();
        expect(keys).toHaveLength(2);
        expect(keys).toContain(ProviderKey.UBER_EATS);
        expect(keys).toContain(ProviderKey.DOORDASH);
    });

    test('clearAll removes all connectors', () => {
        ConnectorRegistry.register(stubConnector(ProviderKey.UBER_EATS, 'Uber Eats'));
        expect(ConnectorRegistry.registeredKeys()).toHaveLength(1);

        ConnectorRegistry.clearAll();
        expect(ConnectorRegistry.registeredKeys()).toHaveLength(0);
        expect(ConnectorRegistry.resolve(ProviderKey.UBER_EATS)).toBeUndefined();
    });
});
