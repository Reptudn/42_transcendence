import { sendAchievementToClient } from '../sse/popup.js';
import { FastifyInstance } from 'fastify';

export async function getAllAchievements(
	fastify: FastifyInstance
): Promise<Achievement[]> {
	return await fastify.sqlite.all<Achievement[]>(
		'SELECT * FROM achievements'
	);
}

export async function getUserAchievements(
	userId: number,
	fastify: FastifyInstance
): Promise<Achievement[]> {
	return await fastify.sqlite.all<Achievement[]>(
		`SELECT a.id, a.name, a.description, a.title_first, a.title_second, a.title_third
		FROM achievements a 
		INNER JOIN user_achievements ua ON a.id = ua.achievement_id 
		WHERE ua.user_id = ?`,
		[userId]
	);
}

export async function unlockAchievement(
	userId: number,
	achievementKey: string,
	fastify: FastifyInstance
): Promise<void> {
	const achievement = await fastify.sqlite.get<Achievement>(
		'SELECT * FROM achievements WHERE key = ?',
		achievementKey
	);
	if (!achievement) {
		console.error(`Achievement ${achievementKey} does not exist.`);
		return;
	}
	const exists = await fastify.sqlite.get(
		'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
		userId,
		achievement.id
	);
	if (exists) {
		return;
	}
	await fastify.sqlite.run(
		'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
		userId,
		achievement.id
	);

	fastify.log.info(
		`User ${userId} unlocked achievement: ${achievementKey}`
	);
	sendAchievementToClient(
		userId,
		'ACHIEVEMENT UNLOCK: ' + achievement.name,
		achievement.description,
		achievement.title_first,
		achievement.title_second,
		achievement.title_third
	);

	console.log(`User ${userId} unlocked achievement: ${achievementKey}`);
}
