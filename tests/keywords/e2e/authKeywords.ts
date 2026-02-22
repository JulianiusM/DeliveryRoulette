/**
 * E2E keyword helpers for authentication actions.
 */
import { type Page, expect } from '@playwright/test';
import {
    loginCredentials,
    selectors,
    urls,
} from '../../data/e2e/authData';

/**
 * Log in with the seeded admin user.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
    await page.goto(urls.login);
    await page.fill(selectors.usernameInput, loginCredentials.username);
    await page.fill(selectors.passwordInput, loginCredentials.password);
    await page.click(selectors.submitButton);
    await page.waitForURL((url) => url.pathname !== urls.login);
    await page.waitForLoadState('networkidle');
}

/**
 * Register a new user account.
 * After registration, verifies the success message is shown.
 */
export async function registerUser(
    page: Page,
    username: string,
    displayname: string,
    email: string,
    password: string,
): Promise<void> {
    await page.goto(urls.register);
    await page.fill(selectors.usernameInput, username);
    await page.fill(selectors.displaynameInput, displayname);
    await page.fill(selectors.emailInput, email);
    await page.fill(selectors.passwordInput, password);
    await page.fill(selectors.passwordRepeatInput, password);
    await page.click(selectors.submitButton);
    await page.waitForLoadState('networkidle');
}

/**
 * Verify that registration succeeded by checking the success message.
 */
export async function verifyRegistrationSuccess(page: Page): Promise<void> {
    await expect(page.locator('.alert')).toContainText('Account successfully registered');
}

/**
 * Verify the user is on the dashboard page.
 */
export async function verifyOnDashboard(page: Page): Promise<void> {
    await expect(page).toHaveURL(new RegExp(urls.dashboard));
}
