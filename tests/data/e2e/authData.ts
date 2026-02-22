/**
 * E2E test data for authentication workflows.
 */

export const loginCredentials = {
    username: process.env.E2E_ADMIN_USERNAME || 'tester',
    password: process.env.E2E_ADMIN_PASSWORD || 'passw0rd!',
};

export const registerData = {
    username: 'e2enewuser',
    displayname: 'E2E New User',
    email: 'e2enewuser@example.com',
    password: 'SecureP@ss1',
};

export const urls = {
    login: '/users/login',
    register: '/users/register',
    dashboard: '/users/dashboard',
    logout: '/users/logout',
};

export const selectors = {
    usernameInput: 'input[name="username"]',
    passwordInput: 'input[name="password"]',
    displaynameInput: 'input[name="displayname"]',
    emailInput: 'input[name="email"]',
    passwordRepeatInput: 'input[name="password_repeat"]',
    submitButton: 'button[type="submit"]',
};
