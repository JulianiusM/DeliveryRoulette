/**
 * E2E test data for restaurant workflows.
 */

export const newRestaurant = {
    name: 'E2E Test Pizzeria',
    addressLine1: '123 Test Street',
    addressLine2: 'Suite 42',
    city: 'Test City',
    postalCode: '12345',
    country: 'Germany',
};

export const urls = {
    list: '/restaurants',
    create: '/restaurants/new',
    detailPattern: /^\/restaurants\/[0-9a-f-]+$/,
};

export const selectors = {
    nameInput: '#name',
    addressLine1Input: '#addressLine1',
    addressLine2Input: '#addressLine2',
    cityInput: '#city',
    postalCodeInput: '#postalCode',
    countryInput: '#country',
    submitButton: 'button[type="submit"]',
    addRestaurantLink: 'a[href="/restaurants/new"]',
};
