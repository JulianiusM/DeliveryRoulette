/**
 * E2E Workflow 2: import → preview → apply → suggest.
 *
 * Covers the acceptance criteria:
 *   import -> preview -> apply -> suggest.
 */
import { test, expect } from '@playwright/test';

import { importPayload, importRestaurant } from '../data/e2e/importData';

import { loginAsAdmin } from '../keywords/e2e/authKeywords';
import {
    uploadImportFile,
    applyImport,
    verifyImportResult,
} from '../keywords/e2e/importKeywords';
import {
    requestSuggestion,
} from '../keywords/e2e/suggestKeywords';
import {
    navigateToRestaurantDetail,
    verifyRestaurantDetail,
} from '../keywords/e2e/restaurantKeywords';

test.describe('Workflow 2: Import → Preview → Apply → Suggest', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    /* Step 1 – Upload a JSON file and see the preview */
    test('upload import file shows preview', async ({ page }) => {
        await uploadImportFile(page, importPayload);
        // After upload we should be on the preview page
        await expect(page.locator('body')).toContainText(importRestaurant.name);
    });

    /* Step 2 – Apply the import and verify the result */
    test('apply import creates restaurant', async ({ page }) => {
        await uploadImportFile(page, importPayload);
        await applyImport(page);
        // The result page should show the imported restaurant
        await verifyImportResult(page, importRestaurant.name);
    });

    /* Step 3 – After import, the restaurant appears in the list and suggest works */
    test('imported restaurant appears in list and can be suggested', async ({ page }) => {
        // Import first
        await uploadImportFile(page, importPayload);
        await applyImport(page);
        await verifyImportResult(page, importRestaurant.name);

        // Navigate to the restaurant detail via the list
        await navigateToRestaurantDetail(page, importRestaurant.name);
        await verifyRestaurantDetail(page, importRestaurant.name);

        // Now test the suggestion feature
        await requestSuggestion(page);
        const resultArea = page.locator('#suggestionResult');
        await expect(resultArea).not.toBeEmpty();
    });
});
