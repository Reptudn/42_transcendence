const fastify = require("fastify")();
import { openDb } from "./database";
import fastifyFormbody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import logger from './logger';

logger.info('Starting backend server...');

fastify.register(fastifyFormbody);
fastify.register(fastifyJwt, { secret: '42heilbronn' });

fastify.decorate("authenticate", async function (request: any, reply: any) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

async function setupDb() {
    const db = await openDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            email TEXT UNIQUE,
            password TEXT,
            matches_played INTEGER DEFAULT 0,
            matches_won INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            token TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

export async function startServer() {
    await setupDb();

    fastify.post("/register", async (req: any, reply: any) => {
        const { username, email, password } = req.body;
        const db = await openDb();
        await db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [username, email, password]);
        reply.send({ status: 'User registered successfully', token: 'urmom' });
    });

    fastify.post("/login", async (req: any, reply: any) => {
        const { username, password } = req.body;
        const db = await openDb();
        const user = await db.get(`SELECT * FROM users WHERE name = ? AND password = ?`, [username, password]);
        if (!user) {
            return reply.status(401).send({ message: 'Invalid username or password' });
        }
        const token = fastify.jwt.sign({ id: user.id, username: user.name });
        reply.send({ token });
    });

    fastify.get("/user", { preValidation: [fastify.authenticate] }, async (req: any, reply: any) => {
        const { id } = req.user;
        const db = await openDb();
        const user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
        reply.send(user);
    });

    fastify.get("/users/:name/profile", async (req: any, reply: any) => {
        const { name } = req.params;
        const db = await openDb();
        const user = await db.get(`SELECT * FROM users WHERE name = ?`, [name]);
        if (!user) {
            return reply.status(404).send({ message: 'User not found' });
        }
        reply.send(user);
    });

    fastify.listen({ port: 4242 }, (err: any) => {
        if (err) throw err;
        logger.info(`Backend on port ${fastify.server.address().port}`);
    });
}

startServer();