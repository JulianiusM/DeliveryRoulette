/**
 * E2E Workflow 1: register / login → create restaurant → add menu → override → suggest.
 *
 * Covers the acceptance criteria:
 *   register/login -> create restaurant -> add menu -> inference -> override -> suggest.
 */
import { test, expect } from '@playwright/test';

import { loginCredentials, registerData } from '../data/e2e/authData';
import { newRestaurant } from '../data/e2e/restaurantData';
import { newCategory, newMenuItem } from '../data/e2e/menuData';
import { overrideData } from '../data/e2e/dietData';

import {
    loginAsAdmin,
    registerUser,
    verifyRegistrationSuccess,
} from '../keywords/e2e/authKeywords';
import {
    createRestaurant,
    verifyRestaurantDetail,
    getRestaurantIdFromUrl,
} from '../keywords/e2e/restaurantKeywords';
import {
    createMenuCategory,
    createMenuItem,
    verifyMenuCategoryExists,
    verifyMenuItemExists,
    getFirstCategoryId,
} from '../keywords/e2e/menuKeywords';
import {
    addDietOverride,
    verifyDietOverrideDisplayed,
} from '../keywords/e2e/dietKeywords';
import {
    requestSuggestion,
    verifySuggestionContains,
} from '../keywords/e2e/suggestKeywords';

test.describe('Workflow 1: Register → Restaurant → Menu → Override → Suggest', () => {
    /* ------------------------------------------------------------------ */
    /*  Step 1 – Register a new user                                      */
    /* ------------------------------------------------------------------ */
    test('register a new user', async ({ page }) => {
        await registerUser(
            page,
            registerData.username,
            registerData.displayname,
            registerData.email,
            registerData.password,
        );
        // After registration the user sees a success message
        await verifyRegistrationSuccess(page);
    });

    /* ------------------------------------------------------------------ */
    /*  Steps 2–6 run as a serial sequence sharing browser state          */
    /* ------------------------------------------------------------------ */
    test.describe('logged-in workflow', () => {
        let restaurantId: string;

        test.beforeEach(async ({ page }) => {
            await loginAsAdmin(page);
        });

        /* Step 2 – Create a restaurant */
        test('create a restaurant', async ({ page }) => {
            const url = await createRestaurant(page, newRestaurant);
            expect(url).toMatch(/\/restaurants\/[0-9a-f-]+/);
            await verifyRestaurantDetail(page, newRestaurant.name);
        });

        /* Step 3 – Add a menu category and item */
        test('add menu category and item', async ({ page }) => {
            // First create the restaurant
            await createRestaurant(page, newRestaurant);
            restaurantId = getRestaurantIdFromUrl(page);

            // Create a category
            await createMenuCategory(page, restaurantId, newCategory);

            // Navigate back to the detail page to find the new category
            await page.goto(`/restaurants/${restaurantId}`);
            await page.waitForLoadState('networkidle');
            await verifyMenuCategoryExists(page, newCategory.name);

            // Get category ID and add a menu item
            const categoryId = await getFirstCategoryId(page, restaurantId);
            await createMenuItem(page, restaurantId, categoryId, newMenuItem);

            // Verify the item shows on the detail page
            await page.goto(`/restaurants/${restaurantId}`);
            await page.waitForLoadState('networkidle');
            await verifyMenuItemExists(page, newMenuItem.name);
        });

        /* Step 4 + 5 – Diet override (covers "inference → override") */
        test('add diet override on restaurant detail', async ({ page }) => {
            // Create a restaurant with menu first
            await createRestaurant(page, newRestaurant);
            restaurantId = getRestaurantIdFromUrl(page);
            await createMenuCategory(page, restaurantId, newCategory);
            await page.goto(`/restaurants/${restaurantId}`);
            await page.waitForLoadState('networkidle');
            const categoryId = await getFirstCategoryId(page, restaurantId);
            await createMenuItem(page, restaurantId, categoryId, newMenuItem);

            // Go to detail page and add a diet override
            await page.goto(`/restaurants/${restaurantId}`);
            await page.waitForLoadState('networkidle');

            // The diet suitability section should be visible
            await addDietOverride(page, 'Vegetarian', overrideData.supported, overrideData.notes);
            await verifyDietOverrideDisplayed(page, 'Vegetarian');
        });

        /* Step 6 – Suggest a restaurant */
        test('suggest returns a restaurant', async ({ page }) => {
            // Ensure at least one restaurant exists
            await createRestaurant(page, {
                ...newRestaurant,
                name: 'Suggestable Restaurant',
            });

            await requestSuggestion(page);
            // At least one result should appear
            const resultArea = page.locator('#suggestionResult');
            await expect(resultArea).not.toBeEmpty();
        });
    });
});
