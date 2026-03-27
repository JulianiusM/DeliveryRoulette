# Restaurants And Menus

Use the Restaurants area to review the shared restaurant dataset.

## What Normal Users Can Do

Authenticated users can:

- browse restaurants and menus
- filter the restaurant list by one or more diets
- sort filtered results by diet match
- mark favorites
- block restaurants from suggestions
- inspect provider refs, menu coverage, and diet evidence

## What Admins Can Do

Administrators can also:

- add restaurants
- edit restaurants
- add and remove provider references
- refresh menus from provider refs
- edit categories and menu items
- run diet recomputation
- create and remove manual diet overrides

## Why Shared Editing Is Restricted

Restaurants, menus, provider refs, and manual diet overrides affect the shared catalog for everyone.

In production, those write operations are restricted to administrators to reduce catalog vandalism and accidental data corruption.

## Recommended Review Order

When a restaurant feels wrong in suggestions, inspect it in this order:

1. is it active in DeliveryRoulette
2. does it have provider references
3. does it have a menu
4. are opening hours present
5. does the diet snapshot match reality
6. is it blocked from your suggestions

## Favorites And Do Not Suggest

Favorites affect the Suggest page when favorites mode is set to `Prefer` or `Only`.

Do Not Suggest removes the restaurant when the Suggest page is told to respect blocked restaurants.

## Menus And Diet Logic

Menus matter because they feed:

- diet inference
- allergen filtering
- explanation details on the Suggest page

If menus are empty or stale, use **Location Imports** or ask an administrator to refresh the shared catalog.
