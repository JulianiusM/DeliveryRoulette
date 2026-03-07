import logger from '../logger';
import {
    listRestaurantIdsForInference,
    listRestaurantIdsNeedingCurrentInference,
    recomputeAfterMenuChange,
} from '../database/services/DietInferenceService';

export interface HeuristicRefreshTriggerResult {
    started: boolean;
    mode: 'stale' | 'all';
}

let runningRefresh: Promise<void> | null = null;

export function isHeuristicRefreshRunning(): boolean {
    return runningRefresh !== null;
}

export function startHeuristicRefresh(options: {
    forceAll?: boolean;
    source?: 'startup' | 'manual';
} = {}): HeuristicRefreshTriggerResult {
    const mode: 'stale' | 'all' = options.forceAll ? 'all' : 'stale';

    if (runningRefresh) {
        return {started: false, mode};
    }

    runningRefresh = runHeuristicRefresh(mode, options.source ?? 'manual')
        .catch((err) => {
            logger.error({err, mode}, 'Heuristic refresh failed');
        })
        .finally(() => {
            runningRefresh = null;
        });

    return {started: true, mode};
}

async function runHeuristicRefresh(
    mode: 'stale' | 'all',
    source: 'startup' | 'manual',
): Promise<void> {
    const restaurantIds = mode === 'all'
        ? await listRestaurantIdsForInference()
        : await listRestaurantIdsNeedingCurrentInference();

    logger.info(
        {mode, source, restaurantCount: restaurantIds.length},
        'Starting heuristic refresh',
    );

    let refreshedCount = 0;
    for (const restaurantId of restaurantIds) {
        await recomputeAfterMenuChange(restaurantId);
        refreshedCount += 1;
    }

    logger.info(
        {mode, source, refreshedCount},
        'Finished heuristic refresh',
    );
}
