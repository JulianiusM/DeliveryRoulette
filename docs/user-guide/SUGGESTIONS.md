# Suggestions

The Suggest page draws from a location-aware pool.

## Before You Expect A Suggestion

Make sure these are true:

1. you are signed in
2. you have a saved location
3. the selected service type matches what restaurants usually offer
4. your filters are not stricter than the available data

A manual import is no longer required just because you saved a location.

## Basic Flow

1. Open **Suggest**.
2. Confirm the saved location.
3. Choose **Delivery** or **Collection**.
4. Review the default diet and cuisine filters.
5. Click **Suggest With Current Defaults**.

## How DeliveryRoulette Builds The Pool

DeliveryRoulette tries these sources in order:

1. fresh location-aware availability snapshots
2. stale availability snapshots, if no fresh ones exist
3. live provider lookup for the selected location, if a provider source is configured

If live provider lookup finds restaurants that are missing from the database, DeliveryRoulette queues restaurant imports automatically when possible.

## Advanced Filters

Use advanced filters when you need tighter control.

- **Saved Location**: changes the availability scope
- **Service Type**: switches between delivery and collection
- **Open now**: removes explicitly closed restaurants
- **Diet Tags**: requires matching diet support
- **Minimum Diet Score**: raises or lowers inferred diet strictness
- **Cuisine Include/Exclude**: narrows cuisine signals
- **Exclude Allergens**: removes restaurants when no safe menu item remains
- **Favorites Mode**: prefer, require, or ignore favorites
- **Avoid Recent Suggestions**: hides recently picked restaurants
- **Respect Blocked Restaurants**: removes Do Not Suggest restaurants

## If No Suggestion Is Returned

The page explains which stage emptied the pool.

Typical reasons:

- no location data or live provider source is available for the selected location
- restaurants exist there, but none are open now
- cuisine filters removed the pool
- allergen exclusions removed the pool
- blocked restaurants removed the pool
- favorites-only left nothing
- no restaurant passed the selected diets

The alert also shows count hints such as:

- active restaurants
- restaurants at location
- open restaurants
- cuisine survivors
- allergen-safe survivors
- allowed restaurants
- favorites
- diet matches

## What The Hints Mean

If the app says:

- `background location import was queued`: stored location data is weak and a refresh is already running
- `live provider lookup matched existing restaurants`: the failure is caused by later filters, not by missing location snapshots alone
- `Queued X restaurant import jobs`: the provider returned restaurants for your location that were not in the database yet
- `No enabled Location Imports source is configured`: add at least one provider listing URL on **Location Imports** if you want live provider matching

## What To Do Next

- switch saved location
- switch service type
- turn off open-now
- relax cuisine filters
- relax diet rules
- unblock restaurants
- add a provider source on **Location Imports** if live lookup cannot run
- review menus and overrides if diet or allergen filters are too strict
