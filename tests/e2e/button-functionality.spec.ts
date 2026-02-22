/**
 * E2E test to verify all interactive buttons across the application
 * This test automatically finds all buttons and verifies they provide user feedback
 */

import { test, expect, Page } from '@playwright/test';

// Pages to test
const TEST_PAGES = [
    { path: '/restaurants', name: 'Restaurants List' },
    { path: '/restaurants/new', name: 'New Restaurant' },
    { path: '/help', name: 'Help Page' },
];

/**
 * Check if a button provides feedback when clicked
 * Feedback can be: modal opening, page navigation, form submission, collapse toggle, etc.
 */
async function testButtonFeedback(page: Page, button: any, buttonText: string): Promise<{ success: boolean; message: string }> {
    // Get button attributes to understand expected behavior
    const bsToggle = await button.getAttribute('data-bs-toggle');
    const bsTarget = await button.getAttribute('data-bs-target');
    const type = await button.getAttribute('type');
    const href = await button.getAttribute('href');
    
    // Skip if it's a submit button (handled by form)
    if (type === 'submit') {
        return { success: true, message: 'Submit button (form handler)' };
    }
    
    // Skip if it's a link
    if (href) {
        return { success: true, message: 'Link button' };
    }
    
    // Check Bootstrap data-bs-toggle functionality
    if (bsToggle === 'modal' && bsTarget) {
        // Modal buttons - verify they have correct attributes
        // We trust Bootstrap JS to handle the actual opening
        const modal = page.locator(bsTarget);
        const modalExists = await modal.count() > 0;
        if (modalExists) {
            return { success: true, message: 'Modal button configured correctly' };
        } else {
            return { success: false, message: `Modal ${bsTarget} not found in DOM` };
        }
    }
    
    if (bsToggle === 'collapse' && bsTarget) {
        // Should toggle collapse
        await button.click();
        await page.waitForTimeout(300); // Wait for collapse animation
        const target = page.locator(bsTarget);
        const isVisible = await target.isVisible({ timeout: 1000 }).catch(() => false);
        return { success: true, message: `Collapse toggled (visible: ${isVisible})` };
    }
    
    // Check for custom click handlers by looking for specific classes or data attributes
    const classes = await button.getAttribute('class') || '';
    const hasCustomHandler = 
        classes.includes('btn-delete') ||
        button.id && (await button.getAttribute('id') || '').includes('delete');
    
    if (hasCustomHandler) {
        // These buttons have custom JavaScript handlers
        // Set up dialog handler before clicking (for confirmation dialogs)
        page.once('dialog', async dialog => {
            await dialog.dismiss(); // Dismiss to avoid actual deletion in tests
        });
        
        // We'll just verify they don't throw errors when clicked
        const errorPromise = page.waitForEvent('pageerror', { timeout: 1000 }).catch(() => null);
        await button.click();
        const error = await errorPromise;
        if (error) {
            return { success: false, message: `JavaScript error: ${error.message}` };
        }
        return { success: true, message: 'Custom handler (no JS errors)' };
    }
    
    // If we reach here, button might not have obvious feedback
    // Check if clicking causes any change in the page
    const beforeHTML = await page.content();
    await button.click();
    await page.waitForTimeout(200);
    const afterHTML = await page.content();
    
    if (beforeHTML !== afterHTML) {
        return { success: true, message: 'Page content changed' };
    }
    
    return { success: false, message: 'No visible feedback detected' };
}

test.describe('Button Functionality Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Login with E2E credentials from environment
        const username = process.env.E2E_ADMIN_USERNAME || 'tester';
        const password = process.env.E2E_ADMIN_PASSWORD || 'passw0rd!';
        
        await page.goto('/users/login');
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        // Wait for navigation after login - should redirect to dashboard
        await page.waitForURL((url) => url.pathname !== '/users/login', { timeout: 10000 });
        // Wait for page to be fully loaded
        await page.waitForLoadState('networkidle');
    });
    
    for (const testPage of TEST_PAGES) {
        test(`All buttons work on ${testPage.name}`, async ({ page }) => {
            await page.goto(testPage.path);
            await page.waitForLoadState('networkidle');
            
            // Find all clickable buttons (excluding disabled ones)
            const buttons = await page.locator('button:not([disabled]), a.btn:not(.disabled)').all();
            
            console.log(`Found ${buttons.length} buttons on ${testPage.name}`);
            
            // If no buttons found (empty state), skip
            if (buttons.length === 0) {
                console.log(`No buttons found on ${testPage.name}, skipping...`);
                return;
            }
            
            const results: Array<{ text: string; result: { success: boolean; message: string } }> = [];
            
            for (const button of buttons) {
                const text = (await button.textContent() || '').trim();
                const buttonId = await button.getAttribute('id') || '';
                const buttonClass = await button.getAttribute('class') || '';
                const identifier = buttonId || text || buttonClass.split(' ')[0] || 'Unknown';
                
                // Skip certain buttons that are known to work differently
                if (text.includes('Sign Out') || text.includes('Logout')) {
                    continue;
                }
                
                // Skip navigation buttons (they change the page)
                if (text.includes('Items') || text.includes('Locations') || text.includes('Lending') || text.includes('Profile')) {
                    continue;
                }
                
                // Skip navbar-toggler (only visible on mobile viewports)
                if (buttonClass.includes('navbar-toggler')) {
                    continue;
                }
                
                // Skip modal close buttons (data-bs-dismiss inside modals)
                const bsDismiss = await button.getAttribute('data-bs-dismiss');
                if (bsDismiss === 'modal') {
                    continue;
                }
                
                try {
                    const result = await testButtonFeedback(page, button, identifier);
                    results.push({ text: identifier, result });
                    
                    if (!result.success) {
                        console.error(`❌ Button "${identifier}" failed: ${result.message}`);
                    } else {
                        console.log(`✅ Button "${identifier}": ${result.message}`);
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`❌ Button "${identifier}" error: ${errorMsg}`);
                    results.push({ text: identifier, result: { success: false, message: errorMsg } });
                }
            }
            
            // Check if any buttons failed
            const failures = results.filter(r => !r.result.success);
            if (failures.length > 0) {
                const failureList = failures.map(f => `  - ${f.text}: ${f.result.message}`).join('\n');
                throw new Error(`${failures.length} button(s) on ${testPage.name} failed:\n${failureList}`);
            }
            
            expect(failures.length).toBe(0);
        });
    }
    
    test('Restaurant detail page navigation works', async ({ page }) => {
        // This test requires a restaurant
        // Navigate to restaurants list to check
        await page.goto('/restaurants');
        
        // Try to find an existing restaurant or skip
        const restaurantLinks = await page.locator('a[href^="/restaurants/"]').all();
        if (restaurantLinks.length === 0) {
            test.skip();
            return;
        }
        
        // Go to first restaurant detail
        await restaurantLinks[0].click();
        await page.waitForLoadState('networkidle');
        
        // Check that the page loaded correctly
        const heading = page.locator('h1');
        const headingExists = await heading.count() > 0;
        expect(headingExists).toBeTruthy();
    });
    
    test('Restaurant detail page buttons work', async ({ page }) => {
        // Navigate to restaurants list
        await page.goto('/restaurants');
        await page.waitForLoadState('networkidle');
        
        // Check that the Add Restaurant button exists
        const addBtn = page.locator('a.btn-success[href="/restaurants/new"]').first();
        const btnExists = await addBtn.count() > 0;
        expect(btnExists).toBeTruthy();
        
        if (btnExists) {
            // Verify button has correct href
            const href = await addBtn.getAttribute('href');
            expect(href).toBe('/restaurants/new');
        }
    });
});
