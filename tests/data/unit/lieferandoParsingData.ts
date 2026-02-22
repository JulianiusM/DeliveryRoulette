/**
 * Test data for Lieferando parsing unit tests.
 */
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(__dirname, '../../fixtures/lieferando');

export const listingHtml = fs.readFileSync(path.join(fixturesDir, 'listing.html'), 'utf-8');
export const menuHtml = fs.readFileSync(path.join(fixturesDir, 'menu.html'), 'utf-8');
export const listingRealHtml = fs.readFileSync(path.join(fixturesDir, 'listing-real.html'), 'utf-8');
export const menuRealHtml = fs.readFileSync(path.join(fixturesDir, 'menu-real.html'), 'utf-8');

export const expectedListingRestaurants = [
    {
        description: 'first restaurant: Pizza Palast',
        name: 'Pizza Palast',
        menuUrlSuffix: '/en/menu/pizza-palast',
        cuisines: 'Italian, Pizza',
    },
    {
        description: 'second restaurant: Green Bowl',
        name: 'Green Bowl',
        menuUrlSuffix: '/en/menu/green-bowl',
        cuisines: 'Healthy, Vegan',
    },
];

export const expectedRealListingRestaurants = [
    {
        description: 'real listing: Pizza La Scalla',
        name: 'Pizza La Scalla',
        menuUrlSuffix: '/en/menu/pizza-la-scalla-regensburg',
        cuisines: 'Italian, Indian',
    },
    {
        description: 'real listing: Pizza 4 You',
        name: 'Pizza 4 You',
        menuUrlSuffix: '/en/menu/pizza-4-you-regensburg',
        cuisines: 'Italian style pizza, Pasta',
    },
    {
        description: 'real listing: Raj Mahal',
        name: 'Raj Mahal',
        menuUrlSuffix: '/en/menu/raj-mahal-neu',
        cuisines: 'Indian',
    },
];

export const expectedMenuCategories = [
    {
        description: 'first category: Vegan',
        name: 'Vegan',
        itemCount: 1,
        firstItem: {name: 'Vegan Burger', description: 'mit pflanzlichem Patty', price: 9.90, currency: 'EUR'},
    },
    {
        description: 'second category: Salate',
        name: 'Salate',
        itemCount: 1,
        firstItem: {name: 'Gemischter Salat', description: 'frisch und knackig', price: 6.50, currency: 'EUR'},
    },
];

export const expectedRealMenuCategories = [
    {
        description: 'real menu category: Salads',
        name: 'Salads',
        itemCount: 2,
        firstItem: {name: 'Rocket Salad', description: 'with green salad, rocket, tomatoes, mozzarella', price: 8.80, currency: 'EUR'},
    },
    {
        description: 'real menu category: Pizza',
        name: 'Pizza',
        itemCount: 1,
        firstItem: {name: 'Margherita', description: 'with tomato sauce and mozzarella', price: 7.90, currency: 'EUR'},
    },
];

export const expectedRawTextContents = [
    'Vegan',
    'Vegan Burger',
    'mit pflanzlichem Patty',
    'Salate',
    'Gemischter Salat',
    'frisch und knackig',
];
