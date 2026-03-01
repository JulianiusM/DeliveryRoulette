export const cuisineInferenceCases = [
    {
        description: 'keeps provider cuisines as high-confidence entries',
        input: {
            restaurantName: 'House of Flavors',
            providerCuisines: ['Indian', 'Japanese'],
            menuItems: [],
        },
        expectedKeys: ['INDIAN', 'JAPANESE'],
        expectedProviderSources: ['INDIAN', 'JAPANESE'],
    },
    {
        description: 'infers cuisine from menu and category keywords',
        input: {
            restaurantName: 'Spice Garden',
            providerCuisines: [],
            menuItems: [
                {id: 'i1', name: 'Chicken Biryani', categoryName: 'Indian Classics', description: 'with basmati rice'},
                {id: 'i2', name: 'Palak Paneer', categoryName: 'Curry', description: 'spinach and paneer'},
            ],
        },
        expectedKeys: ['INDIAN'],
        expectedProviderSources: [],
    },
];

export const cuisineFilterCases = [
    {
        description: 'matches german alias for indian cuisine',
        query: 'indisch',
        shouldMatch: true,
    },
    {
        description: 'does not match unrelated cuisine query',
        query: 'french',
        shouldMatch: false,
    },
];
