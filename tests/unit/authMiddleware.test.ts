import settings from '../../src/modules/settings';
import {isAdminUser} from '../../src/middleware/authMiddleware';
import {adminUserCases} from '../data/unit/authMiddlewareData';

describe('authMiddleware', () => {
    const originalAdminUsernames = [...settings.value.adminUsernames];
    const originalAdminEmails = [...settings.value.adminEmails];

    afterEach(() => {
        settings.value.adminUsernames = [...originalAdminUsernames];
        settings.value.adminEmails = [...originalAdminEmails];
    });

    test.each(adminUserCases)('$description', (testCase) => {
        settings.value.adminUsernames = [...testCase.adminUsernames];
        settings.value.adminEmails = [...testCase.adminEmails];

        expect(isAdminUser(testCase.user)).toBe(testCase.expected);
    });
});
