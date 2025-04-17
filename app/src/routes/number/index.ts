import { FastifyPluginAsync } from 'fastify';
import { unlockAchievement } from '../../services/database/achievements';
import { incrementUserClickCount } from '../../services/database/users';

let theNumber: number = 0;

const number: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		reply.send({ number: theNumber });
	});

	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { number } = req.body;
			theNumber += number;
			const newCount = await incrementUserClickCount(
				req.user.id,
				number,
				fastify
			);

			if (newCount > 0) {
				await unlockAchievement(req.user.id, 'number-1', fastify);
			}
			if (newCount >= 100) {
				await unlockAchievement(req.user.id, 'number-2', fastify);
			}
			if (newCount >= 1000) {
				await unlockAchievement(req.user.id, 'number-3', fastify);
			}

			reply.code(200).send({ number: theNumber });
		}
	);
};

export default number;
