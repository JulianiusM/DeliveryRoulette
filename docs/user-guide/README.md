# DeliveryRoulette User Guide

Welcome to DeliveryRoulette! This app helps your team decide where to order food by managing restaurants, tracking dietary preferences, syncing menus from delivery providers, and randomly suggesting a restaurant that works for everyone.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Managing Restaurants](#managing-restaurants)
4. [Menus & Diet Detection](#menus--diet-detection)
5. [Diet Preferences](#diet-preferences)
6. [Random Restaurant Suggestion](#random-restaurant-suggestion)
7. [Provider Integration (Lieferando)](#provider-integration-lieferando)
8. [Importing Restaurants](#importing-restaurants)
9. [Sync & Alerts](#sync--alerts)
10. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
11. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### What DeliveryRoulette Does

- **Manage restaurants** your team orders from (name, address, cuisine, status)
- **Track menus** with categories, items, and prices
- **Detect dietary suitability** automatically from menu items (vegetarian, vegan, gluten-free, etc.)
- **Override diet detection** when the heuristics are wrong
- **Suggest a random restaurant** that matches your group's dietary needs and cuisine preferences
- **Sync restaurants** from delivery providers like Lieferando

### What It Does *Not* Guarantee

- Diet detection is **heuristic-based** (keyword matching). It may miss items or produce false positives. Always verify with the restaurant directly for serious dietary restrictions.
- Provider sync depends on external HTML structure. If Lieferando changes their site, sync may stop working until the parser is updated.

### Creating an Account

1. Navigate to the application and click **Create account**
2. Fill in your details (username, email, password)
3. Verify your email address if email verification is enabled
4. Log in to access the application

### First Steps

After logging in, we recommend:
1. **Add a restaurant** you already order from
2. **Add menu categories and items** for that restaurant
3. **Set your diet preferences** in Settings
4. **Try the suggestion engine** to get a random restaurant pick

---

## Dashboard

Your dashboard provides a quick overview:

- **Restaurant Count**: Total restaurants in the system
- **Recent Sync Status**: When providers were last synced
- **Quick Actions**: Jump to restaurants, suggestions, import, or sync

---

## Managing Restaurants

### Viewing Restaurants

Go to **Restaurants** from the navigation menu. You'll see a list with:
- Restaurant name and city
- Active/inactive status
- Search by name or city
- Filter by status

### Adding a Restaurant

1. Click **Add Restaurant**
2. Fill in the form:
   - **Name** (required)
   - **Address Line 1** and **Address Line 2**
   - **City**, **Postal Code**, **Country**
   - **Active** toggle (inactive restaurants are excluded from suggestions)
3. Click **Create Restaurant**

### Restaurant Detail Page

Click a restaurant to see its full details:

- **Address & Status** — basic information
- **User Preferences**:
  - ⭐ **Favorite** — mark restaurants you love
  - 🚫 **Do Not Suggest** — exclude from random suggestions
- **Provider References** — links to delivery platforms (Lieferando, etc.)
- **Menu** — categories and items with prices
- **Diet Suitability** — which diets this restaurant supports, based on menu analysis

### Editing and Deleting

- Click **Edit** on a restaurant to modify its details
- Delete from the detail page (requires confirmation)

---

## Menus & Diet Detection

### Adding Menu Items

1. From a restaurant's detail page, click **Add Category**
2. Enter a category name (e.g., "Salads", "Pasta", "Desserts")
3. Within a category, click **Add Item** to add menu items:
   - **Name** (required): e.g., "Margherita Pizza"
   - **Description**: Ingredients or notes
   - **Price**: Numeric value
   - **Currency**: EUR, USD, etc.

### How Diet Detection Works (Heuristics)

DeliveryRoulette automatically analyzes menu items to infer which diets a restaurant supports:

1. **Keyword matching** — Menu item names and descriptions are scanned for diet-related keywords
   - *Vegetarian*: "vegetarisch", "veggie", "ohne Fleisch", etc.
   - *Vegan*: "vegan", "pflanzlich", etc.
   - *Gluten-free*: "glutenfrei", "gluten-free", etc.
2. **Confidence scoring** — Each match produces a confidence score
3. **Aggregation** — If enough items match a diet tag, the restaurant is marked as supporting that diet

**Important:** This is a best-effort heuristic. It works well for clearly labeled menus but may miss items without diet keywords or produce false positives for ambiguous names.

### Manual Diet Overrides

When the automatic detection is wrong, you can override it:

1. Go to the restaurant's detail page
2. Find the **Diet Suitability** section
3. Click a diet tag to toggle its override:
   - **Force Yes** — restaurant definitely supports this diet
   - **Force No** — restaurant does not support this diet
   - **Auto** — revert to heuristic detection

Overrides take precedence over automatic inference and persist across menu updates.

---

## Diet Preferences

### Setting Your Preferences

1. Go to **Settings** from your user menu
2. In the **Diet Preferences** section, select the diet tags that apply to you:
   - Vegetarian, Vegan, Pescatarian, Gluten-Free, Lactose-Free, Halal, Kosher, etc.
3. Save your preferences

Your preferences are used when generating suggestions — only restaurants that support your diets will be suggested.

---

## Random Restaurant Suggestion

### Getting a Suggestion

1. Go to **Suggest** from the navigation menu
2. Click the **Suggest!** button
3. The app picks a random restaurant from your eligible pool

### How Suggestions Work

The suggestion engine filters restaurants by:
1. **Active status** — only active restaurants are considered
2. **Diet compatibility** — restaurants must support diets of all selected users/tags
3. **Cuisine filters** — optional include/exclude lists
4. **Favorites and exclusions** — respects "Do Not Suggest" preferences

### Advanced Filters

Expand the **Advanced Filters** section to:
- **Diet Requirements** — check specific diet tags for group dining (e.g., if one person is vegan, check "Vegan")
- **Cuisine Include** — only suggest restaurants with these cuisines
- **Cuisine Exclude** — never suggest restaurants with these cuisines

### Rerolling

If you don't like the suggestion, click **Suggest!** again for a new pick. The candidate count shows how many restaurants matched your filters.

---

## Provider Integration (Lieferando)

### What Providers Do

Provider connectors sync restaurant data from external delivery platforms. Currently supported:
- **Lieferando** (lieferando.de) — Germany's delivery platform

### Syncing Restaurants from a Listing

1. Go to **Providers** from the navigation menu
2. For the Lieferando provider, paste a **listing URL** (a Lieferando page showing restaurants in your area)
3. Click **Sync** to discover and import all restaurants on that page

### Importing a Single Restaurant by URL

1. On the Providers page, find the **Import from URL** section
2. Paste a Lieferando **restaurant menu URL** (e.g., `https://www.lieferando.de/en/menu/restaurant-name`)
3. Click **Import** to fetch that restaurant's details and menu

### What Gets Imported

- Restaurant name and address
- Menu categories and items with prices
- Provider reference (link back to Lieferando page)
- Diet suitability is automatically inferred from the imported menu

---

## Importing Restaurants

### Bulk Import (JSON/CSV)

For importing many restaurants at once:

1. Go to **Import** from the navigation menu
2. Upload a **JSON** or **CSV** file with restaurant data
3. **Preview** the import:
   - Badges show which restaurants are **New**, **Updated**, or **Unchanged**
   - Review field changes (old vs. new values)
   - Check menu categories and item counts
4. Click **Apply** to execute the import
5. Review the **Result** page for per-restaurant success/failure status

### Import Format

See [docs/import-schema.md](../import-schema.md) for the complete JSON/CSV format specification.

---

## Sync & Alerts

### Sync Jobs

Provider sync runs either manually or on a schedule (configurable). Each sync creates a **Sync Job** record tracking:
- Start/end time
- Status (in progress, completed, failed)
- Per-restaurant results

### Sync Alerts

The system generates alerts when:
- **Restaurant gone** — A previously synced restaurant is no longer returned by the provider
- **Diet override stale** — A menu change may have invalidated a manual diet override

View and manage alerts from the **Sync Alerts** page.

---

## Common Issues & Troubleshooting

### "No restaurants found"

- **Check filters**: Your diet/cuisine filters may be too strict. Try removing some filters.
- **Check active status**: Inactive restaurants are excluded. Go to Restaurants and check the status.
- **Check diet preferences**: If your diet tags don't match any restaurant, no results will appear.

### "Menu import failed"

- **URL format**: Ensure you're pasting a full Lieferando restaurant URL (e.g., `https://www.lieferando.de/en/menu/restaurant-name`)
- **Site changes**: If Lieferando changed their HTML structure, the parser may need updating. Check sync alert details.
- **Network issues**: The server needs internet access to fetch provider pages.

### "Diet filter is too strict"

- Try selecting fewer diet requirements in the suggestion filter
- Check if restaurants have manual diet overrides that might be incorrect
- Re-run menu sync to update diet inference with latest menu data

### "Suggestions feel repetitive"

- Add more restaurants to increase the pool
- Sync from Lieferando to discover new restaurants in your area
- Check if many restaurants are set to inactive or "Do Not Suggest"
- Expand your cuisine filters

---

## Tips & Best Practices

### Getting Good Suggestions

1. **Keep menus updated**: Re-sync from providers periodically
2. **Set diet preferences accurately**: The suggestion engine relies on these
3. **Use manual overrides**: Fix incorrect diet detection rather than ignoring it
4. **Mark favorites and exclusions**: Fine-tune your pool

### For Teams

1. **Everyone should set their diet preferences**: The suggestion engine considers all selected diets
2. **Use cuisine filters for variety**: Exclude recently-ordered cuisines
3. **Check the candidate count**: If it's low, relax some filters

### Security

1. **Use a strong password**: Combine letters, numbers, and symbols
2. **Don't share accounts**: Each user should have their own account
3. **Log out on shared devices**: Keep your preferences private

---

## Need Help?

Click the **Help** link in the navigation menu to access documentation.

If you encounter issues, check:
1. The in-app Help pages
2. The [project README](../../README.md)
3. Open an issue on GitHub

Happy ordering! 🍕
