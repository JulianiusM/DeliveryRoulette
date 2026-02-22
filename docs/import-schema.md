# Import Schema (JSON)

This document describes the versioned JSON schema used to bulk-import
restaurants (with menus, provider references and diet tags) into
DeliveryRoulette.

## Versioning

Every import file **must** include a top-level `version` field. The server
rejects files whose version does not match the version it supports. When the
schema changes in a backwards-incompatible way, the version number is bumped.

| Version | Status  | Notes                     |
| ------- | ------- | ------------------------- |
| 1       | Current | Initial restaurant schema |

The current version is exported from the validation module as
`CURRENT_SCHEMA_VERSION`.

## Top-level structure

```jsonc
{
  "version": 1,
  "restaurants": [ /* … one or more restaurant objects … */ ]
}
```

| Field         | Type               | Required | Description                                     |
| ------------- | ------------------ | -------- | ----------------------------------------------- |
| `version`     | `integer`          | ✅       | Schema version (must equal current version)      |
| `restaurants` | `ImportRestaurant[]` | ✅     | Non-empty array of restaurant objects            |

## Restaurant object

```jsonc
{
  "name": "Pizza Palace",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",        // optional
  "city": "Berlin",
  "postalCode": "10115",
  "country": "Germany",            // optional
  "dietTags": ["vegan"],           // optional – DietTag keys
  "providerRefs": [ /* … */ ],     // optional
  "menuCategories": [ /* … */ ]    // optional
}
```

| Field            | Type                   | Required | Max length | Description                         |
| ---------------- | ---------------------- | -------- | ---------- | ----------------------------------- |
| `name`           | `string`               | ✅       | 150        | Restaurant name                     |
| `addressLine1`   | `string`               | ✅       | 255        | Primary address line                |
| `addressLine2`   | `string \| null`       | —        | 255        | Secondary address line              |
| `city`           | `string`               | ✅       | 100        | City                                |
| `postalCode`     | `string`               | ✅       | 20         | Postal / ZIP code                   |
| `country`        | `string`               | —        | 100        | Country name                        |
| `dietTags`       | `string[]`             | —        | 50 each    | DietTag keys (e.g. `"vegan"`)       |
| `providerRefs`   | `ImportProviderRef[]`  | —        |            | External provider references        |
| `menuCategories` | `ImportMenuCategory[]` | —        |            | Menu categories with items          |

## Provider reference object

```jsonc
{
  "providerKey": "lieferando",
  "externalId": "ext-123",   // optional
  "url": "https://www.lieferando.de/pizza-palace"
}
```

| Field         | Type             | Required | Max length | Description                          |
| ------------- | ---------------- | -------- | ---------- | ------------------------------------ |
| `providerKey` | `string`         | ✅       | 100        | Provider identifier                  |
| `externalId`  | `string \| null` | —        | 255        | Provider-specific external ID        |
| `url`         | `string` (URI)   | ✅       | 500        | Full URL on the provider             |

## Menu category object

```jsonc
{
  "name": "Starters",
  "sortOrder": 0,             // optional, default 0
  "items": [ /* … */ ]        // optional
}
```

| Field       | Type               | Required | Max length | Description              |
| ----------- | ------------------ | -------- | ---------- | ------------------------ |
| `name`      | `string`           | ✅       | 150        | Category name            |
| `sortOrder` | `integer`          | —        |            | Display order (≥ 0)      |
| `items`     | `ImportMenuItem[]`  | —        |            | Menu items in category   |

## Menu item object

```jsonc
{
  "name": "Bruschetta",
  "description": "Toasted bread with tomato topping",  // optional
  "price": 6.50,              // optional
  "currency": "EUR",          // optional, ISO 4217
  "sortOrder": 0              // optional
}
```

| Field         | Type             | Required | Max length | Description                          |
| ------------- | ---------------- | -------- | ---------- | ------------------------------------ |
| `name`        | `string`         | ✅       | 150        | Item name                            |
| `description` | `string \| null` | —        | 500        | Short description                    |
| `price`       | `number \| null` | —        |            | Price (≥ 0, up to 2 decimals)        |
| `currency`    | `string \| null` | —        | 3          | ISO 4217 currency code               |
| `sortOrder`   | `integer`        | —        |            | Display order (≥ 0)                  |

## Full example

```json
{
  "version": 1,
  "restaurants": [
    {
      "name": "Pizza Palace",
      "addressLine1": "123 Main St",
      "addressLine2": null,
      "city": "Berlin",
      "postalCode": "10115",
      "country": "Germany",
      "dietTags": ["vegetarian"],
      "providerRefs": [
        {
          "providerKey": "lieferando",
          "externalId": "lf-4821",
          "url": "https://www.lieferando.de/pizza-palace"
        }
      ],
      "menuCategories": [
        {
          "name": "Starters",
          "sortOrder": 0,
          "items": [
            {
              "name": "Bruschetta",
              "description": "Toasted bread with tomato topping",
              "price": 6.50,
              "currency": "EUR",
              "sortOrder": 0
            },
            {
              "name": "Garlic Bread",
              "price": 4.00,
              "currency": "EUR",
              "sortOrder": 1
            }
          ]
        },
        {
          "name": "Pizzas",
          "sortOrder": 1,
          "items": [
            {
              "name": "Margherita",
              "description": "Classic tomato and mozzarella",
              "price": 9.50,
              "currency": "EUR",
              "sortOrder": 0
            }
          ]
        }
      ]
    }
  ]
}
```

## Validation

Server-side validation is implemented in
`src/modules/import/importSchema.ts` using [Joi](https://joi.dev/).

```typescript
import { validateImportPayload } from '../modules/import/importSchema';

const result = validateImportPayload(parsedJson);

if (!result.valid) {
    // result.errors is a string[] of human-readable messages
    console.error(result.errors);
} else {
    // result.data is the typed ImportPayload
    processImport(result.data);
}
```

### Validation behaviour

* **`abortEarly: false`** – all errors are collected in a single pass.
* **`stripUnknown: true`** – unrecognised fields are silently removed.
* Field lengths match the database column constraints (see entity files).
* `null` is accepted for explicitly nullable fields (`addressLine2`,
  `description`, `price`, `currency`, `externalId`).
* Empty strings are rejected for required fields.
* The `url` field in provider references must be a valid URI.
* The `currency` field must be exactly 3 characters (ISO 4217).

## CSV Import (Restaurant List)

In addition to the full JSON import, a simpler **CSV format** is supported
for importing a flat list of restaurants (without menus or provider
references).

### Format

The CSV file must contain a **header row** as its first row. Column
names are matched case-insensitively to restaurant fields using the
alias table below. Columns that do not match any alias are silently
ignored.

### Column mapping

| Restaurant field | Accepted CSV column names                                          |
| ---------------- | ------------------------------------------------------------------ |
| `name`           | `name`, `restaurant`, `restaurant_name`, `restaurantName`          |
| `addressLine1`   | `addressLine1`, `address_line_1`, `address_line1`, `address1`, `address` |
| `addressLine2`   | `addressLine2`, `address_line_2`, `address_line2`, `address2`      |
| `city`           | `city`, `town`                                                     |
| `postalCode`     | `postalCode`, `postal_code`, `zip`, `zipCode`, `zip_code`, `postcode` |
| `country`        | `country`                                                          |
| `dietTags`       | `dietTags`, `diet_tags`, `tags`, `diet`                            |

**Required columns:** `name`, `addressLine1`, `city`, `postalCode`.

### Diet tags

Multiple diet tags in a single cell are separated by **semicolons** (`;`).
For example: `vegan;gluten_free;organic`.

### Example

```csv
name,addressLine1,addressLine2,city,postalCode,country,dietTags
Pizza Palace,123 Main St,Apt 4B,Berlin,10115,Germany,vegetarian
Burger Joint,456 Oak Ave,,Munich,80331,Germany,halal
Sushi Spot,789 Elm St,,Hamburg,20095,,vegan;gluten_free
```

### Processing

1. The CSV is parsed and converted into an `ImportPayload` (with
   `version` set automatically to the current schema version).
2. The resulting payload is validated through the same Joi schema as
   JSON imports.
3. The preview diff and apply steps are identical to JSON imports.

### Limitations

* **Restaurant data only** — menus, menu items, and provider references
  are not supported in CSV format. Use JSON for full imports.
* Empty rows (all cells blank) are silently skipped.
