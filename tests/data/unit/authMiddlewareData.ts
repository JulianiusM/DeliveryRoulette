export const adminUserCases = [
    {
        description: 'accepts persisted admin role without env allowlists',
        user: {username: 'member', email: 'member@example.com', role: 'admin'},
        adminUsernames: [],
        adminEmails: [],
        expected: true,
    },
    {
        description: 'accepts configured admin username bootstrap',
        user: {username: 'owner', email: 'owner@example.com', role: 'user'},
        adminUsernames: ['owner'],
        adminEmails: [],
        expected: true,
    },
    {
        description: 'accepts configured admin email bootstrap',
        user: {username: 'member', email: 'owner@example.com', role: 'user'},
        adminUsernames: [],
        adminEmails: ['owner@example.com'],
        expected: true,
    },
    {
        description: 'rejects regular users that are neither persisted admins nor allowlisted',
        user: {username: 'member', email: 'member@example.com', role: 'user'},
        adminUsernames: [],
        adminEmails: [],
        expected: false,
    },
];
