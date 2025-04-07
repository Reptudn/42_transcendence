import { FastifyPluginAsync } from 'fastify';
import { unlockAchievement } from '../../../services/database/db_achievements';
import { incrementUserClickCount } from '../../../services/database/db_users';

let theNumber: number = 0;

const number: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/number', async (req: any, reply: any) => {
		reply.send({ number: theNumber });
	});

	fastify.post(
		'/number',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { number } = req.body;
			theNumber += number;
			const newCount = await incrementUserClickCount(req.user.id, number);

			if (newCount > 0) {
				await unlockAchievement(req.user.id, 'number-1');
			}
			if (newCount >= 100) {
				await unlockAchievement(req.user.id, 'number-2');
			}
			if (newCount >= 1000) {
				await unlockAchievement(req.user.id, 'number-3');
			}

			reply.send({ number: theNumber });
		}
	);
};

export default number;
