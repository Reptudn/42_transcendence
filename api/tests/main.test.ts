import fastify from 'fastify';
import { startServer } from '../src/main';

describe('API Tests', () => {
let server: any;

beforeAll(async () => {
	server = fastify();
	await startServer();
});

afterAll(async () => {
	await server.close();
});

//   test('should register a user', async () => {
//     const response = await server.inject({
//       method: 'POST',
//       url: '/register',
//       payload: {
//         username: 'testuser',
//         email: 'testuser@example.com',
//         password: 'password123',
//       },
//     });

//     expect(response.statusCode).toBe(200);
//     expect(response.json()).toEqual({ status: 'User registered successfully' });
//   });

//   test('should login a user', async () => {
//     const response = await server.inject({
//       method: 'POST',
//       url: '/login',
//       payload: {
//         username: 'testuser',
//         password: 'password123',
//       },
//     });

//     expect(response.statusCode).toBe(200);
//     expect(response.json()).toHaveProperty('token');
//   });

	test('should login a user', async () => {
		const response = await server.inject({
		method: 'POST',
		url: '/login',
		payload: {
			username: 'testuser',
			password: 'password123',
		},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toHaveProperty('token');
	});

});