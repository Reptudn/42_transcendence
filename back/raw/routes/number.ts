import { FastifyInstance } from "fastify";
import { loginUser, registerUser } from "../db/database.js";

let theNumber: number = 0;

export async function numberRoutes(app: FastifyInstance) {
	app.get('/number', {}, async (req: any, reply: any) => {
		reply.send({ number: theNumber });
	});

	app.post("/number", {}, async (req: any, reply: any) => {
		const { number } = req.body;
		theNumber += number;
		reply.send({ number: theNumber });
	});
}