import fastify from 'fastify';
import { startServer } from '../scripts/index';

describe('App Tests', () => {
  let server: any;

  beforeAll(async () => {
    server = fastify();
    await startServer(server);
  });

  afterAll(async () => {
    await server.close();
  });

  test('should load the home page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('Welcome to Transcendence');
  });

  test('should load the game page', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/partial/game',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('vs Bot');
  });
});