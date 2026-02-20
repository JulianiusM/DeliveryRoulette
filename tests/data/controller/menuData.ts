/**
 * Test data for menu controller tests
 */

// ── Category test data ──────────────────────────────────────

export const createCategoryValidData = [
    {
        description: 'creates category with name only',
        input: {name: 'Appetizers'},
        expected: {
            name: 'Appetizers',
            sortOrder: 0,
        },
    },
    {
        description: 'creates category with name and sort order',
        input: {name: 'Main Courses', sortOrder: '2'},
        expected: {
            name: 'Main Courses',
            sortOrder: 2,
        },
    },
    {
        description: 'trims whitespace from name',
        input: {name: '  Desserts  '},
        expected: {
            name: 'Desserts',
            sortOrder: 0,
        },
    },
];

export const createCategoryInvalidData = [
    {
        description: 'rejects empty category name',
        input: {name: ''},
        expectedError: 'Category name is required.',
    },
    {
        description: 'rejects missing category name',
        input: {},
        expectedError: 'Category name is required.',
    },
    {
        description: 'rejects whitespace-only category name',
        input: {name: '   '},
        expectedError: 'Category name is required.',
    },
];

export const updateCategoryValidData = [
    {
        description: 'updates category with all fields',
        input: {name: 'Updated Appetizers', sortOrder: '3', isActive: 'on'},
        expected: {
            name: 'Updated Appetizers',
            sortOrder: 3,
            isActive: true,
        },
    },
    {
        description: 'sets isActive to false when checkbox not submitted',
        input: {name: 'Inactive Category', sortOrder: '1'},
        expected: {
            name: 'Inactive Category',
            sortOrder: 1,
            isActive: false,
        },
    },
];

export const updateCategoryInvalidData = [
    {
        description: 'rejects empty name on category update',
        input: {name: '', sortOrder: '0'},
        expectedError: 'Category name is required.',
    },
];

// ── Item test data ──────────────────────────────────────────

export const createItemValidData = [
    {
        description: 'creates item with all fields',
        input: {
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with caesar dressing',
            price: '12.99',
            currency: 'EUR',
        },
        expected: {
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with caesar dressing',
            price: 12.99,
            currency: 'EUR',
        },
    },
    {
        description: 'creates item with name only',
        input: {name: 'Water'},
        expected: {
            name: 'Water',
            description: null,
            price: null,
            currency: null,
        },
    },
    {
        description: 'trims whitespace from item fields',
        input: {
            name: '  Pasta  ',
            description: '  Homemade  ',
            price: '9.50',
            currency: ' USD ',
        },
        expected: {
            name: 'Pasta',
            description: 'Homemade',
            price: 9.50,
            currency: 'USD',
        },
    },
];

export const createItemInvalidData = [
    {
        description: 'rejects empty item name',
        input: {name: ''},
        expectedError: 'Item name is required.',
    },
    {
        description: 'rejects missing item name',
        input: {},
        expectedError: 'Item name is required.',
    },
    {
        description: 'rejects invalid price',
        input: {name: 'Bad Item', price: 'abc'},
        expectedError: 'Price must be a valid number.',
    },
    {
        description: 'rejects currency longer than 3 chars',
        input: {name: 'Bad Item', price: '10', currency: 'EURO'},
        expectedError: 'Currency code must be at most 3 characters.',
    },
    {
        description: 'rejects currency longer than 3 chars without price',
        input: {name: 'Bad Item', currency: 'EURO'},
        expectedError: 'Currency code must be at most 3 characters.',
    },
];

export const updateItemValidData = [
    {
        description: 'updates item with all fields',
        input: {
            name: 'Updated Salad',
            description: 'Updated description',
            price: '15.99',
            currency: 'USD',
            sortOrder: '1',
            isActive: 'on',
        },
        expected: {
            name: 'Updated Salad',
            description: 'Updated description',
            price: 15.99,
            currency: 'USD',
            sortOrder: 1,
            isActive: true,
        },
    },
    {
        description: 'sets isActive to false when checkbox not submitted',
        input: {name: 'Inactive Item', sortOrder: '0'},
        expected: {
            name: 'Inactive Item',
            description: null,
            price: null,
            currency: null,
            sortOrder: 0,
            isActive: false,
        },
    },
];

export const updateItemInvalidData = [
    {
        description: 'rejects empty name on item update',
        input: {name: ''},
        expectedError: 'Item name is required.',
    },
    {
        description: 'rejects invalid price on item update',
        input: {name: 'Valid', price: 'notanumber'},
        expectedError: 'Price must be a valid number.',
    },
];
