import { FastifyInstance } from "fastify";
import { loginUser, registerUser } from "../db/database.js";

export async function authRoutes(app: FastifyInstance) {
	app.post("/login", async (req: any, reply: any) => {
		const { username, password } = req.body;
		try {
			const user = await loginUser(username, password);
			const token = app.jwt.sign({ username: user.username, id: user.id },
				{ expiresIn: '10d' });
			reply.send({ token });
		}
		catch (error) {
			if (error instanceof Error) {
				reply.code(400).send({ message: error.message });
			} else {
				reply.code(400).send({ message: 'An unknown error occurred' });
			}
			return;
		};
	});
	app.post("/register", async (req: any, reply: any) => {
		const { username, password, displayname } = req.body;
		try {
			await registerUser(username, password, displayname);
			reply.code(200).send({ message: 'User registered' });
		}
		catch (error) {
			if (error instanceof Error) {
				reply.code(400).send({ message: error.message });
			} else {
				reply.code(400).send({ message: 'An unknown error occurred' });
			}
			return;
		}
	});
}

export async function checkAuth(request: any): Promise<boolean> {
	try {
		await request.jwtVerify();
		return true;
	} catch (error) {
		return false;
	}
}