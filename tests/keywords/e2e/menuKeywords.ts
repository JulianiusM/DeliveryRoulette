/**
 * E2E keyword helpers for menu category and item actions.
 */
import { type Page, expect } from '@playwright/test';
import { selectors } from '../../data/e2e/menuData';

/**
 * Create a new menu category for a restaurant.
 */
export async function createMenuCategory(
    page: Page,
    restaurantId: string,
    data: { name: string; sortOrder?: string },
): Promise<void> {
    await page.goto(`/restaurants/${restaurantId}/menu/categories/new`);
    await page.fill(selectors.categoryNameInput, data.name);
    if (data.sortOrder) {
        await page.fill(selectors.categorySortOrderInput, data.sortOrder);
    }
    await page.click(selectors.submitButton);
    await page.waitForLoadState('networkidle');
}

/**
 * Create a new menu item inside a category for a restaurant.
 */
export async function createMenuItem(
    page: Page,
    restaurantId: string,
    categoryId: string,
    data: {
        name: string;
        description?: string;
        price?: string;
        currency?: string;
        sortOrder?: string;
    },
): Promise<void> {
    await page.goto(
        `/restaurants/${restaurantId}/menu/categories/${categoryId}/items/new`,
    );
    await page.fill(selectors.itemNameInput, data.name);
    if (data.description) {
        await page.fill(selectors.itemDescriptionInput, data.description);
    }
    if (data.price) {
        await page.fill(selectors.itemPriceInput, data.price);
    }
    if (data.currency) {
        await page.fill(selectors.itemCurrencyInput, data.currency);
    }
    if (data.sortOrder) {
        await page.fill(selectors.itemSortOrderInput, data.sortOrder);
    }
    await page.click(selectors.submitButton);
    await page.waitForLoadState('networkidle');
}

/**
 * Verify a menu category appears on the restaurant detail page.
 */
export async function verifyMenuCategoryExists(
    page: Page,
    categoryName: string,
): Promise<void> {
    const mainContent = page.locator('main');
    await expect(mainContent).toContainText(categoryName);
}

/**
 * Verify a menu item appears on the restaurant detail page.
 */
export async function verifyMenuItemExists(
    page: Page,
    itemName: string,
): Promise<void> {
    const mainContent = page.locator('main');
    await expect(mainContent).toContainText(itemName);
}

/**
 * Extract the first category ID from the restaurant detail page.
 * Looks for "Add Item" links which contain the category ID in their href.
 */
export async function getFirstCategoryId(
    page: Page,
    restaurantId: string,
): Promise<string> {
    const addItemLink = page.locator(
        `a[href*="/restaurants/${restaurantId}/menu/categories/"][href*="/items/new"]`,
    ).first();
    const href = await addItemLink.getAttribute('href');
    if (!href) throw new Error('No "Add Item" link found');
    const match = href.match(/\/categories\/([0-9a-f-]+)\/items\/new/);
    if (!match) throw new Error('Could not extract category ID');
    return match[1];
}
