const fastify = require('fastify')();
const fastifyView = require("@fastify/view");
const path = require("path");
const fastifyStatic = require("@fastify/static");

function setupServer(server: any) {
  server.register(fastifyView, {
    engine: {
      ejs: require("ejs")
    },
    options: {
      context: {
        get: (obj: any, prop: any) => obj && obj[prop]
      }
    }
  });

  server.register(fastifyStatic, {
    root: path.join(__dirname, '../static'),
    prefix: '/static/'
  });

  server.register(require("@fastify/formbody"));

  server.get("/partial/:page", async (req: any, reply: any) => {
    const page = req.params.page;
    const dataSample = { name: "Jonas" }; // fetch data here
    return reply.view(`pages/${page}.ejs`, dataSample);
  });

  server.get("/", async (req: any, reply: any) => {
    return reply.viewAsync("pages/index.ejs", { name: "Jonas" }, {
      layout: "layouts/basic.ejs"
    });
  });
}

export async function startServer(server = fastify) {
  setupServer(server);
  server.listen({ port: 3000 }, (err: any) => {
    if (err) throw err;
    console.log(`Server listening on port ${server.server.address().port}`);
  });
}

if (require.main === module) {
  startServer();
}