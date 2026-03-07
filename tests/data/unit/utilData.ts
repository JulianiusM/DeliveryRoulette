export const sessionUserIdData = [
    {
        description: 'returns the logged-in user id when session user exists',
        session: {user: {id: 42}},
        expected: 42,
    },
    {
        description: 'returns undefined when session has no user',
        session: {},
        expected: undefined,
    },
    {
        description: 'returns undefined when session is missing',
        session: undefined,
        expected: undefined,
    },
];

