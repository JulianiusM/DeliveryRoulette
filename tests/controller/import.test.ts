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

// Mock the CSV parser
jest.mock('../../src/modules/import/csvParser');
import {parseCsvBuffer} from '../../src/modules/import/csvParser';

const mockParseAndValidate = importService.parseAndValidate as jest.Mock;
const mockComputeDiff = importService.computeDiff as jest.Mock;
const mockApplyImport = importService.applyImport as jest.Mock;
const mockParseCsvBuffer = parseCsvBuffer as jest.Mock;

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

            const fileBuffer = Buffer.from(testCase.fileContent, 'utf-8');
            const result = await importController.handleUpload(fileBuffer);

            expect(result.pageTitle).toBe('Import Preview');
            expect(result.diff).toEqual(sampleDiff);
            expect(result.payloadJson).toBeTruthy();
            expect(mockParseAndValidate).toHaveBeenCalled();
            expect(mockComputeDiff).toHaveBeenCalledWith(parsed);
        });

        test('rejects missing file buffer', async () => {
            await expect(
                importController.handleUpload(undefined),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleUpload(undefined),
            ).rejects.toMatchObject({
                message: expect.stringContaining('select a file'),
            });
        });

        test.each(uploadInvalidCases)('$description', async (testCase) => {
            if (testCase.fileContent !== '{not valid') {
                mockParseAndValidate.mockReturnValue({
                    valid: false,
                    errors: ['some error'],
                });
            }

            const fileBuffer = Buffer.from(testCase.fileContent, 'utf-8');

            await expect(
                importController.handleUpload(fileBuffer),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleUpload(Buffer.from(testCase.fileContent, 'utf-8')),
            ).rejects.toMatchObject({
                message: expect.stringContaining(testCase.expectedError),
            });
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

            expect(result.pageTitle).toBe('Import Results');
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

    describe('handleUpload – CSV files', () => {
        const csvPayload = {
            version: 1,
            restaurants: [{name: 'CSV Place', addressLine1: '1 St', city: 'Berlin', postalCode: '10115'}],
        };

        test('handles valid CSV file upload', async () => {
            mockParseCsvBuffer.mockResolvedValue({valid: true, data: csvPayload});
            mockParseAndValidate.mockReturnValue({valid: true, data: csvPayload});
            mockComputeDiff.mockResolvedValue(sampleDiff);

            const fileBuffer = Buffer.from('name,addressLine1,city,postalCode\nCSV Place,1 St,Berlin,10115', 'utf-8');
            const result = await importController.handleUpload(fileBuffer, 'restaurants.csv');

            expect(result.pageTitle).toBe('Import Preview');
            expect(result.diff).toEqual(sampleDiff);
            expect(mockParseCsvBuffer).toHaveBeenCalledWith(fileBuffer);
            expect(mockParseAndValidate).toHaveBeenCalledWith(csvPayload);
        });

        test('rejects invalid CSV file', async () => {
            mockParseCsvBuffer.mockResolvedValue({valid: false, errors: ['CSV column missing']});

            const fileBuffer = Buffer.from('bad,data\n1,2', 'utf-8');

            await expect(
                importController.handleUpload(fileBuffer, 'bad.csv'),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleUpload(fileBuffer, 'bad.csv'),
            ).rejects.toMatchObject({
                message: expect.stringContaining('CSV parsing failed'),
            });
        });

        test('rejects CSV that passes parsing but fails schema validation', async () => {
            mockParseCsvBuffer.mockResolvedValue({valid: true, data: csvPayload});
            mockParseAndValidate.mockReturnValue({valid: false, errors: ['name too long']});

            const fileBuffer = Buffer.from('name,addressLine1,city,postalCode\nX,1 St,Berlin,10115', 'utf-8');

            await expect(
                importController.handleUpload(fileBuffer, 'test.csv'),
            ).rejects.toThrow(ExpectedError);

            await expect(
                importController.handleUpload(fileBuffer, 'test.csv'),
            ).rejects.toMatchObject({
                message: expect.stringContaining('Validation failed'),
            });
        });

        test('uses JSON parser when filename is .json', async () => {
            const parsed = JSON.parse(validPayloadJson);
            mockParseAndValidate.mockReturnValue({valid: true, data: parsed});
            mockComputeDiff.mockResolvedValue(sampleDiff);

            const fileBuffer = Buffer.from(validPayloadJson, 'utf-8');
            await importController.handleUpload(fileBuffer, 'import.json');

            expect(mockParseCsvBuffer).not.toHaveBeenCalled();
            expect(mockParseAndValidate).toHaveBeenCalled();
        });

        test('uses JSON parser when no filename is provided', async () => {
            const parsed = JSON.parse(validPayloadJson);
            mockParseAndValidate.mockReturnValue({valid: true, data: parsed});
            mockComputeDiff.mockResolvedValue(sampleDiff);

            const fileBuffer = Buffer.from(validPayloadJson, 'utf-8');
            await importController.handleUpload(fileBuffer);

            expect(mockParseCsvBuffer).not.toHaveBeenCalled();
            expect(mockParseAndValidate).toHaveBeenCalled();
        });
    });
});
