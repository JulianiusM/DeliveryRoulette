import {
    filterRestaurantsBySearch,
    normalizeRestaurantSearchText,
    tokenizeRestaurantSearch,
} from '../../src/modules/lib/restaurantSearch';
import {
    restaurantSearchCases,
    restaurantSearchRankingCase,
    restaurantSearchRestaurants,
} from '../data/unit/restaurantSearchData';

describe('restaurantSearch helper', () => {
    test('normalizes punctuation and diacritics', () => {
        expect(normalizeRestaurantSearchText(' Caf\u00e9-Cr\u00e8me K\u00f6ln ')).toBe('cafe creme koln');
    });

    test('tokenizes into unique search terms', () => {
        expect(tokenizeRestaurantSearch('pizza pizza berlin')).toEqual(['pizza', 'berlin']);
    });

    test.each(restaurantSearchCases)('$description', ({query, expectedIds}) => {
        const result = filterRestaurantsBySearch(restaurantSearchRestaurants, query);
        expect(result.map((restaurant) => restaurant.id)).toEqual(expectedIds);
    });

    test(restaurantSearchRankingCase.description, () => {
        const result = filterRestaurantsBySearch(restaurantSearchRestaurants, restaurantSearchRankingCase.query);
        expect(result[0]?.id).toBe(restaurantSearchRankingCase.expectedFirstId);
    });

    test('returns original list order for an empty query', () => {
        const result = filterRestaurantsBySearch(restaurantSearchRestaurants, '');
        expect(result.map((restaurant) => restaurant.id)).toEqual(restaurantSearchRestaurants.map((restaurant) => restaurant.id));
    });
});



