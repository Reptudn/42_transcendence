"use strict";
const fastify = require("fastify")();
const fastifyView = require("@fastify/view");
const fastifyFormbody = require("@fastify/formbody");
const path = require('path');
const fastifyStatic = require('@fastify/static');
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
fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../static'),
    prefix: '/static/'
});
fastify.register(fastifyFormbody);
fastify.get("/partial/:page", async (req, reply) => {
    const page = req.params.page;
    const dataSample = { name: "Freddy" }; // fetch data here
    return reply.view(`pages/${page}.ejs`, dataSample);
});
fastify.get("/", async (req, reply) => {
    return reply.viewAsync("pages/index.ejs", { name: "Freddy" }, {
        layout: "layouts/basic.ejs"
    });
});
fastify.post("/login", async (req, reply) => {
    const { username, password } = req.body;
    try {
        const res = await fetch("http://api:4242/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (res.ok) {
            console.log(data);
            return reply.viewAsync("pages/index.ejs", { user: "yes!" }, {
                layout: "layouts/basic.ejs"
            });
        }
        else {
            reply.status(401).send({ message: 'Invalid username or password' });
        }
    }
    catch (err) {
        reply.status(401).send({ message: 'Something went wrong whilst trying to perfrom the login action' });
    }
});
fastify.post("/register", async (req, reply) => {
    const { username, password, email } = req.body;
    console.log(username, password, email);
    try {
        const res = await fetch("http://api:4242/register", {
            method: "POST",
            body: JSON.stringify({ username, password, email }),
            headers: { "Content-Type": "application/json" }
        });
        const data = await res.json();
        if (res.ok) {
            console.log(data);
            return reply.viewAsync("pages/index.ejs", { user: "registered yes!" }, {
                layout: "layouts/basic.ejs"
            });
        }
        else {
            reply.status(401).send({ message: 'Invalid username or password' });
        }
    }
    catch (err) {
        reply.status(401).send({ message: 'Something went wrong whilst trying to perfrom the register action' });
    }
});
fastify.listen({ port: 3000 }, (err) => {
    if (err)
        throw err;
    console.log(`Server listening on port ${fastify.server.address().port}`);
});
