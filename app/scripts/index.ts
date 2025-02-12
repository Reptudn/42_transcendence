const fastify = require("fastify")()
const fastifyView = require("@fastify/view")

fastify.register(fastifyView, {
  engine: {
    ejs: require("ejs")
  }
})

// asynchronous handler:
fastify.get("/", async (req: any, reply: any) => {
  return reply.viewAsync("pages/index.ejs", { name: "Jonas" }, {
    layout: "layouts/basic.ejs"
  });
})

fastify.listen({ port: 3000 }, (err: any) => {
  if (err) throw err;
  console.log(`Server on port ${fastify.server.address().port}`);
})