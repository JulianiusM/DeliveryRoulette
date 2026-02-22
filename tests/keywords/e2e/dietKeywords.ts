/**
 * E2E keyword helpers for diet override actions.
 */
import { type Page, expect } from '@playwright/test';

/**
 * Add a diet override for the current restaurant detail page.
 */
export async function addDietOverride(
    page: Page,
    dietTagLabel: string,
    supported: 'true' | 'false',
    notes?: string,
): Promise<void> {
    // Expand the "Add Override" collapse panel
    const addOverrideBtn = page.locator('button[data-bs-target="#addOverrideForm"]');
    await addOverrideBtn.click();
    // Wait a moment for Bootstrap collapse animation
    const overrideForm = page.locator('#addOverrideForm form');
    try {
        await overrideForm.waitFor({ state: 'visible', timeout: 3_000 });
    } catch {
        // If Bootstrap JS hasn't loaded, manually toggle the collapse
        await page.evaluate(() => {
            const el = document.getElementById('addOverrideForm');
            if (el) {
                el.classList.add('show');
                el.style.display = '';
            }
        });
        await overrideForm.waitFor({ state: 'visible', timeout: 3_000 });
    }
    await overrideForm.locator('select[name="dietTagId"]').selectOption({ label: dietTagLabel });
    await overrideForm.locator('select[name="supported"]').selectOption(supported);
    if (notes) {
        await overrideForm.locator('input[name="notes"]').fill(notes);
    }
    await overrideForm.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
}

/**
 * Verify that a diet override badge is displayed in the diet suitability section.
 */
export async function verifyDietOverrideDisplayed(
    page: Page,
    dietTagLabel: string,
): Promise<void> {
    const mainContent = page.locator('main');
    await expect(mainContent).toContainText(dietTagLabel);
    await expect(mainContent).toContainText('Manual Override');
}
