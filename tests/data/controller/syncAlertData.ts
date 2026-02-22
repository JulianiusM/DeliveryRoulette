import {SyncAlertType} from '../../src/modules/database/entities/sync/SyncAlert';

// ── Sample entities ─────────────────────────────────────────

export const sampleRestaurant = {
    id: 'r-1',
    name: 'Pizza Palace',
    addressLine1: '123 Main St',
    city: 'Springfield',
    isActive: true,
};

export const sampleAlerts = [
    {
        id: 'alert-1',
        restaurantId: 'r-1',
        providerKey: 'import',
        type: 'restaurant_gone' as SyncAlertType,
        message: 'Restaurant no longer returned by provider',
        dismissed: false,
        createdAt: new Date('2026-01-15'),
        restaurant: sampleRestaurant,
    },
    {
        id: 'alert-2',
        restaurantId: 'r-1',
        providerKey: 'uber_eats',
        type: 'diet_override_stale' as SyncAlertType,
        message: 'Diet inference changed; manual override may be outdated',
        dismissed: false,
        createdAt: new Date('2026-01-16'),
        restaurant: sampleRestaurant,
    },
];

// ── getAlertsPageData test cases ────────────────────────────

export const pageDataTests = [
    {
        description: 'returns all active alerts when no filter is set',
        query: {},
        alerts: sampleAlerts,
        activeCount: 2,
        expectedFilterStatus: 'active',
    },
    {
        description: 'filters by alert type',
        query: {type: 'restaurant_gone'},
        alerts: [sampleAlerts[0]],
        activeCount: 2,
        expectedFilterStatus: 'active',
    },
    {
        description: 'filters by provider',
        query: {provider: 'uber_eats'},
        alerts: [sampleAlerts[1]],
        activeCount: 2,
        expectedFilterStatus: 'active',
    },
    {
        description: 'shows dismissed alerts',
        query: {status: 'dismissed'},
        alerts: [],
        activeCount: 2,
        expectedFilterStatus: 'dismissed',
    },
    {
        description: 'ignores invalid type filter',
        query: {type: 'invalid_type'},
        alerts: sampleAlerts,
        activeCount: 2,
        expectedFilterStatus: 'active',
    },
    {
        description: 'ignores invalid provider filter',
        query: {provider: 'nonexistent'},
        alerts: sampleAlerts,
        activeCount: 2,
        expectedFilterStatus: 'active',
    },
];

// ── dismissOne test cases ───────────────────────────────────

export const dismissOneTests = [
    {
        description: 'dismisses alert successfully',
        alertId: 'alert-1',
        dismissResult: true,
        shouldThrow: false,
    },
    {
        description: 'throws when alert not found',
        alertId: 'nonexistent',
        dismissResult: false,
        shouldThrow: true,
    },
];

// ── dismissFiltered test cases ──────────────────────────────

export const dismissFilteredTests = [
    {
        description: 'dismisses all matching alerts with type filter',
        query: {type: 'restaurant_gone'},
        expectedCount: 1,
    },
    {
        description: 'dismisses all matching alerts with provider filter',
        query: {provider: 'import'},
        expectedCount: 1,
    },
    {
        description: 'dismisses all active alerts with no filter',
        query: {},
        expectedCount: 2,
    },
];
