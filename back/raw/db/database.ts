import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { open, Database } from 'sqlite';

const dataBaseLocation: string = './back/db/db.db';

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
}
createDatabase().catch(error => {
	console.error('An error occurred while managing the database:', error);
});

export async function registerUser(username: string, password: string, displayname: string) {
	if (/\s/.test(username) || /\s/.test(password)) {
		throw new Error('Username and password cannot contain spaces');
	}
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const hashedPassword: string = await bcrypt.hash(password, 10);
	await db.run(
		'INSERT INTO users (username, password, displayname) VALUES (?, ?, ?)',
		[username, hashedPassword, displayname]
	);
}

export async function loginUser(username: string, password: string) {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database
	});

	const user = await db.get('SELECT * FROM users WHERE username = ?', username);
	if (!user)
		throw new Error('User not found');

	const passwordMatch = await bcrypt.compare(password, user.password);
	if (!passwordMatch)
		throw new Error('Password incorrect');

	return user;
}

export async function getUserById(id: number) {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	return await db.get(
		'SELECT id, username, displayname, bio, profile_picture FROM users WHERE id = ?',
		id
	);
}

export async function updateUserProfile(
	id: number,
	username: string,
	displayname: string,
	bio: string,
	profile_picture: string
) {
	if (/\s/.test(username)) {
		throw new Error('Username cannot contain spaces');
	}
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	await db.run(
		'UPDATE users SET username = ?, displayname = ?, bio = ?, profile_picture = ? WHERE id = ?',
		[username, displayname, bio, profile_picture, id]
	);
}

export async function updateUserPassword(id: number, oldPassword: string, newPassword: string) {
	if (/\s/.test(newPassword)) {
		throw new Error('New password cannot contain spaces');
	}
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const user = await db.get('SELECT * FROM users WHERE id = ?', id);
	if (!user) throw new Error('User not found');

	const passwordMatch = await bcrypt.compare(oldPassword, user.password);
	if (!passwordMatch) throw new Error('Old password is incorrect');

	const hashedNew = await bcrypt.hash(newPassword, 10);
	await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, id]);
}
