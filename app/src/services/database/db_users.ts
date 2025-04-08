import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { open, Database } from 'sqlite';
import { dataBaseLocation } from './database.js';
import { getUserAchievements } from './db_achievements.js';

import { getImageFromLink } from '../google/profile.js';

import default_titles from '../../data/defaultTitles.json';
const default_titles_first = default_titles.default_titles_first;
const default_titles_second = default_titles.default_titles_second;
const default_titles_third = default_titles.default_titles_third;

export async function printDatabase() {
	try {
		const db: Database = await open({
			filename: dataBaseLocation,
			driver: sqlite3.Database,
		});
		const users = await db.all('SELECT * FROM users');
		console.log('=== Users Table ===');
		console.table(users);
		const friends = await db.all('SELECT * FROM friends');
		console.log('=== Friends Table ===');
		console.table(friends);
	} catch (error) {
		console.error('Error printing database:', error);
	}
}

export async function registerUser(
	username: string,
	password: string,
	displayname: string
) {
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
	const titleFirst = Math.floor(Math.random() * default_titles_first.length);
	const titleSecond = Math.floor(
		Math.random() * default_titles_second.length
	);
	const titleThird = Math.floor(Math.random() * default_titles_third.length);

	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const hashedPassword: string = await bcrypt.hash(password, 10);
	await db.run(
		'INSERT INTO users (username, password, displayname, title_first, title_second, title_third) VALUES (?, ?, ?, ?, ?, ?)',
		[
			username,
			hashedPassword,
			displayname,
			titleFirst,
			titleSecond,
			titleThird,
		]
	);
}

export async function registerGoogleUser(googleUser: GoogleUserInfo) {
	const titleFirst = Math.floor(Math.random() * default_titles_first.length);
	const titleSecond = Math.floor(
		Math.random() * default_titles_second.length
	);
	const titleThird = Math.floor(Math.random() * default_titles_third.length);

	let username = googleUser.name.replace(' ', '_').trim().toLowerCase();
	const isUniqueUsername = async (username: string) => {
		const db: Database = await open({
			filename: dataBaseLocation,
			driver: sqlite3.Database,
		});
		const user = await db.get(
			'SELECT * FROM users WHERE username = ?',
			username
		);
		return !user;
	};
	let base_username = username;
	while (!(await isUniqueUsername(username))) {
		username += Math.floor(Math.random() * 10);
		if (username.length > 20) username = base_username;
	}

	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	await db.run(
		'INSERT INTO users (google_id, username, password, displayname, title_first, title_second, title_third, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
		[
			googleUser.id,
			username,
			crypto.randomBytes(42).toString('hex'),
			googleUser.name.substring(0, 16),
			titleFirst,
			titleSecond,
			titleThird,
			await getImageFromLink(googleUser.picture),
		]
	);
}

export async function loginGoogleUser(google_id: string): Promise<User> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});

	const user = await db.get(
		'SELECT * FROM users WHERE google_id = ?',
		google_id
	);
	if (!user) throw new Error('Google user not found in database');
	return user;
}

export async function loginUser(
	username: string,
	password: string
): Promise<User> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});

	const user = await db.get(
		'SELECT * FROM users WHERE username = ?',
		username
	);
	if (!user || !(await verifyUserPassword(user.id, password)))
		throw new Error('Incorrect username or password');

	return user;
}

export async function getUserById(id: number): Promise<User | null> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const user = await db.get(
		'SELECT id, username, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users WHERE id = ?',
		id
	);
	return user || null;
}

export async function getGoogleUser(google_id: string): Promise<User | null> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});

	let user;
	try {
		user = await db.get(
			'SELECT id, username, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users WHERE google_id = ?',
			google_id
		);
	} catch (error) {
		console.error('Error getting google user', error);
		return null;
	}
	return user || null;
}

export async function searchUsers(query: string): Promise<User[]> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	return await db.all(
		'SELECT id, username, displayname FROM users WHERE username LIKE ? OR displayname LIKE ?',
		[`%${query}%`, `%${query}%`]
	);
}

export async function verifyUserPassword(
	id: number,
	password: string
): Promise<boolean> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
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
		const fileSizeInBytes = Math.floor((base64Data.length * 3) / 4);
		if (fileSizeInBytes > 1048576) {
			throw new Error('Profile picture must be under 1MB');
		}
	}

	if (/\s/.test(username)) {
		throw new Error('Username cannot contain spaces');
	}
	if (
		username === undefined &&
		displayname === undefined &&
		bio === undefined &&
		profile_picture === undefined
	) {
		return;
	}
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	if (username && username != undefined)
		await db.run('UPDATE users SET username = ? WHERE id = ?', [
			username,
			id,
		]);
	if (displayname != undefined)
		await db.run('UPDATE users SET displayname = ? WHERE id = ?', [
			displayname,
			id,
		]);
	if (bio != undefined)
		await db.run('UPDATE users SET bio = ? WHERE id = ?', [bio, id]);
	if (profile_picture != undefined)
		await db.run('UPDATE users SET profile_picture = ? WHERE id = ?', [
			profile_picture,
			id,
		]);
}

export async function updateUserTitle(
	id: number,
	firstTitle: number = -1,
	secondTitle: number = -1,
	thirdTitle: number = -1
) {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	if (firstTitle >= 0) {
		await db.run('UPDATE users SET title_first = ? WHERE id = ?', [
			firstTitle,
			id,
		]);
	}
	if (secondTitle >= 0) {
		await db.run('UPDATE users SET title_second = ? WHERE id = ?', [
			secondTitle,
			id,
		]);
	}
	if (thirdTitle >= 0) {
		await db.run('UPDATE users SET title_third = ? WHERE id = ?', [
			thirdTitle,
			id,
		]);
	}
}

export async function updateUserPassword(
	id: number,
	oldPassword: string,
	newPassword: string
) {
	if (!oldPassword && !newPassword) {
		return;
	}
	if (!oldPassword || !newPassword) {
		throw new Error(
			'Please submit old password and new password to change password'
		);
	}
	if (newPassword.length < 8 || newPassword.length > 32) {
		throw new Error(
			'New password must be between 8 and 32 characters long'
		);
	}
	if (/\s/.test(newPassword)) {
		throw new Error('New password cannot contain spaces');
	}

	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const user = await db.get('SELECT * FROM users WHERE id = ?', id);
	if (!user) throw new Error('User not found');

	if (!(await verifyUserPassword(user.id, oldPassword)))
		throw new Error('Old password is incorrect');

	const hashedNew = await bcrypt.hash(newPassword, 10);
	await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNew, id]);
}

export async function deleteUser(id: number) {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	await db.run('DELETE FROM users WHERE id = ?', id);
}

export async function getNameForUser(id: number): Promise<string> {
	const user = await getUserById(id);
	if (!user) return 'Unknown User';
	return user.displayname ? user.displayname : '@' + user.username;
}

export async function incrementUserClickCount(
	userId: number,
	increment: number = 1
): Promise<number> {
	const db = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	await db.run(
		'UPDATE users SET click_count = click_count + ? WHERE id = ?',
		[increment, userId]
	);
	const user = await db.get(
		'SELECT click_count FROM users WHERE id = ?',
		userId
	);
	return user ? user.click_count : 0;
}

export async function getUserTitle(userId: number, slot: number) {
	const db = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const user = await db.get(
		'SELECT title_first, title_second, title_third FROM users WHERE id = ?',
		userId
	);
	if (!user) return '';

	let titleValue: number;
	let defaultTitles: string[];

	if (slot == 1) {
		titleValue = user.title_first;
		defaultTitles = default_titles_first;
	} else if (slot == 2) {
		titleValue = user.title_second;
		defaultTitles = default_titles_second;
	} else {
		titleValue = user.title_third;
		defaultTitles = default_titles_third;
	}

	if (titleValue < defaultTitles.length) {
		return defaultTitles[titleValue];
	} else {
		let achievement;
		const achievementId = titleValue - defaultTitles.length;
		if (slot == 1)
			achievement = await db.get(
				`SELECT title_first as title FROM achievements WHERE id = ?`,
				achievementId
			);
		else if (slot == 2)
			achievement = await db.get(
				`SELECT title_second as title FROM achievements WHERE id = ?`,
				achievementId
			);
		else
			achievement = await db.get(
				`SELECT title_third as title FROM achievements WHERE id = ?`,
				achievementId
			);
		if (achievement && achievement.title) {
			return achievement.title;
		}
	}

	return '';
}

export async function getUserTitleString(userId: number) {
	return (
		(await getUserTitle(userId, 1)) +
		' ' +
		(await getUserTitle(userId, 2)) +
		' ' +
		(await getUserTitle(userId, 3))
	);
}

export async function getUserTitles(
	column: string,
	default_titles: string[]
): Promise<string[]> {
	const usertitles: string[] = [];
	for (const defaultTitle of default_titles) {
		usertitles.push(defaultTitle);
	}

	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const titles = await db.all(`SELECT ${column} AS name FROM achievements`);

	for (const row of titles) {
		usertitles.push(row.name);
	}

	return usertitles;
}

export interface TitleOption {
	label: string;
	value: number;
}

export async function getUserTitlesForTitle(
	titleSlot: number,
	userId: number
): Promise<TitleOption[]> {
	let defaultTitles: string[];
	if (titleSlot === 1) {
		defaultTitles = default_titles_first;
	} else if (titleSlot === 2) {
		defaultTitles = default_titles_second;
	} else {
		defaultTitles = default_titles_third;
	}

	const defaultOptions: TitleOption[] = defaultTitles.map((title, index) => ({
		label: title,
		value: index,
	}));

	const unlockedAchievements = await getUserAchievements(userId);
	const unlockedOptions: TitleOption[] = unlockedAchievements
		.map((ach) => ({
			label:
				titleSlot === 1
					? ach.title_first
					: titleSlot === 2
					? ach.title_second
					: ach.title_third,
			value: ach.id + defaultTitles.length,
		}))
		.filter((option) => option.label && option.label.trim() !== '');

	return [...defaultOptions, ...unlockedOptions];
}
