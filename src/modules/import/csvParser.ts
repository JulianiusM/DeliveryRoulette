import {Readable} from 'node:stream';
import CsvReadableStream from 'csv-reader';
import {ImportPayload, ImportRestaurant, CURRENT_SCHEMA_VERSION} from './importSchema';

/* ------------------------------------------------------------------ */
/*  Column name aliases → canonical ImportRestaurant field             */
/* ------------------------------------------------------------------ */

/**
 * Maps CSV header names (lower-cased) to ImportRestaurant field names.
 * Multiple aliases are supported for each field to handle common CSV
 * naming conventions (camelCase, snake_case, short-hand).
 */
const COLUMN_ALIASES: Record<string, keyof ImportRestaurant> = {
    'name': 'name',
    'restaurant': 'name',
    'restaurant_name': 'name',
    'restaurantname': 'name',

    'addressline1': 'addressLine1',
    'address_line_1': 'addressLine1',
    'address_line1': 'addressLine1',
    'address1': 'addressLine1',
    'address': 'addressLine1',

    'addressline2': 'addressLine2',
    'address_line_2': 'addressLine2',
    'address_line2': 'addressLine2',
    'address2': 'addressLine2',

    'city': 'city',
    'town': 'city',

    'postalcode': 'postalCode',
    'postal_code': 'postalCode',
    'zip': 'postalCode',
    'zipcode': 'postalCode',
    'zip_code': 'postalCode',
    'postcode': 'postalCode',

    'country': 'country',

    'diettags': 'dietTags',
    'diet_tags': 'dietTags',
    'tags': 'dietTags',
    'diet': 'dietTags',
};

/** Fields that are required for a valid restaurant row. */
const REQUIRED_FIELDS: ReadonlyArray<keyof ImportRestaurant> = [
    'name',
    'addressLine1',
    'city',
    'postalCode',
];

/* ------------------------------------------------------------------ */
/*  CSV parse result type                                              */
/* ------------------------------------------------------------------ */

export interface CsvParseResult {
    valid: boolean;
    data?: ImportPayload;
    errors?: string[];
}

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Resolve a raw CSV header to its canonical ImportRestaurant field name.
 * Returns `undefined` when the header doesn't match any known alias.
 */
function resolveHeader(raw: string): keyof ImportRestaurant | undefined {
    return COLUMN_ALIASES[raw.toLowerCase().trim()];
}

/**
 * Parse a CSV buffer and convert it into an `ImportPayload`.
 *
 * The first row **must** be a header row whose column names map to
 * restaurant fields via the alias table defined above.  Columns that
 * do not match any alias are silently ignored.
 *
 * The `dietTags` column is split on semicolons (`;`) so that multiple
 * tags can be specified in a single cell.
 *
 * Returns a `CsvParseResult` with either the parsed payload or a list
 * of human-readable error strings.
 */
export async function parseCsvBuffer(buffer: Buffer): Promise<CsvParseResult> {
    const rows = await readCsvRows(buffer);

    if (rows.length === 0) {
        return {valid: false, errors: ['CSV file is empty or contains only a header row.']};
    }

    const headerRow = rows[0];
    const headerMapping = resolveHeaderRow(headerRow);

    if (headerMapping.errors.length > 0) {
        return {valid: false, errors: headerMapping.errors};
    }

    const dataRows = rows.slice(1);
    if (dataRows.length === 0) {
        return {valid: false, errors: ['CSV file contains only a header row and no data rows.']};
    }

    const restaurants: ImportRestaurant[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const rowNum = i + 2; // +2 because row 1 is header, array is 0-indexed
        const row = dataRows[i];

        // Skip fully empty rows
        if (row.every((cell) => String(cell).trim() === '')) continue;

        const result = mapRow(row, headerMapping.mapping, rowNum);
        if (result.errors.length > 0) {
            errors.push(...result.errors);
        } else if (result.restaurant) {
            restaurants.push(result.restaurant);
        }
    }

    if (errors.length > 0) {
        return {valid: false, errors};
    }

    if (restaurants.length === 0) {
        return {valid: false, errors: ['CSV file contains no valid restaurant rows.']};
    }

    return {
        valid: true,
        data: {
            version: CURRENT_SCHEMA_VERSION,
            restaurants,
        },
    };
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read all rows from a CSV buffer using csv-reader.
 * Returns an array of string arrays (including the header row).
 */
function readCsvRows(buffer: Buffer): Promise<Array<Array<string | number | boolean>>> {
    return new Promise((resolve, reject) => {
        const rows: Array<Array<string | number | boolean>> = [];
        const stream = Readable.from(buffer.toString('utf-8'));

        stream
            .pipe(new CsvReadableStream({trim: true, skipEmptyLines: true}))
            .on('data', (row: Array<string | number | boolean>) => {
                rows.push(row);
            })
            .on('end', () => resolve(rows))
            .on('error', (err: Error) => reject(err));
    });
}

interface HeaderMapping {
    /** Column index → ImportRestaurant field name */
    mapping: Map<number, keyof ImportRestaurant>;
    errors: string[];
}

/**
 * Analyse the header row. Returns a column-index-to-field mapping and
 * any errors (e.g. missing required columns).
 */
function resolveHeaderRow(headerRow: Array<string | number | boolean>): HeaderMapping {
    const mapping = new Map<number, keyof ImportRestaurant>();
    const errors: string[] = [];

    for (let i = 0; i < headerRow.length; i++) {
        const field = resolveHeader(String(headerRow[i]));
        if (field) {
            mapping.set(i, field);
        }
        // Unknown columns are silently ignored
    }

    // Check that all required fields are present in the header
    const mappedFields = new Set(mapping.values());
    for (const req of REQUIRED_FIELDS) {
        if (!mappedFields.has(req)) {
            errors.push(`Missing required column: "${req}". Accepted aliases: ${getAliasesForField(req).join(', ')}`);
        }
    }

    return {mapping, errors};
}

/** Get the list of CSV header aliases for a given field. */
function getAliasesForField(field: keyof ImportRestaurant): string[] {
    return Object.entries(COLUMN_ALIASES)
        .filter(([, v]) => v === field)
        .map(([k]) => k);
}

interface RowResult {
    restaurant?: ImportRestaurant;
    errors: string[];
}

/**
 * Map a single data row to an ImportRestaurant, validating required
 * fields are non-empty.
 */
function mapRow(
    row: Array<string | number | boolean>,
    mapping: Map<number, keyof ImportRestaurant>,
    rowNum: number,
): RowResult {
    const errors: string[] = [];
    const raw: Partial<Record<keyof ImportRestaurant, string>> = {};

    for (const [colIdx, field] of mapping) {
        const cellValue = colIdx < row.length ? String(row[colIdx]).trim() : '';
        raw[field] = cellValue;
    }

    // Validate required fields are non-empty
    for (const req of REQUIRED_FIELDS) {
        if (!raw[req]) {
            errors.push(`Row ${rowNum}: "${req}" must not be empty.`);
        }
    }

    if (errors.length > 0) {
        return {errors};
    }

    // Build the restaurant object
    const restaurant: ImportRestaurant = {
        name: raw.name!,
        addressLine1: raw.addressLine1!,
        city: raw.city!,
        postalCode: raw.postalCode!,
    };

    if (raw.addressLine2) {
        restaurant.addressLine2 = raw.addressLine2;
    }
    if (raw.country) {
        restaurant.country = raw.country;
    }
    if (raw.dietTags) {
        const tags = raw.dietTags.split(';').map((t) => t.trim()).filter(Boolean);
        if (tags.length > 0) {
            restaurant.dietTags = tags;
        }
    }

    return {restaurant, errors: []};
}
