import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { open, Database } from 'sqlite';
import { dataBaseLocation } from './database.js';

export async function printDatabase() {
	try {
		const db: Database = await open({
			filename: dataBaseLocation,
			driver: sqlite3.Database,
		});
		const users = await db.all('SELECT * FROM users');
		console.log("=== Users Table ===");
		console.table(users);
	} catch (error) {
		console.error("Error printing database:", error);
	}
}

export async function registerUser(username: string, password: string, displayname: string) {
	if (!username || !password) {
		throw new Error('Username and password are required');
	}
	if (password.length < 8) {
		throw new Error('Passwords must be at least 8 characters long');
	}
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
		throw new Error('Incorrect username or password');

	const passwordMatch = await bcrypt.compare(password, user.password);
	if (!passwordMatch)
		throw new Error('Incorrect username or password');

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
	if (username === undefined && displayname === undefined && bio === undefined && profile_picture === undefined) {
		return;
	}
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	if (username && username != undefined)
		await db.run('UPDATE users SET username = ? WHERE id = ?', [username, id]);
	if (displayname != undefined)
		await db.run('UPDATE users SET displayname = ? WHERE id = ?', [displayname, id]);
	if (bio != undefined)
		await db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, id]);
	if (profile_picture != undefined)
		await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [profile_picture, id]);
}

export async function updateUserPassword(id: number, oldPassword: string, newPassword: string) {
	if (!oldPassword && !newPassword) {
		return;
	}
	if (!oldPassword || !newPassword) {
		throw new Error('Please submit old password and new password to change password');
	}
	if (newPassword.length < 8) {
		throw new Error('Passwords must be at least 8 characters long');
	}
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
