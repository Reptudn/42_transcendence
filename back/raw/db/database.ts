import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { open, Database } from 'sqlite';

export const dataBaseLocation: string = './back/db/db.db';

export interface User {
	id: number;
	username: string;
	password: string;
	displayname: string;
	bio: string;
	profile_picture: string;
};
export interface Friend {
	id: number;
	accepted: boolean;
	requester_id: number;
	requested_id: number;
};

export interface Achievement {
	id: number;
	key: string;
	name: string;
	description: string;
};

async function createDatabase() {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database
	});

	await db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL UNIQUE,
		password TEXT NOT NULL,
		displayname TEXT NOT NULL,
		bio TEXT DEFAULT '',
		profile_picture TEXT DEFAULT '',
		click_count INTEGER DEFAULT 0
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
		description TEXT NOT NULL
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

	await db.exec(`
		INSERT OR IGNORE INTO achievements (key, name, description) VALUES 
		('number-1', 'What''s the point?', 'Click the number once.'),
		('number-2', 'Clickerman', 'Click the number 100 times.'),
		('number-3', 'Why?', 'Click the number 1000 times.'),
		('name-change-creator', 'God Complex', 'Change your display name to \"Reptudn\" or \"Freddy\".')
	`);
}
createDatabase().catch(error => {
	console.error('An error occurred while managing the database:', error);
});
