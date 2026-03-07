export const restaurantSearchRestaurants = [
    {
        id: 'r1',
        name: 'Pizza Palace',
        city: 'Berlin',
        country: 'DE',
        addressLine1: 'Hauptstrasse 12',
        addressLine2: null,
        postalCode: '10115',
    },
    {
        id: 'r2',
        name: 'Burger Town',
        city: 'Munich',
        country: 'DE',
        addressLine1: 'Ring 4',
        addressLine2: null,
        postalCode: '80331',
    },
    {
        id: 'r3',
        name: 'Cafe Creme',
        city: 'Koln',
        country: 'DE',
        addressLine1: 'Domplatz 1',
        addressLine2: null,
        postalCode: '50667',
    },
    {
        id: 'r4',
        name: 'Sushi House',
        city: 'Bremen',
        country: 'DE',
        addressLine1: 'Am Markt 7',
        addressLine2: null,
        postalCode: '28195',
    },
];

export const restaurantSearchCases = [
    {
        description: 'matches tokens across name and city with typo tolerance',
        query: 'pizza berln',
        expectedIds: ['r1'],
    },
    {
        description: 'matches fuzzy typos in restaurant name tokens',
        query: 'piza palce',
        expectedIds: ['r1'],
    },
    {
        description: 'matches normalized diacritic-free city and name tokens',
        query: 'cafe koln',
        expectedIds: ['r3'],
    },
    {
        description: 'matches address tokens as part of the search corpus',
        query: 'haupt 10115',
        expectedIds: ['r1'],
    },
    {
        description: 'requires all search tokens to match somewhere',
        query: 'pizza munich',
        expectedIds: [],
    },
];

export const restaurantSearchRankingCase = {
    description: 'ranks stronger exact name hits ahead of weaker token matches',
    query: 'sushi',
    expectedFirstId: 'r4',
};

