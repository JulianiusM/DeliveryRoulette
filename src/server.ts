import http from 'http';

const PORT = parseInt(process.env.APP_PORT || '3000', 10);

async function bootstrap() {
    try {
        const {default: app} = await import('./app');
        const server = http.createServer(app);
        server.listen(PORT, () => {
            console.log(`🚀 Server listening on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Failed to initialize app:', err);
        process.exit(1);
    }
}

bootstrap();
