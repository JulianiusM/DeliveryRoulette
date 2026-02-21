/**
 * Controller tests for SuggestionController
 * Tests validation and business logic delegation
 */

import {
    sampleDietTags,
    processSuggestionValidData,
    processSuggestionNoMatchData,
    formDataDefaults,
} from '../data/controller/suggestionData';
import {setupMock} from '../keywords/common/controllerKeywords';
import {APIError} from '../../src/modules/lib/errors';

// Mock the SuggestionService
jest.mock('../../src/modules/database/services/SuggestionService');
import * as suggestionService from '../../src/modules/database/services/SuggestionService';

// Mock the SuggestionHistoryService
jest.mock('../../src/modules/database/services/SuggestionHistoryService');
import * as suggestionHistoryService from '../../src/modules/database/services/SuggestionHistoryService';

// Mock the UserDietPreferenceService
jest.mock('../../src/modules/database/services/UserDietPreferenceService');
import * as userDietPrefService from '../../src/modules/database/services/UserDietPreferenceService';

// Mock the UserPreferenceService
jest.mock('../../src/modules/database/services/UserPreferenceService');
import * as userPrefService from '../../src/modules/database/services/UserPreferenceService';

// Mock the UserRestaurantPreferenceService
jest.mock('../../src/modules/database/services/UserRestaurantPreferenceService');
import * as userRestaurantPrefService from '../../src/modules/database/services/UserRestaurantPreferenceService';

const mockSuggest = suggestionService.suggest as jest.Mock;
const mockGetRecentRestaurantIds = suggestionHistoryService.getRecentRestaurantIds as jest.Mock;
const mockRecordSuggestion = suggestionHistoryService.recordSuggestion as jest.Mock;
const mockGetAllDietTags = userDietPrefService.getAllDietTags as jest.Mock;
const mockGetEffectiveDietFilterIds = userDietPrefService.getEffectiveDietFilterIds as jest.Mock;
const mockGetByUserId = userPrefService.getByUserId as jest.Mock;
const mockGetDoNotSuggestRestaurantIds = userRestaurantPrefService.getDoNotSuggestRestaurantIds as jest.Mock;

// Import controller after mocking
import * as suggestionController from '../../src/controller/suggestionController';

describe('SuggestionController', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        // Default: no recent history
        mockGetRecentRestaurantIds.mockResolvedValue([]);
        mockRecordSuggestion.mockResolvedValue({});
        // Default: no do-not-suggest restaurants
        mockGetDoNotSuggestRestaurantIds.mockResolvedValue([]);
    });

    describe('getSuggestionFormData', () => {
        test('returns form data with diet tags for logged-in user', async () => {
            setupMock(mockGetAllDietTags, sampleDietTags);
            setupMock(mockGetEffectiveDietFilterIds, ['tag-vegan', 'tag-vegetarian']);
            setupMock(mockGetByUserId, {
                cuisineIncludes: 'Italian, Sushi',
                cuisineExcludes: 'Fast Food',
            });

            const result = await suggestionController.getSuggestionFormData(formDataDefaults.userId);

            expect(result.dietTags).toHaveLength(formDataDefaults.expectedDietTagCount);
            expect(result.selectedDietTagIds).toHaveLength(formDataDefaults.expectedSelectedCount);
            expect(result.cuisineIncludes).toBe('Italian, Sushi');
            expect(result.cuisineExcludes).toBe('Fast Food');
        });

        test('returns empty defaults for anonymous user', async () => {
            setupMock(mockGetAllDietTags, sampleDietTags);

            const result = await suggestionController.getSuggestionFormData(undefined);

            expect(result.dietTags).toHaveLength(3);
            expect(result.selectedDietTagIds).toHaveLength(0);
            expect(result.cuisineIncludes).toBe('');
            expect(result.cuisineExcludes).toBe('');
            expect(mockGetEffectiveDietFilterIds).not.toHaveBeenCalled();
            expect(mockGetByUserId).not.toHaveBeenCalled();
        });
    });

    describe('processSuggestion', () => {
        test.each(processSuggestionValidData)('$description', async (testCase) => {
            setupMock(mockSuggest, testCase.suggestResult);

            const result = await suggestionController.processSuggestion(testCase.input);

            expect(result.restaurant.name).toBe(testCase.expectedRestaurantName);
            expect(result.restaurant.id).toBeDefined();
            expect(result.reason).toBeDefined();
            expect(result.reason.totalCandidates).toBeGreaterThan(0);
        });

        test.each(processSuggestionNoMatchData)('$description', async (testCase) => {
            setupMock(mockSuggest, null);

            await expect(
                suggestionController.processSuggestion(testCase.input)
            ).rejects.toThrow(APIError);

            await expect(
                suggestionController.processSuggestion(testCase.input)
            ).rejects.toMatchObject({
                message: expect.stringContaining('No restaurants match'),
            });
        });

        test('filters empty dietTagIds', async () => {
            setupMock(mockSuggest, {
                restaurant: {id: 'r1', name: 'Test'},
                reason: {matchedDiets: [], totalCandidates: 1},
            });

            await suggestionController.processSuggestion({dietTagIds: ['', 'tag-vegan', '']});

            expect(mockSuggest).toHaveBeenCalledWith(
                expect.objectContaining({
                    dietTagIds: ['tag-vegan'],
                })
            );
        });

        test('passes recent restaurant IDs as excludeRestaurantIds', async () => {
            mockGetRecentRestaurantIds.mockResolvedValue(['r-old-1', 'r-old-2']);
            setupMock(mockSuggest, {
                restaurant: {id: 'r-new', name: 'New Place'},
                reason: {matchedDiets: [], totalCandidates: 1},
            });

            await suggestionController.processSuggestion({}, 42);

            expect(mockGetRecentRestaurantIds).toHaveBeenCalledWith(42);
            expect(mockSuggest).toHaveBeenCalledWith(
                expect.objectContaining({
                    excludeRestaurantIds: ['r-old-1', 'r-old-2'],
                })
            );
        });

        test('records suggestion in history after successful result', async () => {
            setupMock(mockSuggest, {
                restaurant: {id: 'r1', name: 'Pizza Palace'},
                reason: {matchedDiets: [], totalCandidates: 1},
            });

            await suggestionController.processSuggestion({}, 7);

            expect(mockRecordSuggestion).toHaveBeenCalledWith('r1', 7);
        });

        test('does not record history when no match found', async () => {
            setupMock(mockSuggest, null);

            await expect(
                suggestionController.processSuggestion({})
            ).rejects.toThrow(APIError);

            expect(mockRecordSuggestion).not.toHaveBeenCalled();
        });

        test('passes do-not-suggest restaurant IDs for logged-in user', async () => {
            mockGetDoNotSuggestRestaurantIds.mockResolvedValue(['r-blocked-1']);
            setupMock(mockSuggest, {
                restaurant: {id: 'r-ok', name: 'Good Place'},
                reason: {matchedDiets: [], totalCandidates: 1},
            });

            await suggestionController.processSuggestion({}, 10);

            expect(mockGetDoNotSuggestRestaurantIds).toHaveBeenCalledWith(10);
            expect(mockSuggest).toHaveBeenCalledWith(
                expect.objectContaining({
                    doNotSuggestIds: ['r-blocked-1'],
                })
            );
        });

        test('passes empty do-not-suggest list for anonymous user', async () => {
            setupMock(mockSuggest, {
                restaurant: {id: 'r1', name: 'Test'},
                reason: {matchedDiets: [], totalCandidates: 1},
            });

            await suggestionController.processSuggestion({});

            expect(mockGetDoNotSuggestRestaurantIds).not.toHaveBeenCalled();
            expect(mockSuggest).toHaveBeenCalledWith(
                expect.objectContaining({
                    doNotSuggestIds: [],
                })
            );
        });
    });
});
