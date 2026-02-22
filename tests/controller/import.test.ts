/**
 * Controller tests for ImportController
 * Tests validation, diff, and apply orchestration
 */

import {
    uploadValidCases,
    uploadInvalidCases,
    applyInvalidCases,
    validPayloadJson,
} from '../data/controller/importData';
import {setupMock} from '../keywords/common/controllerKeywords';
import {ExpectedError} from '../../src/modules/lib/errors';

// Mock the import service
jest.mock('../../src/modules/import/importService');
import * as importService from '../../src/modules/import/importService';

const mockParseAndValidate = importService.parseAndValidate as jest.Mock;
const mockComputeDiff = importService.computeDiff as jest.Mock;
const mockApplyImport = importService.applyImport as jest.Mock;

// Import controller after mocking
import * as importController from '../../src/controller/importController';

const sampleDiff: importService.ImportDiff = {
    restaurants: [
        {
            name: 'Test Restaurant',
            action: 'new',
            fieldChanges: [],
            categories: [],
            providerRefs: [],
            dietTags: [],
        },
    ],
    totalNew: 1,
    totalUpdated: 0,
    totalUnchanged: 0,
};

const sampleApplyResult: importService.ImportApplyResult = {
    restaurants: [{name: 'Test Restaurant', action: 'new', success: true}],
    successCount: 1,
    errorCount: 0,
};

describe('ImportController', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('getUploadPageData', () => {
        test('returns upload page data', () => {
            const result = importController.getUploadPageData();
            expect(result.pageTitle).toBe('Import Restaurants');
        });
    });

    describe('handleUpload', () => {
        test.each(uploadValidCases)('$description', async (testCase) => {
            const parsed = JSON.parse(testCase.fileContent);
            mockParseAndValidate.mockReturnValue({valid: true, data: parsed});
            mockComputeDiff.mockResolvedValue(sampleDiff);

            const result = await importController.handleUpload(testCase.fileContent);

            expect(result.payload).toEqual(parsed);
            expect(result.diff).toEqual(sampleDiff);
            expect(result.payloadJson).toBeTruthy();
            expect(mockParseAndValidate).toHaveBeenCalled();
            expect(mockComputeDiff).toHaveBeenCalledWith(parsed);
        });

        test.each(uploadInvalidCases)('$description', async (testCase) => {
            if (testCase.fileContent !== '{not valid') {
                mockParseAndValidate.mockReturnValue({
                    valid: false,
                    errors: ['some error'],
                });
            }

            await expect(
                importController.handleUpload(testCase.fileContent),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleUpload(testCase.fileContent),
            ).rejects.toMatchObject({
                message: expect.stringContaining(testCase.expectedError),
            });
        });
    });

    describe('getPreviewData', () => {
        test('returns preview data with diff and payloadJson', () => {
            const result = importController.getPreviewData(sampleDiff, validPayloadJson) as any;

            expect(result.pageTitle).toBe('Import Preview');
            expect(result.diff).toEqual(sampleDiff);
            expect(result.payloadJson).toBe(validPayloadJson);
        });
    });

    describe('handleApply', () => {
        test('applies valid import payload', async () => {
            mockParseAndValidate.mockReturnValue({
                valid: true,
                data: JSON.parse(validPayloadJson),
            });
            mockApplyImport.mockResolvedValue(sampleApplyResult);

            const result = await importController.handleApply(validPayloadJson);

            expect(result.result).toEqual(sampleApplyResult);
            expect(mockParseAndValidate).toHaveBeenCalled();
            expect(mockApplyImport).toHaveBeenCalled();
        });

        test.each(applyInvalidCases)('$description', async (testCase) => {
            if (testCase.payloadJson && testCase.payloadJson !== '{not valid') {
                mockParseAndValidate.mockReturnValue({
                    valid: false,
                    errors: ['validation error'],
                });
            }

            await expect(
                importController.handleApply(testCase.payloadJson),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleApply(testCase.payloadJson),
            ).rejects.toMatchObject({
                message: expect.stringContaining(testCase.expectedError),
            });
        });
    });

    describe('getResultData', () => {
        test('returns result data', () => {
            const result = importController.getResultData(sampleApplyResult) as any;

            expect(result.pageTitle).toBe('Import Results');
            expect(result.result).toEqual(sampleApplyResult);
        });
    });
});
