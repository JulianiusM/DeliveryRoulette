import * as importService from '../modules/import/importService';
import {ImportPayload} from '../modules/import/importSchema';
import {ImportDiff, ImportApplyResult} from '../modules/import/importService';
import {parseCsvBuffer} from '../modules/import/csvParser';
import {ExpectedError} from '../modules/lib/errors';

// ── Upload & Validate ───────────────────────────────────────

/**
 * Return data for the upload page.
 */
export function getUploadPageData(): {pageTitle: string} {
    return {pageTitle: 'Import Restaurants'};
}

/**
 * Detect whether a file buffer is CSV based on the original filename.
 */
function isCsvFile(originalName?: string): boolean {
    return !!originalName && originalName.toLowerCase().endsWith('.csv');
}

/**
 * Parse a JSON file buffer into a validated ImportPayload.
 */
function parseJsonBuffer(fileBuffer: Buffer): ImportPayload {
    const fileContent = fileBuffer.toString('utf-8');

    let parsed: unknown;
    try {
        parsed = JSON.parse(fileContent);
    } catch {
        throw new ExpectedError('Invalid JSON file. Please upload a valid JSON file.', 'error', 400);
    }

    const validation = importService.parseAndValidate(parsed);
    if (!validation.valid || !validation.data) {
        const errorList = validation.errors?.join('; ') ?? 'Unknown validation error';
        throw new ExpectedError(`Validation failed: ${errorList}`, 'error', 400);
    }

    return validation.data;
}

/**
 * Parse a CSV file buffer into a validated ImportPayload.
 */
async function parseCsvFile(fileBuffer: Buffer): Promise<ImportPayload> {
    const csvResult = await parseCsvBuffer(fileBuffer);
    if (!csvResult.valid || !csvResult.data) {
        const errorList = csvResult.errors?.join('; ') ?? 'Unknown CSV parsing error';
        throw new ExpectedError(`CSV parsing failed: ${errorList}`, 'error', 400);
    }

    // Run the payload through the standard schema validation
    const validation = importService.parseAndValidate(csvResult.data);
    if (!validation.valid || !validation.data) {
        const errorList = validation.errors?.join('; ') ?? 'Unknown validation error';
        throw new ExpectedError(`Validation failed: ${errorList}`, 'error', 400);
    }

    return validation.data;
}

/**
 * Parse, validate, and compute diff for an uploaded file buffer.
 * Supports both JSON and CSV files. The file format is detected
 * from the original filename extension.
 * Returns the complete preview template data.
 */
export async function handleUpload(fileBuffer: Buffer | undefined, originalName?: string): Promise<{
    pageTitle: string;
    diff: ImportDiff;
    payloadJson: string;
}> {
    if (!fileBuffer) {
        throw new ExpectedError('Please select a file to upload.', 'error', 400);
    }

    const payload = isCsvFile(originalName)
        ? await parseCsvFile(fileBuffer)
        : parseJsonBuffer(fileBuffer);

    const diff = await importService.computeDiff(payload);

    return {
        pageTitle: 'Import Preview',
        diff,
        payloadJson: JSON.stringify(payload),
    };
}

// ── Apply ───────────────────────────────────────────────────

/**
 * Apply the import from the preview step. Expects the payload JSON
 * that was passed through the hidden form field.
 * Returns the complete result template data.
 */
export async function handleApply(payloadJson: string): Promise<{
    pageTitle: string;
    result: ImportApplyResult;
}> {
    if (!payloadJson) {
        throw new ExpectedError('Missing import payload.', 'error', 400);
    }

    let payload: ImportPayload;
    try {
        payload = JSON.parse(payloadJson) as ImportPayload;
    } catch {
        throw new ExpectedError('Invalid import payload.', 'error', 400);
    }

    // Re-validate before applying
    const validation = importService.parseAndValidate(payload);
    if (!validation.valid || !validation.data) {
        throw new ExpectedError('Import payload is no longer valid.', 'error', 400);
    }

    const result = await importService.applyImport(validation.data);
    return {
        pageTitle: 'Import Results',
        result,
    };
}
