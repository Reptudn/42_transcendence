const fastify = require("fastify")()

fastify.get("/login", async (req: any, reply: any) => {
    return "hello"
})


fastify.listen({ port: 4242 }, (err: any) => {
    if (err) throw err;
    console.log(`Backend on port ${fastify.server.address().port}`);
})