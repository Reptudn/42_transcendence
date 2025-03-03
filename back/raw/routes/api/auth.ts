import { FastifyInstance } from "fastify";
import { getUserById, loginUser, registerUser } from "../../db/db_users.js";
import { User } from "../../db/database.js";

export async function authRoutes(app: FastifyInstance) {
	app.post("/api/login", async (req: any, reply: any) => {
		const { username, password } = req.body;
		try {
			const user: User = await loginUser(username, password);
			const token = app.jwt.sign({ username: user.username, id: user.id },
				{ expiresIn: '10d' });
			reply
				.setCookie('token', token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/'
				});
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
	app.post("/api/register", async (req: any, reply: any) => {
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

export async function checkAuth(request: any, throwErr: boolean = false): Promise<User | null> {
	try {
		await request.jwtVerify();
		return getUserById(request.user.id);
	} catch (error) {
		if (throwErr) {
			throw new Error('Unauthorized');
		}
		return null;
	}
}