const fastify = require("fastify")()
import { openDb } from "./database";

async function setupDb() {
    const db = await openDb();

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT
        )
    `);

    await db.run(`INSERT INTO users (name, email) VALUES (?, ?)`, ['John Doe', 'john@example.com']);

    const users = await db.all(`SELECT * FROM users`);
    console.log(users);
}

async function startServer() {
    await setupDb();

    fastify.get("/login", async (req: any, reply: any) => {
        return "hello"
    });

    fastify.listen({ port: 4242 }, (err: any) => {
        if (err) throw err;
        console.log(`Backend on port ${fastify.server.address().port}`);
    });
}

startServer();