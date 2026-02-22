import {DeliveryProviderConnector} from "./DeliveryProviderConnector";
import {ProviderKey} from "./ProviderKey";
import {ProviderMenu, ProviderRestaurant, RateLimitPolicy} from "./ProviderTypes";
import {ImportPayload, ImportRestaurant} from "../modules/import/importSchema";

/**
 * Import connector — wraps a bulk-import payload as a provider so that
 * restaurants created via import participate in the unified sync pipeline
 * and receive a {@link RestaurantProviderRef} with
 * `providerKey = "import"`.
 *
 * Each import flow creates a **new instance** (no shared global state),
 * so concurrent imports by different users are fully isolated.  State
 * lives only for the duration of the request — the payload is already
 * in the client-side hidden form field between HTTP calls, so no
 * server-side persistence is necessary.
 */
export class ImportConnector implements DeliveryProviderConnector {
    readonly providerKey = ProviderKey.IMPORT;
    readonly displayName = "Import";

    /** Restaurants keyed by lowercased name. */
    private readonly restaurants: Map<string, ImportRestaurant>;

    constructor(payload: ImportPayload) {
        this.restaurants = new Map(
            payload.restaurants.map((r) => [r.name.toLowerCase(), r]),
        );
    }

    // ── DeliveryProviderConnector interface ──────────────────

    async listRestaurants(_query: string): Promise<ProviderRestaurant[]> {
        return [...this.restaurants.values()].map((r) => ({
            externalId: r.name,
            name: r.name,
            url: `import://${r.name}`,
            address: r.addressLine1,
            addressLine2: r.addressLine2 ?? null,
            city: r.city,
            postalCode: r.postalCode,
            country: r.country ?? null,
            providerRefs: r.providerRefs?.map((ref) => ({
                providerKey: ref.providerKey,
                externalId: ref.externalId ?? null,
                url: ref.url,
            })),
        }));
    }

    async fetchMenu(externalId: string): Promise<ProviderMenu> {
        const restaurant = this.restaurants.get(externalId.toLowerCase());
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
