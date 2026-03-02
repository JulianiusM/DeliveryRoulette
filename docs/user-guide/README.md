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

DeliveryRoulette automatically analyzes menu items to infer which diets a restaurant supports. The engine is **fully data-driven and tag-agnostic** — all rules (keywords, allergen exclusions, negative patterns) are stored in the database and configurable without code changes. It supports **multiple languages** (currently English and German) simultaneously, even within the same restaurant menu.

The detection pipeline uses multiple signals:

1. **Positive keyword matching** — Menu item names, descriptions, and diet context are scanned for diet-indicating keywords (e.g., "vegan", "pflanzlich", "plant-based", "vegetarisch"). Keywords are matched using word boundaries to avoid false matches.
2. **Dish whitelist** — Known diet-compatible dishes are recognized by name tokens (e.g., "margherita" in "Pizza Margherita" matches the vegetarian whitelist, "falafel" matches vegan).
3. **Allergen-based exclusions** — If a menu item has allergen data (e.g., from Lieferando import), conflicting allergens automatically disqualify items from certain diets:
   - Eggs → excludes from *Vegan*
   - Milk/Dairy → excludes from *Vegan* and *Lactose-free*
   - Gluten/Wheat → excludes from *Gluten-free*
   - Pork → excludes from *Halal*
   - Fish/Shellfish → excludes from *Vegan* and *Vegetarian*
   - Both "contains" and "may contain" allergens are included by default (configurable)
4. **Negative keyword detection** — Words that contradict a diet (e.g., "Rindfleisch" / "beef" in a vegan check, "Schweinefleisch" / "pork" in a halal check) cause exclusion. Supports German and English.
5. **Strong name signals** — Menu item names that are strong diet indicators (e.g., "Vegan Bowl", "Vegetarische Platte") receive extra weight in scoring.
6. **Context-aware false positive detection** — Prevents counting items like "vegan mayo on beef burger" as vegan evidence by detecting when a diet keyword appears only as a modifier for a non-compatible dish.
7. **Item customization options** — When providers supply diet-related customization options (e.g., "vegan zubereitet" / "make plant-based"), these are parsed and fed into the scoring as positive signals.
8. **Confidence scoring** — Each match produces a confidence score (LOW, MEDIUM, HIGH) based on evidence strength and menu size.
9. **Subdiet inheritance** — VEGAN matches automatically count as VEGETARIAN evidence (configurable parent-child relationships).

#### Multi-Language Support

All keywords, negative keywords, dish names, and detection patterns support **both German and English** out of the box. Text normalization handles umlauts automatically (Käse → kase for matching), so German menu items are correctly analyzed regardless of character encoding.

#### Configurable Rules

All detection rules are stored as database records and can be modified through the application:
- **Keywords** — words that indicate diet compatibility
- **Dish whitelist** — known diet-compatible dish names
- **Allergen exclusions** — which allergens disqualify which diets
- **Negative keywords** — words that contradict a diet
- **Strong signals** — extra-weighted diet indicators
- **Contradiction patterns** — regex patterns that detect conflicting evidence
- **Qualified exceptions** — exceptions to negative keywords (e.g., "chicken" is negative for vegan, but "chicken-free" is not)

Numeric thresholds and scoring weights (19 parameters) are configurable via environment variables.

**Important:** This is a best-effort heuristic. It works well for clearly labeled menus but may miss items without diet keywords or produce false positives for ambiguous names. The allergen-based exclusion significantly reduces false positives when allergen data is available.

> **Reliability note**: False negatives (missing a valid diet match) are preferred over false positives (incorrectly marking something as diet-compatible). This design choice prioritizes safety for users with dietary restrictions.

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
2. **Open now** — optionally filters to only restaurants currently open for delivery (based on imported opening hours). Restaurants with no opening hours data are included by default (benefit of the doubt).
3. **Diet compatibility** — restaurants must support all selected diet tags (based on inference scores or manual overrides). Your saved diet preferences are pre-selected automatically.
4. **Allergen exclusion** — restaurants where *all* menu items contain any of the excluded allergens are filtered out. Restaurants with at least one allergen-free item are kept.
5. **Cuisine filters** — optional include/exclude lists (comma-separated)
6. **User preferences** — favorites receive a selection boost, "Do Not Suggest" restaurants are hard-excluded
7. **Recent history** — recently suggested restaurants are excluded to promote variety

### Advanced Filters

Expand the **Advanced Filters** section to:
- **Only open restaurants** — toggle to restrict suggestions to restaurants that are currently open (enabled by default). Restaurants without opening hours data are always included.
- **Diet Requirements** — check specific diet tags for group dining (e.g., if one person is vegan, check "Vegan"). Your personal diet preferences are pre-selected.
- **Cuisine Include** — only suggest restaurants with these cuisines (comma-separated)
- **Cuisine Exclude** — never suggest restaurants with these cuisines (comma-separated)
- **Allergen Exclusion** — comma-separated list of allergens to avoid (e.g., "Gluten, Eggs, Milk"). Restaurants where every menu item contains at least one of these allergens will be excluded. This works alongside diet filters for comprehensive dietary safety.

> **Diet vs. Allergen overlap**: Diet tags like "Gluten-Free" and "Lactose-Free" use heuristic scoring at the restaurant level, while allergen exclusion performs direct item-level allergen matching. Both mechanisms complement each other — use diet tags for general dietary preference filtering and allergen exclusion for specific allergen avoidance.

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
- Opening hours (used for "open now" filtering in suggestions)
- Menu categories and items with prices
- **Allergen information** per menu item — fetched from Lieferando's product information API. Includes both "contains" and "may contain" levels by default (configurable). Allergen types include: Gluten, Milk, Eggs, Fish, Peanuts, Soybeans, Nuts, Celery, Mustard, Sesame, Sulphites, Lupin, Molluscs, and Crustaceans.
- **Diet customization options** — if items offer diet-related preparation options (e.g., "vegan zubereitet", "make plant-based"), these are parsed from the provider's CDN data and factored into diet inference scoring.
- Provider reference (link back to Lieferando page)
- Diet suitability is automatically inferred from the imported menu, allergen data, and customization options

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
