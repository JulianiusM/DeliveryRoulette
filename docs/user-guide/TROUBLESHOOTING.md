# Troubleshooting

Use this page when suggestions, imports, or locations do not behave as expected.

## No Restaurants Suggested

If the Suggest page returns nothing, read the on-page hint first.

The page now tells you whether the problem is:

- missing location coverage
- no provider source for live lookup
- no restaurants open right now
- cuisine or allergen filters
- blocked restaurants
- favorites-only mode
- diet rules

## There Are Restaurants In The App, But None For My Location

Possible causes:

- no location snapshots were ever stored for that saved location
- no Location Imports source is configured, so live provider lookup cannot run
- the provider returned restaurants for that location, but they are not in the database yet

Fix:

1. verify the selected saved location on the Suggest page
2. open **Settings** and confirm the address and coordinates
3. read the Suggest hint for queued imports or provider-source warnings
4. if no provider source is configured, open **Location Imports** and add one
5. if imports were queued automatically, wait for them to finish and try again
6. if the provider still returns nothing, run a listing sync for that location manually

## I Edited My Location And Suggestions Changed

This is normal.

DeliveryRoulette now does three things after a location change:

- uses stale availability if that is all it has
- attempts live provider lookup when possible
- queues background refresh jobs for saved provider sources

If the result is still wrong:

1. confirm the address and coordinates
2. read the Suggest hint for the exact blocking stage
3. run a manual listing sync from **Location Imports** if you want a full refresh immediately

## Restaurants Exist, But None Are Open

Fix:

1. turn off the open-now filter
2. try the other service type
3. check imported opening hours
4. retry during normal service hours

## Diet Filters Remove Everything

Fix:

1. lower the minimum diet score
2. use fewer diet tags
3. inspect menu data
4. ask an administrator to correct the shared catalog if the menu or overrides are wrong

## Favorites-Only Returns Nothing

Fix:

1. switch to `Prefer favorites`
2. mark more restaurants as favorites
3. check whether favorites are blocked, closed, or unavailable at that location

## Automatic Coordinate Lookup Fails

Fix:

1. add house number
2. add postal code
3. add country
4. retry save
5. enter coordinates manually if needed

## I Need To Edit Shared Restaurant Data

That is an admin task in production.

Ask an administrator to update shared restaurants, menus, provider refs, or manual diet overrides.
