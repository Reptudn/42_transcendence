import { FastifyPluginAsync } from 'fastify';
import { promises as fs } from 'fs';
import path from 'path';
import { unlockAchievement } from '../../services/database/achievements';
import { incrementUserClickCount } from '../../services/database/users';

const NUMBER_FILE = path.join(process.cwd(), 'data', 'number.json');
let theNumber: number = 0;

async function loadNumber() {
	try {
		const raw = await fs.readFile(NUMBER_FILE, 'utf-8');
		const parsed = JSON.parse(raw);
		theNumber = Number(parsed.number) || 0;
	} catch {
		theNumber = 0;
		await fs.mkdir(path.dirname(NUMBER_FILE), { recursive: true });
		await fs.writeFile(
			NUMBER_FILE,
			JSON.stringify({ number: theNumber }),
			'utf-8'
		);
	}
}

async function saveNumber() {
	const tmp = NUMBER_FILE + '.tmp';
	await fs.writeFile(tmp, JSON.stringify({ number: theNumber }), 'utf-8');
	await fs.rename(tmp, NUMBER_FILE);
}

const number: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	await loadNumber();

	fastify.get('/', async (req: any, reply: any) => {
		return reply.send({ number: theNumber });
	});

	fastify.post(
		'/',
		{
			schema: {
				body: {
					type: 'object',
					properties: { number: { type: 'number' } },
					required: ['number'],
				},
			},
		},
		async (req: any, reply: any) => {
			const { number } = req.body;
			theNumber += number;

			if (req.user?.id) {
				const newCount = await incrementUserClickCount(
					req.user.id,
					number,
					fastify
				);
				if (newCount > 0)
					await unlockAchievement(req.user.id, 'number-1', fastify);
				if (newCount >= 100)
					await unlockAchievement(req.user.id, 'number-2', fastify);
				if (newCount >= 1000)
					await unlockAchievement(req.user.id, 'number-3', fastify);
			}

			await saveNumber();
			return reply.code(200).send({ number: theNumber });
		}
	);
};

export default number;
