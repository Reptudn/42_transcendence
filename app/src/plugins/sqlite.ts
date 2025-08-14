import sqlite3 from 'sqlite3';
import fp from 'fastify-plugin';
import { open, Database } from 'sqlite';
import * as fs from 'fs';
import * as path from 'path';

export const achievementsData = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, '../../data/achievements.json'), 'utf-8')
);
import { FastifyInstance } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		sqlite: Database;
	}
}

export default fp(async (fastify) => {
	const db: Database = await open({
		filename: path.resolve(__dirname, '../../db/transcendence.db'),
		driver: sqlite3.Database,
	});

	await db.exec('PRAGMA foreign_keys = ON');

	fastify.decorate('sqlite', db);

	fastify.log.info('Fastify opened and decorated!');

	// TODO: use migrations?

	const createDatabase = async (fastify: FastifyInstance) => {
		await fastify.sqlite.exec(`
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
			title_third INTEGER,
			totp_secret TEXT,
			totp_rescue TEXT
		)
		`);

		await fastify.sqlite.exec(`
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

		await fastify.sqlite.exec(`
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

		await fastify.sqlite.exec(`
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

		await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS chats (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT, -- optional für Gruppen
			is_group BOOLEAN DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
			)
		`);

		await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS chat_participants (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
			UNIQUE(chat_id, user_id)
			)
		`);

		await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			chat_id INTEGER NOT NULL,
			user_id INTEGER,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(chat_id) REFERENCES chats(id) ON DELETE CASCADE,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
			)
		`);

		await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS blocked_users (
				blocker_id INTEGER NOT NULL,
				blocked_id INTEGER NOT NULL,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
				PRIMARY KEY (blocker_id, blocked_id),
				FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
				FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
			);
		`);

        await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS completed_games (
				id          INTEGER PRIMARY KEY AUTOINCREMENT,
				ended_at    DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
				settings    TEXT       NOT NULL   -- JSON dump of final settings
			);
		`);
		await fastify.sqlite.exec(`
			CREATE TABLE IF NOT EXISTS game_results (
				game_id     INTEGER NOT NULL,
				player_id   INTEGER NOT NULL,
				user_id     INTEGER,               -- nullable real user.id
				player_type TEXT    NOT NULL,      -- 'User' | 'Local' | 'AI'
				ai_level    INTEGER DEFAULT NULL,  -- only for AI, NULL otherwise
				place       INTEGER NOT NULL,      -- 1=winner,2=runner-up,...
				FOREIGN KEY (game_id)   REFERENCES completed_games(id) ON DELETE CASCADE,
				FOREIGN KEY (user_id)   REFERENCES users(id)           ON DELETE CASCADE,
				PRIMARY KEY (game_id, player_id)
			);
		`);

		for (const achievement of achievementsData) {
			await fastify.sqlite.run(
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

	await createDatabase(fastify)
		.then(() => {
			fastify.log.info('Database created');
		})
		.catch((error) => {
			fastify.log.error(
				'An error occurred while managing the database:',
				error
			);
		});
});
