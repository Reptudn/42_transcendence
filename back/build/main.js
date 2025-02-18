import fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from './logger.js';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';
const app = fastify();
const db = drizzle(process.env.DB_FILE_LOCATION);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.register(fastifyFormbody);
app.register(fastifyJwt, { secret: '42heilbronn' });
app.register(fastifyView, {
    engine: {
        ejs
    },
    options: {
        context: {
            get: (obj, prop) => obj && obj[prop]
        }
    }
});
app.register(fastifyStatic, {
    root: path.join(__dirname, '/app/front/static'),
    prefix: '/static/'
});
app.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (err) {
        reply.send(err);
    }
});
async function startServer() {
    try {
        await app.listen({ port: 4242, host: '0.0.0.0' });
        logger.info(`Server listening on port 4242`);
    }
    catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
/* --------------------------------- */
/* --------------API---------------- */
/* --------------------------------- */
// get
app.get('/users/:name', { preValidation: [app.authenticate] }, async (req, reply) => {
    const { name } = req.params;
    reply.send(`Profile for user: ${name}`);
});
// post
app.post("/login", async (req, reply) => {
    const { username, password } = req.body;
    // check with db
});
app.post("/register", async (req, reply) => {
    const { username, password, email } = req.body;
    // check with db
});
/* --------------------------------- */
/* --------------STATIC------------- */
/* --------------------------------- */
app.get('/partial/:page', async (req, reply) => {
    const page = req.params.page;
    const dataSample = { name: 'Jonas' };
    return reply.view(`/app/front/layouts/pages/${page}.ejs`, dataSample);
});
app.get('/', async (req, reply) => {
    return reply.view('pages/index.ejs', { name: 'Jonas' }, {
        layout: '/app/front/layouts/basic.ejs'
    });
});
startServer();
export { app };
