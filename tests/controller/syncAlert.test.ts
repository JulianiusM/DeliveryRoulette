import {pageDataTests, dismissOneTests, dismissFilteredTests} from '../data/controller/syncAlertData';

// ── Mock dependencies ───────────────────────────────────────

jest.mock('../../src/modules/database/services/SyncAlertService');

import * as syncAlertService from '../../src/modules/database/services/SyncAlertService';
import * as syncAlertController from '../../src/controller/syncAlertController';

const mockListAlerts = syncAlertService.listAlerts as jest.Mock;
const mockCountActive = syncAlertService.countActiveAlerts as jest.Mock;
const mockDismissAlert = syncAlertService.dismissAlert as jest.Mock;
const mockDismissAllFiltered = syncAlertService.dismissAllFiltered as jest.Mock;

beforeEach(() => {
    jest.resetAllMocks();
});

// ── getAlertsPageData ───────────────────────────────────────

describe('getAlertsPageData', () => {
    test.each(pageDataTests)('$description', async (tc) => {
        mockListAlerts.mockResolvedValue(tc.alerts);
        mockCountActive.mockResolvedValue(tc.activeCount);

        const result = await syncAlertController.getAlertsPageData(tc.query);

        expect(result.alerts).toEqual(tc.alerts);
        expect(result.activeCount).toBe(tc.activeCount);
        expect(result.filterStatus).toBe(tc.expectedFilterStatus);
        expect(result.alertTypes).toHaveLength(3);
        expect(result.providerKeys.length).toBeGreaterThan(0);
    });
});

// ── dismissOne ──────────────────────────────────────────────

describe('dismissOne', () => {
    test.each(dismissOneTests)('$description', async (tc) => {
        mockDismissAlert.mockResolvedValue(tc.dismissResult);

        if (tc.shouldThrow) {
            await expect(syncAlertController.dismissOne(tc.alertId)).rejects.toThrow('Alert not found');
        } else {
            await syncAlertController.dismissOne(tc.alertId);
            expect(mockDismissAlert).toHaveBeenCalledWith(tc.alertId);
        }
    });
});

// ── dismissFiltered ─────────────────────────────────────────

describe('dismissFiltered', () => {
    test.each(dismissFilteredTests)('$description', async (tc) => {
        mockDismissAllFiltered.mockResolvedValue(tc.expectedCount);

        const count = await syncAlertController.dismissFiltered(tc.query);

        expect(count).toBe(tc.expectedCount);
        expect(mockDismissAllFiltered).toHaveBeenCalled();
    });
});
