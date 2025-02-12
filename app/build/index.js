"use strict";
const fastify = require("fastify")();
const fastifyView = require("@fastify/view");
const path = require("path");
const fastifyStatic = require("@fastify/static");
fastify.register(fastifyView, {
    engine: {
        ejs: require("ejs")
    },
    options: {
        context: {
            get: (obj, prop) => obj && obj[prop]
        }
    }
});
fastify.get("/partial/:page", async (req, reply) => {
    const page = req.params.page;
    const dataSample = { name: "Jonas" }; // fetch data here
    return reply.view(`pages/${page}.ejs`, dataSample);
});
fastify.get("/", async (req, reply) => {
    return reply.viewAsync("pages/index.ejs", { name: "Jonas" }, {
        layout: "layouts/basic.ejs"
    });
});
fastify.post("/login", async (req, reply) => {
    return "hello";
});
fastify.listen({ port: 3000 }, (err) => {
    if (err)
        throw err;
    console.log(`Server on port ${fastify.server.address().port}`);
});
