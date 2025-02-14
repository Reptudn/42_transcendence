const fastify = require('fastify')();
const fastifyView = require("@fastify/view");
const path = require("path");
const fastifyStatic = require("@fastify/static");

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

fastify.register(require("@fastify/formbody"));

fastify.get("/partial/:page", async (req: any, reply: any) => {
	const page = req.params.page;
	const dataSample = { name: "Jonas" }; // fetch data here
	return reply.view(`pages/${page}.ejs`, dataSample);
});

fastify.get("/", async (req: any, reply: any) => {
	return reply.viewAsync("pages/index.ejs", { name: "Jonas" }, {
		layout: "layouts/basic.ejs"
	});
});

fastify.listen({ port: 3000 }, (err: any) => {
	if (err) throw err;
	console.log(`Server listening on port ${fastify.server.address().port}`);
})
