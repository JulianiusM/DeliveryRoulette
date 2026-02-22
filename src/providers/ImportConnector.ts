import {DeliveryProviderConnector} from "./DeliveryProviderConnector";
import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";
import {ImportPayload, ImportRestaurant} from "../modules/import/importSchema";

/**
 * Import connector — wraps the bulk-import ingestion as a provider so
 * that restaurants created via import participate in the unified sync
 * pipeline and receive a {@link RestaurantProviderRef} with
 * `providerKey = "import"`.
 *
 * Unlike external-API connectors, import is **push-style**: the caller
 * loads an {@link ImportPayload} via {@link loadPayload}, after which
 * {@link listRestaurants} and {@link fetchMenu} serve data from that
 * payload.  Call {@link clearPayload} when processing is finished.
 */
class ImportConnectorImpl implements DeliveryProviderConnector {
    readonly providerKey = ProviderKey.IMPORT;
    readonly displayName = "Import";

    /** Restaurants keyed by lowercased name. */
    private pending = new Map<string, ImportRestaurant>();

    // ── Payload management ──────────────────────────────────

    /** Load an import payload so listRestaurants / fetchMenu can serve it. */
    loadPayload(payload: ImportPayload): void {
        this.pending.clear();
        for (const r of payload.restaurants) {
            this.pending.set(r.name.toLowerCase(), r);
        }
    }

    /** Discard any loaded payload data. */
    clearPayload(): void {
        this.pending.clear();
    }

    // ── DeliveryProviderConnector interface ──────────────────

    async listRestaurants(_query: string): Promise<ProviderRestaurant[]> {
        return [...this.pending.values()].map((r) => ({
            externalId: r.name,
            name: r.name,
            url: `import://${r.name}`,
            address: r.addressLine1,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country ?? null,
        }));
    }

    async fetchMenu(externalId: string): Promise<ProviderMenu> {
        const restaurant = this.pending.get(externalId.toLowerCase());
        if (!restaurant?.menuCategories) return {categories: []};

        return {
            categories: restaurant.menuCategories.map((cat) => ({
                name: cat.name,
                items: (cat.items ?? []).map((item) => ({
                    externalId: item.name,
                    name: item.name,
                    description: item.description ?? null,
                    price: item.price ?? null,
                    currency: item.currency ?? null,
                })),
            })),
        };
    }

    rateLimitPolicy(): RateLimitPolicy {
        return {maxRequests: Infinity, windowMs: 60_000};
    }
}

export const ImportConnector = new ImportConnectorImpl();
