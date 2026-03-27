# Location Imports

Location Imports is the user-facing page for refreshing restaurants and availability for one saved location.

## When To Use This Page

Use **Location Imports** when:

- you want to discover restaurants that are not in the database yet
- Suggestions tell you that no provider source is configured for live lookup
- Suggestions queued restaurant imports for missing places and you want a broader refresh
- provider menus or availability look stale and you want to refresh them now
- you want to import one restaurant directly from a menu URL

## What This Page Is Not

This page is not the global admin operations area.

It is for your own saved locations and your own provider source URLs.

## Listing Sync

Listing sync is the main way to refresh or discover a location-aware restaurant pool.

1. Open **Location Imports**.
2. Choose a provider.
3. Select the saved location.
4. Paste the provider listing URL.
5. Start the sync.

That background job updates:

- discovered restaurants
- provider references
- menus
- location-scoped availability

## Direct Restaurant Import

Use direct import when you only need one restaurant.

1. Open **Location Imports**.
2. Choose the provider.
3. Paste the restaurant menu URL.
4. Start the import.

This refreshes the restaurant and its menu. Delivery availability for a specific location is still best refreshed through a listing sync.

## Relationship To Suggestions

Suggestions can already work before you visit this page if:

- the restaurant is already in the database
- stale availability exists
- or a live provider lookup can match the restaurant to your selected location

Use **Location Imports** when you need better freshness or broader discovery, not as a mandatory first-run step.

## User Tasks vs Admin Tasks

Location Imports is a normal user page.

It is for:

- listing syncs for your saved locations
- direct restaurant imports from provider URLs

It is not for:

- global provider refresh
- sync queue review
- global heuristics
- bulk import

Those live in [Admin Operations](./ADMIN_OPERATIONS.md).
