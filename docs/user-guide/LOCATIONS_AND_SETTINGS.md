# Locations And Settings

Saved locations are the basis for location-aware suggestions.

## What A Saved Location Controls

A saved location is used for:

- provider area resolution
- location-scoped availability filtering
- delivery vs collection filtering
- live provider lookup when stored location snapshots are missing

## Save A Location

1. Open **Settings**.
2. Enter a label such as `Home` or `Office`.
3. Fill in the address fields.
4. Leave coordinates blank unless you want to enter them manually.
5. Save.

## Automatic Coordinate Lookup

If both coordinate fields are blank, DeliveryRoulette tries to resolve them from the address.

Manual coordinates always win.

If lookup fails:

1. add house number
2. add postal code
3. add country
4. try saving again
5. enter coordinates manually if needed

## Editing A Saved Location

When you edit a saved location:

- the saved location record is updated
- DeliveryRoulette tries to queue refresh jobs for your saved location import sources
- Suggestions can still fall back to stale availability or live provider matching instead of waiting for the background refresh

If no saved location import source exists yet, the page tells you that live provider lookup and refresh cannot run for that provider.

## Default Location

The default location is:

- preselected on the Suggest page
- used when a page needs a location and you did not choose another one

You can store multiple locations and switch the default later.

## Diet And Cuisine Defaults

Settings also stores:

- diet tags
- preferred cuisines
- excluded cuisines

These values prefill the Suggest page, but you can still override them for a single draw.
