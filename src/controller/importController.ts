import * as importService from '../modules/import/importService';
import {ImportPayload} from '../modules/import/importSchema';
import {ImportDiff, ImportApplyResult} from '../modules/import/importService';
import {ExpectedError} from '../modules/lib/errors';

const UPLOAD_TEMPLATE = 'import/upload';
const PREVIEW_TEMPLATE = 'import/preview';
const RESULT_TEMPLATE = 'import/result';

// ── Upload & Validate ───────────────────────────────────────

/**
 * Return data for the upload page.
 */
export function getUploadPageData(): {pageTitle: string} {
    return {pageTitle: 'Import Restaurants'};
}

/**
 * Parse and validate uploaded JSON. Returns validated payload and diff
 * data for the preview page, or throws on validation failure.
 */
export async function handleUpload(fileContent: string): Promise<{
    payload: ImportPayload;
    diff: ImportDiff;
    payloadJson: string;
}> {
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
        payload,
        diff,
        payloadJson: JSON.stringify(payload),
    };
}

// ── Preview Data ────────────────────────────────────────────

/**
 * Return template data for the preview page.
 */
export function getPreviewData(diff: ImportDiff, payloadJson: string): object {
    return {
        pageTitle: 'Import Preview',
        diff,
        payloadJson,
    };
}

// ── Apply ───────────────────────────────────────────────────

/**
 * Apply the import from the preview step. Expects the payload JSON
 * that was passed through the hidden form field.
 */
export async function handleApply(payloadJson: string): Promise<{
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
    return {result};
}

/**
 * Return template data for the result page.
 */
export function getResultData(result: ImportApplyResult): object {
    return {
        pageTitle: 'Import Results',
        result,
    };
}
