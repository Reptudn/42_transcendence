const fastify = require("fastify")();
import fastifyFormbody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import logger from './logger';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

const db = drizzle(process.env.DB_FILE_NAME!);
// DRIZZLE:
// https://orm.drizzle.team/docs/get-started/sqlite-new
// https://orm.drizzle.team/docs/get-started-sqlite

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

export async function startServer() {

    fastify.post("/register", async (req: any, reply: any) => {
        reply.send({ status: 'User registered successfully', token: 'urmom' });
    });

    fastify.post("/login", async (req: any, reply: any) => {
        const token = fastify.jwt.sign({ id: "test", username: "test" });
        reply.send({ token });
    });

    fastify.get("/user", { preValidation: [fastify.authenticate] }, async (req: any, reply: any) => {
        reply.send("user");
    });

    fastify.get("/users/:name/profile", async (req: any, reply: any) => {
        const { name } = req.params;
        reply.send(name);
    });

    fastify.listen({ port: 4242 }, (err: any) => {
        if (err) throw err;
        logger.info(`Backend on port ${fastify.server.address().port}`);
    });
}

startServer();