import sqlite3 from 'sqlite3';
import fp from 'fastify-plugin';
import { open, Database } from 'sqlite';
import path from 'node:path';

const achievementsData: Achievement[] = require('../../../data/achievements.json');

declare module 'fastify' {
	interface FastifyInstance {
		sqlite: Database;
	}
}

export default fp(async (fastify) => {
	const db: Database = await open({
		filename: path.resolve(__dirname, '../db/transcendence.db'),
		driver: sqlite3.Database,
	});

	fastify.decorate('sqlite', db);

	// TODO: use migrations?

	const createDatabase = async () => {
		await db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			google_id TEXT DEFAULT NULL UNIQUE,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			displayname TEXT NOT NULL,
			bio TEXT DEFAULT '',
			profile_picture TEXT DEFAULT '',
			click_count INTEGER DEFAULT 0,
			title_first INTEGER,
			title_second INTEGER,
			title_third INTEGER
		)
		`);

		await db.exec(`
		CREATE TABLE IF NOT EXISTS friends (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			accepted BOOLEAN DEFAULT FALSE,
			requester_id INTEGER NOT NULL,
			requested_id INTEGER NOT NULL,
			FOREIGN KEY(requester_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(requested_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(requester_id, requested_id)
		)
		`);

		await db.exec(`
			CREATE TABLE IF NOT EXISTS achievements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL UNIQUE,
			description TEXT NOT NULL,
			title_first TEXT,
			title_second TEXT,
			title_third TEXT
			)
		`);

		await db.exec(`
			CREATE TABLE IF NOT EXISTS user_achievements (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			achievement_id INTEGER NOT NULL,
			unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, achievement_id),
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY(achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
			)
		`);

		for (const achievement of achievementsData) {
			await db.run(
				`INSERT OR IGNORE INTO achievements 
				(key, name, description, title_first, title_second, title_third) 
				VALUES (?, ?, ?, ?, ?, ?)`,
				[
					achievement.key,
					achievement.name,
					achievement.description,
					achievement.title_first,
					achievement.title_second,
					achievement.title_third,
				]
			);
		}
	};

	createDatabase()
		.then(() => {
			fastify.log.info('Database created');
		})
		.catch((error) => {
			fastify.log.error(
				'An error occurred while managing the database:',
				error
			);
		})
		.finally(() => {
			db.close();
		});
});
