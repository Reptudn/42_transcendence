import { FastifyInstance } from 'fastify';
import { incrementUserClickCount } from '../../db/db_users.js';
import { unlockAchievement } from '../../db/db_achievements.js';

let theNumber: number = 0;

export async function numberRoutes(app: FastifyInstance) {
	app.get('/number', async (req: any, reply: any) => {
		reply.send({ number: theNumber });
	});

	app.post(
		'/number',
		{ preValidation: [app.authenticate] },
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
}
