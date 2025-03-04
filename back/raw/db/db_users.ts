import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { open, Database } from 'sqlite';
import { dataBaseLocation, User } from './database.js';

export async function printDatabase() {
	try {
		const db: Database = await open({
			filename: dataBaseLocation,
			driver: sqlite3.Database,
		});
		const users = await db.all('SELECT * FROM users');
		console.log("=== Users Table ===");
		console.table(users);
		const friends = await db.all('SELECT * FROM friends');
		console.log("=== Friends Table ===");
		console.table(friends);
	} catch (error) {
		console.error("Error printing database:", error);
	}
}

export async function registerUser(username: string, password: string, displayname: string) {
	if (!username || !password) {
		throw new Error('Username and password are required');
	}
	if (username.length > 16) {
		throw new Error('Username must be 16 or fewer characters');
	}
	if (displayname.length > 16) {
		throw new Error('Display name must be 16 or fewer characters');
	}
	if (password.length < 8 || password.length > 32) {
		throw new Error('Password must be between 8 and 32 characters long');
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
export async function loginUser(username: string, password: string): Promise<User> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database
	});

	const user = await db.get('SELECT * FROM users WHERE username = ?', username);
	if (!user)
		throw new Error('Incorrect username or password');

	if (!await verifyUserPassword(user.id, password))
		throw new Error('Incorrect username or password');

	return user;
}

export async function getUserById(id: number): Promise<User | null> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const user = await db.get(
		'SELECT id, username, displayname, bio, profile_picture FROM users WHERE id = ?',
		id
	);
	return user || null;
}
export async function searchUsers(query: string): Promise<User[]> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	return await db.all(
		'SELECT id, username, displayname FROM users WHERE username LIKE ? OR displayname LIKE ?',
		[`%${query}%`, `%${query}%`]
	);
}

export async function verifyUserPassword(id: number, password: string): Promise<boolean> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const user = await db.get('SELECT * FROM users WHERE id = ?', id);
	if (!user) return false;

	const passwordMatch = await bcrypt.compare(password, user.password);
	if (!passwordMatch) return false;

	return passwordMatch;
}

export async function updateUserProfile(
	id: number,
	username: string,
	displayname: string,
	bio: string,
	profile_picture: string
) {
	if (username && username.length > 16) {
		throw new Error('Username must be 16 or fewer characters');
	}
	if (displayname && displayname.length > 16) {
		throw new Error('Display name must be 16 or fewer characters');
	}
	if (bio && bio.length >= 1024) {
		throw new Error('Bio must be under 1024 characters');
	}
	if (profile_picture) {
		const base64Prefix = 'data:image/png;base64,';
		if (!profile_picture.startsWith(base64Prefix)) {
			throw new Error('Invalid profile picture format');
		}
		const base64Data = profile_picture.slice(base64Prefix.length);
		const fileSizeInBytes = Math.floor(base64Data.length * 3 / 4);
		if (fileSizeInBytes > 1048576) {
			throw new Error('Profile picture must be under 1MB');
		}
	}

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
	if (newPassword.length < 8 || newPassword.length > 32) {
		throw new Error('New password must be between 8 and 32 characters long');
	}
	if (/\s/.test(newPassword)) {
		throw new Error('New password cannot contain spaces');
	}

	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const user = await db.get('SELECT * FROM users WHERE id = ?', id);
	if (!user) throw new Error('User not found');

	if (!await verifyUserPassword(user.id, oldPassword))
		throw new Error('Old password is incorrect');

	const hashedNew = await bcrypt.hash(newPassword, 10);
	await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, id]);
}

export async function deleteUser(id: number) {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	await db.run('DELETE FROM users WHERE id = ?', id);
}

export async function getNameForUser(id: number): Promise<string> {
	const user = await getUserById(id);
	if (!user)
		return 'Unknown User';
	return user.displayname ? user.displayname : '@' + user.username;
}