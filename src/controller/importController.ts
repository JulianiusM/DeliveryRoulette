import * as importService from '../modules/import/importService';
import {ImportPayload} from '../modules/import/importSchema';
import {ImportDiff, ImportApplyResult} from '../modules/import/importService';
import {ExpectedError} from '../modules/lib/errors';

// ── Upload & Validate ───────────────────────────────────────

/**
 * Return data for the upload page.
 */
export function getUploadPageData(): {pageTitle: string} {
    return {pageTitle: 'Import Restaurants'};
}

/**
 * Parse, validate, and compute diff for an uploaded file buffer.
 * Handles file-missing check, buffer-to-string conversion, JSON
 * parsing, schema validation, and diff computation.
 * Returns the complete preview template data.
 */
export async function handleUpload(fileBuffer: Buffer | undefined): Promise<{
    pageTitle: string;
    diff: ImportDiff;
    payloadJson: string;
}> {
    if (!fileBuffer) {
        throw new ExpectedError('Please select a JSON file to upload.', 'error', 400);
    }

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

    const payload = validation.data;
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
