import http from 'http';
import settings from './modules/settings';
import {initDataSource} from "./modules/database/dataSource";
import {startScheduler} from "./modules/sync/SyncScheduler";
import {registerConnectors} from './providers/ConnectorBootstrap';
import logger from './modules/logger';

async function bootstrap() {
    try {
        logger.info('Initializing database connection...');
        await settings.read();
        await initDataSource();

        // Register delivery provider connectors
        registerConnectors();

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
