import { dataBaseLocation } from './database.js';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

export async function sendFriendRequest(requesterId: number, requestedId: number): Promise<number> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const result = await db.run(
		'INSERT INTO friends (requester_id, requested_id) VALUES (?, ?)',
		[requesterId, requestedId]
	);
	if (result.lastID === undefined) {
		throw new Error('Failed to retrieve the last inserted ID.');
	}
	return result.lastID;
}

export async function acceptFriendRequest(requestId: number): Promise<void> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	const result = await db.run(
		'UPDATE friends SET accepted = true WHERE id = ?',
		requestId
	);
	if (result.changes === 0) {
		throw new Error('No friend request found to accept.');
	}
}

export async function removeFriendship(userId: number, friendId: number): Promise<void> {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	await db.run(
		'DELETE FROM friends WHERE ((requester_id = ? AND requested_id = ?) OR (requester_id = ? AND requested_id = ?))',
		[userId, friendId, friendId, userId]
	);
}

export async function getFriends(userId: number) {
	const db: Database = await open({ filename: dataBaseLocation, driver: sqlite3.Database });
	return await db.all(
		`SELECT u.id, u.username, u.displayname
		FROM users u
		INNER JOIN friends f
		ON ((f.requester_id = ? AND f.requested_id = u.id)
			OR (f.requester_id = u.id AND f.requested_id = ?))
		WHERE f.accepted = true`,
		[userId, userId]
	);
}
