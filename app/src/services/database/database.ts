import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

export const dataBaseLocation: string = '../../db/transcendence.db';

import achievementsData from '../../data/achievements.json';
import { console } from 'inspector';

async function createDatabase() {
	const dbPath = path.join(__dirname, dataBaseLocation);
	if (!fs.existsSync(dbPath)) {
		fs.mkdirSync(path.dirname(dbPath), { recursive: true });
	}

	console.info('Database path:', dbPath);
	console.info('Database location:', dataBaseLocation);

	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});

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
}
createDatabase().catch((error) => {
	console.error('An error occurred while managing the database:', error);
});
