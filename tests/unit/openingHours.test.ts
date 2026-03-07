import {
    computeIsOpenNowFromOpeningHours,
    getOpeningHoursPresentation,
    resolveRestaurantTimeZone,
} from '../../src/modules/lib/openingHours';
import {
    computeOpenNowData,
    openingHoursPresentationData,
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

    describe('getOpeningHoursPresentation', () => {
        test.each(openingHoursPresentationData)('$description', (testCase) => {
            const result = getOpeningHoursPresentation(testCase.openingHours, {
                now: new Date(testCase.nowIso),
                timeZone: testCase.timeZone,
                preferredService: 'delivery',
            });

            expect(result.status.state).toBe(testCase.expected.state);
            expect(result.status.summaryLabel).toBe(testCase.expected.summaryLabel);
            expect(result.status.detailLabel).toBe(testCase.expected.detailLabel);
            expect(result.status.relativeLabel).toBe(testCase.expected.relativeLabel);

            if (testCase.expected.firstServiceKey) {
                expect(result.services[0]?.serviceKey).toBe(testCase.expected.firstServiceKey);
            }
            if (testCase.expected.firstDayLabel) {
                expect(result.services[0]?.days[0]?.dayLabel).toBe(testCase.expected.firstDayLabel);
            }
            if (testCase.expected.firstDayRange) {
                expect(result.services[0]?.days[0]?.rangeLabels[0]).toBe(testCase.expected.firstDayRange);
            }
        });
    });
});
