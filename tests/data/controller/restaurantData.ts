/**
 * Test data for restaurant controller tests
 */

export const createRestaurantValidData = [
    {
        description: 'creates restaurant with all fields',
        input: {
            name: 'Pizza Palace',
            addressLine1: '123 Main St',
            addressLine2: 'Suite 4',
            city: 'Springfield',
            postalCode: '12345',
            country: 'USA',
        },
        expected: {
            name: 'Pizza Palace',
            addressLine1: '123 Main St',
            addressLine2: 'Suite 4',
            city: 'Springfield',
            postalCode: '12345',
            country: 'USA',
        },
    },
    {
        description: 'creates restaurant with only required fields',
        input: {
            name: 'Burger Barn',
            addressLine1: '456 Oak Ave',
            city: 'Shelbyville',
            postalCode: '67890',
        },
        expected: {
            name: 'Burger Barn',
            addressLine1: '456 Oak Ave',
            addressLine2: null,
            city: 'Shelbyville',
            postalCode: '67890',
            country: '',
        },
    },
    {
        description: 'trims whitespace from inputs',
        input: {
            name: '  Taco Town  ',
            addressLine1: '  789 Elm St  ',
            city: '  Ogdenville  ',
            postalCode: '  11111  ',
            country: '  Mexico  ',
        },
        expected: {
            name: 'Taco Town',
            addressLine1: '789 Elm St',
            addressLine2: null,
            city: 'Ogdenville',
            postalCode: '11111',
            country: 'Mexico',
        },
    },
];

export const createRestaurantInvalidData = [
    {
        description: 'rejects empty name',
        input: {
            name: '',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
        },
        expectedError: 'Name is required.',
    },
    {
        description: 'rejects missing name',
        input: {
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
        },
        expectedError: 'Name is required.',
    },
    {
        description: 'rejects empty address line 1',
        input: {
            name: 'Pizza Palace',
            addressLine1: '',
            city: 'Springfield',
            postalCode: '12345',
        },
        expectedError: 'Address line 1 is required.',
    },
    {
        description: 'rejects missing address line 1',
        input: {
            name: 'Pizza Palace',
            city: 'Springfield',
            postalCode: '12345',
        },
        expectedError: 'Address line 1 is required.',
    },
    {
        description: 'rejects empty city',
        input: {
            name: 'Pizza Palace',
            addressLine1: '123 Main St',
            city: '',
            postalCode: '12345',
        },
        expectedError: 'City is required.',
    },
    {
        description: 'rejects empty postal code',
        input: {
            name: 'Pizza Palace',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '',
        },
        expectedError: 'Postal code is required.',
    },
];

export const updateRestaurantValidData = [
    {
        description: 'updates restaurant with all fields',
        input: {
            name: 'New Pizza Palace',
            addressLine1: '999 New St',
            addressLine2: 'Floor 2',
            city: 'New Springfield',
            postalCode: '99999',
            country: 'Canada',
            isActive: 'on',
        },
        expected: {
            name: 'New Pizza Palace',
            addressLine1: '999 New St',
            addressLine2: 'Floor 2',
            city: 'New Springfield',
            postalCode: '99999',
            country: 'Canada',
            isActive: true,
        },
    },
    {
        description: 'sets isActive to false when checkbox not submitted',
        input: {
            name: 'Closed Restaurant',
            addressLine1: '1 Closed St',
            city: 'Ghosttown',
            postalCode: '00000',
        },
        expected: {
            name: 'Closed Restaurant',
            addressLine1: '1 Closed St',
            addressLine2: null,
            city: 'Ghosttown',
            postalCode: '00000',
            country: '',
            isActive: false,
        },
    },
];

export const updateRestaurantInvalidData = [
    {
        description: 'rejects empty name on update',
        input: {
            name: '',
            addressLine1: '123 Main St',
            city: 'Springfield',
            postalCode: '12345',
        },
        expectedError: 'Name is required.',
    },
    {
        description: 'rejects empty city on update',
        input: {
            name: 'Valid Name',
            addressLine1: '123 Main St',
            city: '',
            postalCode: '12345',
        },
        expectedError: 'City is required.',
    },
];

export const restaurantListDietFilterData = [
    {
        description: 'filters restaurants to a single selected diet',
        selectedDietTagIds: ['tag-vegan'],
        suitabilityByRestaurant: {
            'r-vegan': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference', inference: {score: 82, confidence: 'HIGH'}},
            ],
            'r-plain': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: false, source: 'none'},
            ],
        },
        expectedRestaurantIds: ['r-vegan'],
    },
    {
        description: 'requires all selected diets to be supported',
        selectedDietTagIds: ['tag-vegan', 'tag-gf'],
        suitabilityByRestaurant: {
            'r-both': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference', inference: {score: 90, confidence: 'HIGH'}},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: true, source: 'override'},
            ],
            'r-one': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference', inference: {score: 75, confidence: 'MEDIUM'}},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: false, source: 'none'},
            ],
        },
        expectedRestaurantIds: ['r-both'],
    },
];

export const restaurantListSortData = [
    {
        description: 'sorts selected diets by weakest score and keeps manual confirmations at the top',
        selectedDietTagIds: ['tag-vegan', 'tag-gf'],
        sort: 'selected_diet_score',
        suitabilityByRestaurant: {
            'r-balanced': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference', inference: {score: 74, confidence: 'MEDIUM'}},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: true, source: 'inference', inference: {score: 72, confidence: 'MEDIUM'}},
            ],
            'r-verified': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'override'},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: true, source: 'inference', inference: {score: 88, confidence: 'HIGH'}},
            ],
            'r-low': [
                {dietTagId: 'tag-vegan', dietTagKey: 'VEGAN', dietTagLabel: 'Vegan', supported: true, source: 'inference', inference: {score: 60, confidence: 'LOW'}},
                {dietTagId: 'tag-gf', dietTagKey: 'GLUTEN_FREE', dietTagLabel: 'Gluten Free', supported: true, source: 'inference', inference: {score: 65, confidence: 'LOW'}},
            ],
        },
        expectedRestaurantIds: ['r-verified', 'r-balanced', 'r-low'],
    },
];
