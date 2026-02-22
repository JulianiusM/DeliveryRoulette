/**
 * E2E keyword helpers for restaurant actions.
 */
import { type Page, expect } from '@playwright/test';
import {
    selectors,
    urls,
} from '../../data/e2e/restaurantData';

/**
 * Create a new restaurant via the UI form.
 * Returns the restaurant detail URL path after creation.
 */
export async function createRestaurant(
    page: Page,
    data: {
        name: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        postalCode: string;
        country?: string;
    },
): Promise<string> {
    await page.goto(urls.create);
    await page.fill(selectors.nameInput, data.name);
    await page.fill(selectors.addressLine1Input, data.addressLine1);
    if (data.addressLine2) {
        await page.fill(selectors.addressLine2Input, data.addressLine2);
    }
    await page.fill(selectors.cityInput, data.city);
    await page.fill(selectors.postalCodeInput, data.postalCode);
    if (data.country) {
        await page.fill(selectors.countryInput, data.country);
    }
    await page.click(selectors.submitButton);
    await page.waitForLoadState('networkidle');
    return page.url();
}

/**
 * Verify a restaurant detail page shows the expected name.
 */
export async function verifyRestaurantDetail(
    page: Page,
    expectedName: string,
): Promise<void> {
    await expect(page.locator('h1, h2, h3').first()).toContainText(expectedName);
}

/**
 * Navigate to a restaurant detail page from the list.
 */
export async function navigateToRestaurantDetail(
    page: Page,
    restaurantName: string,
): Promise<void> {
    await page.goto(urls.list);
    await page.waitForLoadState('networkidle');
    const row = page.locator('tr', { hasText: restaurantName });
    const viewLink = row.locator('a[href*="/restaurants/"]').first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');
}

/**
 * Extract the restaurant ID from the current detail-page URL.
 */
export function getRestaurantIdFromUrl(page: Page): string {
    const match = page.url().match(/\/restaurants\/([0-9a-f-]+)/);
    if (!match) throw new Error('Not on a restaurant detail page');
    return match[1];
}
