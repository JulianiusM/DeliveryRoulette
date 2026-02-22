/**
 * Connector bootstrap — registers all available delivery provider connectors.
 *
 * Called once during application startup. Add new connectors here.
 *
 * Note: per-request connectors (like ImportConnector) are NOT registered
 * here — they are created on demand and passed directly to the sync pipeline.
 */
import * as ConnectorRegistry from './ConnectorRegistry';
import {LieferandoConnector} from './lieferando/LieferandoConnector';

export function registerConnectors(): void {
    ConnectorRegistry.register(new LieferandoConnector());
}
