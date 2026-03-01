/**
 * Unit tests for SyncScheduler
 * Tests start/stop behaviour and interval gating.
 */

jest.useFakeTimers();

// Mock settings
jest.mock('../../src/modules/settings', () => ({
    __esModule: true,
    default: {value: {syncIntervalMs: 0}},
}));
import settings from '../../src/modules/settings';

// Mock ProviderSyncService
jest.mock('../../src/modules/sync/ProviderSyncService');
import {queueSync} from '../../src/modules/sync/ProviderSyncService';
const mockQueueSync = queueSync as jest.Mock;

import {startScheduler, stopScheduler} from '../../src/modules/sync/SyncScheduler';

describe('SyncScheduler', () => {
    afterEach(() => {
        stopScheduler();
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('does nothing when syncIntervalMs is 0', () => {
        (settings as any).value.syncIntervalMs = 0;
        startScheduler();

        jest.advanceTimersByTime(60_000);
        expect(mockQueueSync).not.toHaveBeenCalled();
    });

    test('schedules sync at configured interval', () => {
        (settings as any).value.syncIntervalMs = 10_000;
        mockQueueSync.mockResolvedValue({jobId: 'job-1', status: 'pending'});

        startScheduler();

        expect(mockQueueSync).not.toHaveBeenCalled();

        jest.advanceTimersByTime(10_000);
        expect(mockQueueSync).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(10_000);
        expect(mockQueueSync).toHaveBeenCalledTimes(2);
    });

    test('stopScheduler prevents further ticks', () => {
        (settings as any).value.syncIntervalMs = 5_000;
        mockQueueSync.mockResolvedValue({jobId: 'job-1', status: 'pending'});

        startScheduler();
        jest.advanceTimersByTime(5_000);
        expect(mockQueueSync).toHaveBeenCalledTimes(1);

        stopScheduler();
        jest.advanceTimersByTime(15_000);
        expect(mockQueueSync).toHaveBeenCalledTimes(1); // no more calls
    });

    test('calling startScheduler twice is a no-op', () => {
        (settings as any).value.syncIntervalMs = 5_000;
        mockQueueSync.mockResolvedValue({jobId: 'job-1', status: 'pending'});

        startScheduler();
        startScheduler(); // second call should be ignored

        jest.advanceTimersByTime(5_000);
        expect(mockQueueSync).toHaveBeenCalledTimes(1); // only 1 timer running
    });
});
