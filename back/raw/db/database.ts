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
		profile_picture TEXT DEFAULT ''
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
}
createDatabase().catch(error => {
	console.error('An error occurred while managing the database:', error);
});
