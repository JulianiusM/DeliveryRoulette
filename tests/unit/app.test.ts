import request from 'supertest';
import app from '../../src/app';

describe('App routes', () => {
    describe('GET /health', () => {
        it('returns JSON { ok: true }', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ok: true});
        });
    });

    describe('GET /', () => {
        it('renders an SSR page via Pug', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/html/);
            expect(res.text).toContain('Delivery Roulette');
        });
    });

    describe('404 handling', () => {
        it('returns 404 for unknown routes', async () => {
            const res = await request(app).get('/nonexistent');
            expect(res.status).toBe(404);
        });
    });
});
