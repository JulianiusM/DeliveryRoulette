/**
 * Known delivery-provider keys.
 *
 * Each value MUST match the `providerKey` stored in
 * `RestaurantProviderRef.providerKey` for that provider.
 */
export enum ProviderKey {
    UBER_EATS = "uber_eats",
    DOORDASH = "doordash",
    GRUBHUB = "grubhub",
    JUST_EAT = "just_eat",
    IMPORT = "import",
}
