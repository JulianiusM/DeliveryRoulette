import {DeliveryProviderConnector} from "./DeliveryProviderConnector";
import {ProviderKey} from "./ProviderKey";

/**
 * Registry that maps {@link ProviderKey} values to their
 * {@link DeliveryProviderConnector} implementations.
 *
 * Use {@link register} at application startup to wire connectors,
 * then call {@link resolve} at runtime to obtain them.
 */

const connectors = new Map<ProviderKey, DeliveryProviderConnector>();

/**
 * Register a connector for the given provider key.
 * Replaces any previously registered connector for the same key.
 */
export function register(connector: DeliveryProviderConnector): void {
    connectors.set(connector.providerKey, connector);
}

/**
 * Resolve a connector by its provider key.
 * Returns `undefined` when no connector has been registered for the key,
 * allowing callers to handle missing connectors gracefully.
 */
export function resolve(key: ProviderKey): DeliveryProviderConnector | undefined {
    return connectors.get(key);
}

/**
 * Return all currently registered provider keys.
 */
export function registeredKeys(): ProviderKey[] {
    return [...connectors.keys()];
}

/**
 * Remove all registered connectors.  Intended for testing only.
 */
export function clearAll(): void {
    connectors.clear();
}
