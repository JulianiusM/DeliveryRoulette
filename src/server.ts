import http from 'http';
import settings from './modules/settings';
import {initDataSource} from "./modules/database/dataSource";
import {startScheduler} from "./modules/sync/SyncScheduler";

async function bootstrap() {
    try {
        console.log('🔧 Initializing database connection...');
        await settings.read();
        await initDataSource();

        const {default: app} = await import('./app');
        const server = http.createServer(app);
        server.listen(settings.value.appPort, () => {
            console.log(`🚀 Server listening on ${settings.value.rootUrl}`);
            startScheduler();
        });
    } catch (err) {
        console.error('❌ Failed to initialize app:', err);
        process.exit(1);
    }
}

bootstrap();
