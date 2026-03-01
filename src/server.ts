import http from 'http';
import settings from './modules/settings';
import {initDataSource} from "./modules/database/dataSource";
import {startScheduler} from "./modules/sync/SyncScheduler";
import {startSyncQueueWorker} from "./modules/sync/ProviderSyncService";
import {registerConnectors} from './providers/ConnectorBootstrap';
import {ensureDefaultDietTags} from './modules/database/services/DietTagService';
import logger from './modules/logger';

async function bootstrap() {
    try {
        logger.info('Initializing database connection...');
        await settings.read();
        await initDataSource();
        const seededTags = await ensureDefaultDietTags();
        if (seededTags > 0) {
            logger.info({inserted: seededTags}, 'Seeded missing default diet tags');
        }

        // Register delivery provider connectors
        registerConnectors();
        startSyncQueueWorker();

        const {default: app} = await import('./app');
        const server = http.createServer(app);
        server.listen(settings.value.appPort, () => {
            logger.info({url: settings.value.rootUrl}, 'Server listening');
            startScheduler();
        });
    } catch (err) {
        logger.fatal({err}, 'Failed to initialize app');
        process.exit(1);
    }
}

bootstrap();
