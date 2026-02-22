/**
 * Test data for CSV parser unit tests
 */

/** Minimal valid CSV with required columns only */
export const minimalCsv = [
    'name,addressLine1,city,postalCode',
    'Test Restaurant,123 Main St,Berlin,10115',
].join('\n');

/** CSV with all supported columns */
export const fullCsv = [
    'name,addressLine1,addressLine2,city,postalCode,country,dietTags',
    'Pizza Palace,123 Main St,Apt 4B,Berlin,10115,Germany,vegan;gluten_free',
].join('\n');

/** CSV using snake_case aliases */
export const snakeCaseCsv = [
    'restaurant_name,address_line_1,address_line_2,city,postal_code,country,diet_tags',
    'Burger Joint,456 Oak Ave,Suite 2,Munich,80331,Germany,halal',
].join('\n');

/** CSV using short-hand aliases */
export const shortHandCsv = [
    'restaurant,address,town,zip,country,tags',
    'Sushi Spot,789 Elm St,Hamburg,20095,Germany,vegetarian;vegan',
].join('\n');

/** CSV with multiple restaurants */
export const multiRowCsv = [
    'name,addressLine1,city,postalCode,country',
    'Restaurant A,1 First St,Berlin,10115,Germany',
    'Restaurant B,2 Second St,Munich,80331,Germany',
    'Restaurant C,3 Third St,Hamburg,20095,',
].join('\n');

/** CSV with extra unknown columns (should be ignored) */
export const extraColumnsCsv = [
    'name,addressLine1,city,postalCode,phone,website',
    'Extra Place,1 St,Berlin,10115,+491234,https://example.com',
].join('\n');

/** CSV with empty rows between data */
export const emptyRowsCsv = [
    'name,addressLine1,city,postalCode',
    'Place A,1 A St,Berlin,10115',
    ',,,',
    'Place B,2 B St,Munich,80331',
].join('\n');

/** CSV with semicolon-separated diet tags */
export const multiTagsCsv = [
    'name,addressLine1,city,postalCode,dietTags',
    'Health Place,1 Green St,Berlin,10115,vegan;gluten_free;organic',
].join('\n');

// ── Invalid CSVs ────────────────────────────────────────────

/** Empty CSV */
export const emptyCsv = '';

/** Header-only CSV */
export const headerOnlyCsv = 'name,addressLine1,city,postalCode';

/** CSV missing required column (name) */
export const missingNameColumnCsv = [
    'addressLine1,city,postalCode',
    '123 Main St,Berlin,10115',
].join('\n');

/** CSV missing required column (city) */
export const missingCityColumnCsv = [
    'name,addressLine1,postalCode',
    'Test,123 Main St,10115',
].join('\n');

/** CSV with empty required field in a data row */
export const emptyRequiredFieldCsv = [
    'name,addressLine1,city,postalCode',
    ',123 Main St,Berlin,10115',
].join('\n');

/** CSV with multiple empty required fields */
export const multipleEmptyFieldsCsv = [
    'name,addressLine1,city,postalCode',
    ',,Berlin,10115',
].join('\n');

// ── Test case collections ───────────────────────────────────

export const validCsvCases = [
    {
        description: 'parses minimal CSV with required columns',
        input: minimalCsv,
        expectedCount: 1,
        expectedName: 'Test Restaurant',
    },
    {
        description: 'parses CSV with all supported columns',
        input: fullCsv,
        expectedCount: 1,
        expectedName: 'Pizza Palace',
    },
    {
        description: 'parses CSV with snake_case column aliases',
        input: snakeCaseCsv,
        expectedCount: 1,
        expectedName: 'Burger Joint',
    },
    {
        description: 'parses CSV with short-hand column aliases',
        input: shortHandCsv,
        expectedCount: 1,
        expectedName: 'Sushi Spot',
    },
    {
        description: 'parses CSV with multiple restaurants',
        input: multiRowCsv,
        expectedCount: 3,
        expectedName: 'Restaurant A',
    },
    {
        description: 'ignores unknown columns',
        input: extraColumnsCsv,
        expectedCount: 1,
        expectedName: 'Extra Place',
    },
    {
        description: 'skips fully empty rows',
        input: emptyRowsCsv,
        expectedCount: 2,
        expectedName: 'Place A',
    },
];

export const invalidCsvCases = [
    {
        description: 'rejects empty CSV',
        input: emptyCsv,
        expectedError: 'empty',
    },
    {
        description: 'rejects header-only CSV',
        input: headerOnlyCsv,
        expectedError: 'only a header',
    },
    {
        description: 'rejects CSV missing required column (name)',
        input: missingNameColumnCsv,
        expectedError: 'Missing required column',
    },
    {
        description: 'rejects CSV missing required column (city)',
        input: missingCityColumnCsv,
        expectedError: 'Missing required column',
    },
    {
        description: 'rejects CSV with empty required field in row',
        input: emptyRequiredFieldCsv,
        expectedError: 'must not be empty',
    },
    {
        description: 'rejects CSV with multiple empty required fields',
        input: multipleEmptyFieldsCsv,
        expectedError: 'must not be empty',
    },
];
