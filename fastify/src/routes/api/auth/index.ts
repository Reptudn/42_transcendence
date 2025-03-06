import { FastifyPluginAsync } from "fastify"

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/api/auth/google/callback', async (req: any, reply: any) => {
		const { token, user } = req.googleOAuth2;
		if (token && user) {
			const dbUser = await getUserById(user.id);
			if (!dbUser) {
				await registerUser(user.email, '', user.displayName);
			}
			const jwt = fastify.jwt.sign({ username: user.email, id: user.id },
				{ expiresIn: '10d' });
			reply.setCookie('token', jwt, {
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'none',
			});
			reply.redirect('/');
		} else {
			reply.send('Something went wrong');
		}
	});
}

export default auth;
