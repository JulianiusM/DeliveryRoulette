/**
 * E2E keyword helpers for the import workflow.
 */
import { type Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { selectors, urls } from '../../data/e2e/importData';

/**
 * Upload a JSON import file and wait for the preview page.
 */
export async function uploadImportFile(
    page: Page,
    payload: object,
): Promise<void> {
    // Write the payload to a temp file
    const tmpDir = path.join(os.tmpdir(), 'e2e-import');
    fs.mkdirSync(tmpDir, { recursive: true });
    const filePath = path.join(tmpDir, `import-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload), 'utf-8');

    await page.goto(urls.upload);
    await page.waitForLoadState('networkidle');

    // Upload the file
    const fileInput = page.locator(selectors.fileInput);
    await fileInput.setInputFiles(filePath);
    await page.click(selectors.submitUploadButton);
    await page.waitForLoadState('networkidle');

    // Clean up temp file
    fs.unlinkSync(filePath);
}

/**
 * On the preview page, click Apply to import the data.
 */
export async function applyImport(page: Page): Promise<void> {
    // We should be on the preview page now – click the apply/submit button
    const applyBtn = page.locator('button[type="submit"]', { hasText: /apply/i });
    await applyBtn.click();
    await page.waitForLoadState('networkidle');
}

/**
 * Verify the import result page shows success for a restaurant.
 */
export async function verifyImportResult(
    page: Page,
    restaurantName: string,
): Promise<void> {
    await expect(page.locator('main')).toContainText(restaurantName);
}
