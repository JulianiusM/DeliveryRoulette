export const computeOpenNowData = [
    {
        description: 'returns null when opening hours are missing',
        openingHours: null,
        nowIso: '2026-03-02T10:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: null,
    },
    {
        description: 'returns true when current time is inside delivery slot',
        openingHours: 'delivery: Monday 11:00-22:00; Tuesday closed',
        nowIso: '2026-03-02T10:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: true,
    },
    {
        description: 'returns false when current time is outside delivery slot',
        openingHours: 'delivery: Monday 11:00-22:00; Tuesday closed',
        nowIso: '2026-03-02T21:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: false,
    },
    {
        description: 'handles overnight ranges across midnight',
        openingHours: 'delivery: Monday 18:00-01:00; Tuesday closed',
        nowIso: '2026-03-02T23:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: true,
    },
    {
        description: 'returns null for non-day-based availability text',
        openingHours: 'delivery: open, next: 2026-03-02T11:00:00',
        nowIso: '2026-03-02T10:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: null,
    },
    {
        description: 'prefers delivery schedule when both pickup and delivery are present',
        openingHours: 'pickup: Monday 10:00-22:00\ndelivery: Monday 12:00-13:00',
        nowIso: '2026-03-02T10:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: false,
    },
    {
        description: 'falls back to other services when delivery schedule is absent',
        openingHours: 'pickup: Monday 10:00-22:00',
        nowIso: '2026-03-02T10:30:00Z',
        timeZone: 'Europe/Berlin',
        expected: true,
    },
];

export const resolveTimeZoneData = [
    {
        description: 'defaults to Europe/Berlin for DE',
        country: 'DE',
        expected: 'Europe/Berlin',
    },
    {
        description: 'defaults to Europe/Berlin when country is missing',
        country: null,
        expected: 'Europe/Berlin',
    },
    {
        description: 'uses UTC for non-DE countries',
        country: 'US',
        expected: 'UTC',
    },
];
