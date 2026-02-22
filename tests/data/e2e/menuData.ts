/**
 * E2E test data for menu workflows (categories and items).
 */

export const newCategory = {
    name: 'Pizza',
    sortOrder: '1',
};

export const newMenuItem = {
    name: 'Margherita',
    description: 'Classic tomato and mozzarella',
    price: '9.50',
    currency: 'EUR',
    sortOrder: '1',
};

export const selectors = {
    categoryNameInput: '#name',
    categorySortOrderInput: '#sortOrder',
    itemNameInput: '#name',
    itemDescriptionInput: '#description',
    itemPriceInput: '#price',
    itemCurrencyInput: '#currency',
    itemSortOrderInput: '#sortOrder',
    submitButton: 'button[type="submit"]',
};
