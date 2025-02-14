const fastify = require('fastify')();
const fastifyView = require("@fastify/view");
const path = require("path");
const fastifyStatic = require("@fastify/static");
const fastifyFormbody = require("@fastify/formbody");

fastify.register(fastifyView, {
	engine: {
		ejs: require("ejs")
	},
	options: {
		context: {
			get: (obj: any, prop: any) => obj && obj[prop]
		}
	}
});

fastify.register(fastifyStatic, {
	root: path.join(__dirname, '../static'),
	prefix: '/static/'
});

fastify.register(fastifyFormbody);

fastify.get("/partial/:page", async (req: any, reply: any) => {
	const page = req.params.page;
	const dataSample = { name: "Freddy" }; // fetch data here
	return reply.view(`pages/${page}.ejs`, dataSample);
});

fastify.get("/", async (req: any, reply: any) => {
	return reply.viewAsync("pages/index.ejs", { name: "Freddy" }, {
		layout: "layouts/basic.ejs"
	});
});

fastify.listen({ port: 3000 }, (err: any) => {
	if (err) throw err;
	console.log(`Server listening on port ${fastify.server.address().port}`);
})
