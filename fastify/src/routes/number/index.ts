import { FastifyPluginAsync } from "fastify"

const number: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

	let theNumber: number = 0;

	fastify.get('/', async (req: any, reply: any) => {
		reply.send({ number: theNumber });
	});

	fastify.post("/", { preValidation: [fastify.authenticate] }, async (req: any, reply: any) => {
		const { number } = req.body;
		theNumber += number;
		reply.send({ number: theNumber });
	});
	
}

export default number;