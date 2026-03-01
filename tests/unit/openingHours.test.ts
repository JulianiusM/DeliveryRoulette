import {
    computeIsOpenNowFromOpeningHours,
    resolveRestaurantTimeZone,
} from '../../src/modules/lib/openingHours';
import {
    computeOpenNowData,
    resolveTimeZoneData,
} from '../data/unit/openingHoursData';

describe('openingHours helpers', () => {
    describe('computeIsOpenNowFromOpeningHours', () => {
        test.each(computeOpenNowData)('$description', (testCase) => {
            const result = computeIsOpenNowFromOpeningHours(testCase.openingHours, {
                now: new Date(testCase.nowIso),
                timeZone: testCase.timeZone,
                preferredService: 'delivery',
            });

            expect(result).toBe(testCase.expected);
        });
    });

    describe('resolveRestaurantTimeZone', () => {
        test.each(resolveTimeZoneData)('$description', (testCase) => {
            expect(resolveRestaurantTimeZone(testCase.country)).toBe(testCase.expected);
        });
    });
});
