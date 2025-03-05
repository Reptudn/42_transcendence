import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { dataBaseLocation, Achievement } from './database.js';
import { sendPopupToClient } from '../sse.js';

export async function getAllAchievements(): Promise<Achievement[]> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	return await db.all<Achievement[]>('SELECT * FROM achievements');
}

export async function getUserAchievements(userId: number): Promise<Achievement[]> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	return await db.all<Achievement[]>(
		`SELECT a.id, a.name, a.description 
	FROM achievements a 
	INNER JOIN user_achievements ua ON a.id = ua.achievement_id 
	WHERE ua.user_id = ?`, [userId]
	);
}

export async function unlockAchievement(userId: number, achievementKey: string): Promise<void> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const achievement = await db.get<Achievement>(
		'SELECT * FROM achievements WHERE key = ?',
		achievementKey
	);
	if (!achievement) {
		console.error(`Achievement ${achievementKey} does not exist.`);
		return;
	}
	const exists = await db.get(
		'SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
		userId, achievement.id
	);
	if (exists) {
		return;
	}
	await db.run(
		'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
		userId, achievement.id
	);

	sendPopupToClient(userId, 'ACHIEVEMENT UNLOCK: ' + achievement.name, achievement.description, 'purple', '', '', '', '', true);

	console.log(`User ${userId} unlocked achievement: ${achievementKey}`);
}
