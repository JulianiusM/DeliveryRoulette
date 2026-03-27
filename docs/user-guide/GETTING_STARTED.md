# Getting Started

DeliveryRoulette no longer requires a manual location import before Suggestions can work.

## First-Time Checklist

1. Register and sign in.
2. Open **Settings**.
3. Save at least one real location.
4. Let DeliveryRoulette resolve coordinates automatically, or enter them manually.
5. Open **Suggest** and try a draw.
6. If you get a restaurant, you are done.
7. If Suggestions report that restaurants are missing for your location, open **Location Imports**.
8. If Suggestions report later filters like `open now`, `diet`, or `favorites`, relax those filters instead of reimporting immediately.

## What Happens Automatically

- If both coordinate fields are blank, DeliveryRoulette tries to resolve them from the address.
- Suggestions prefer fresh location-aware availability, but they can still fall back to stale availability instead of failing outright.
- If location snapshots are missing, Suggestions try a live provider lookup for the selected location.
- If the provider returns restaurants that are not in the database yet, DeliveryRoulette queues restaurant-level imports automatically when possible.
- If you edit a saved location later, DeliveryRoulette tries to queue refresh jobs for your saved location import sources.

## What Still Requires User Action

- DeliveryRoulette cannot invent provider listing URLs from an address alone.
- If no Location Imports source is configured for your account, live provider lookup cannot run.
- If you want to discover restaurants that are not already in the database, use **Location Imports**.

## Normal User Workflow

Use these pages regularly:

- **Settings**: save locations and suggestion defaults
- **Suggest**: get a restaurant now, with on-page explanations if nothing matches
- **Location Imports**: refresh one saved location or discover missing restaurants
- **Restaurants**: browse the shared catalog, favorite restaurants, and block restaurants from suggestions

## Admin Workflow

Admins also get:

- bulk import
- sync job review
- sync alert review
- global provider refresh
- shared catalog editing
- global diet heuristic editing

See [Admin Operations](./ADMIN_OPERATIONS.md) and [Permissions And Security](./PERMISSIONS_AND_SECURITY.md).
