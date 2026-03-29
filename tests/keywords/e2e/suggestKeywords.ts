/**
 * E2E keyword helpers for the suggestion workflow.
 */
import { type Page, expect } from '@playwright/test';
import { selectors, urls } from '../../data/e2e/suggestData';

/**
 * Navigate to the suggestion page and click Suggest.
 */
export async function requestSuggestion(page: Page): Promise<void> {
    await page.goto(urls.suggest);
    await page.waitForLoadState('networkidle');
    await page.click(selectors.suggestButton);
    await page.waitForFunction(() => {
        const resultName = document.getElementById('resultName')?.textContent?.trim() ?? '';
        const alertText = document.querySelector('#suggestionAlerts .alert')?.textContent?.trim() ?? '';
        return resultName.length > 0 || alertText.length > 0;
    }, { timeout: 10_000 });
}

/**
 * Verify the suggestion result contains the expected restaurant name.
 */
export async function verifySuggestionContains(
    page: Page,
    restaurantName: string,
): Promise<void> {
    const resultArea = page.locator(selectors.suggestionResult);
    await expect(resultArea).toContainText(restaurantName);
}

/**
 * Verify that *some* suggestion result is displayed (any restaurant).
 */
export async function verifySuggestionDisplayed(page: Page): Promise<void> {
    const resultArea = page.locator(selectors.suggestionResult);
    await expect(resultArea).not.toBeEmpty();
}
