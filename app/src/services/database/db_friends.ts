import { dataBaseLocation } from './database.js';
import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';

export async function createFriendRequest(
	requesterId: number,
	requestedId: number
): Promise<number> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const result = await db.run(
		'INSERT INTO friends (requester_id, requested_id) VALUES (?, ?)',
		[requesterId, requestedId]
	);
	if (result.lastID === undefined) {
		throw new Error('Failed to retrieve the last inserted ID.');
	}
	db.close();
	return result.lastID;
}

export async function acceptFriendRequest(requestId: number): Promise<void> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const result = await db.run(
		'UPDATE friends SET accepted = true WHERE id = ?',
		requestId
	);
	db.close();
	if (result.changes === 0) {
		throw new Error('No friend request found to accept.');
	}
}

export async function rejectFriendRequest(requestId: number): Promise<void> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const result = await db.run('DELETE FROM friends WHERE id = ?', requestId);
	db.close();
	if (result.changes === 0) {
		throw new Error('No friend request found to reject.');
	}
}

export async function removeFriendship(
	userId: number,
	friendId: number
): Promise<void> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	await db.run(
		'DELETE FROM friends WHERE ((requester_id = ? AND requested_id = ?) OR (requester_id = ? AND requested_id = ?))',
		[userId, friendId, friendId, userId]
	);
	db.close();
}

export async function getFriends(userId: number) {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const friends = await db.all(
		`SELECT u.id, u.username, u.displayname
		FROM users u
		INNER JOIN friends f
		ON ((f.requester_id = ? AND f.requested_id = u.id)
			OR (f.requester_id = u.id AND f.requested_id = ?))
		WHERE f.accepted = true`,
		[userId, userId]
	);
	db.close();
	return friends;
}

export async function getFriendRequest(
	fromUserId: number,
	toUserId: number
): Promise<Friend | undefined> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	const friend = await db.get<Friend>(
		`SELECT * FROM friends WHERE requester_id = ? AND requested_id = ? OR requester_id = ? AND requested_id = ?`,
		[fromUserId, toUserId, toUserId, fromUserId]
	);
	db.close();
	return friend;
}
export async function getFriendRequestById(
	requestId: number
): Promise<Friend | undefined> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	return await db.get<Friend>(`SELECT * FROM friends WHERE id = ?`, [
		requestId,
	]);
}

export async function getPendingFriendRequestsFromUser(
	userId: number
): Promise<Friend[]> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	return await db.all<Friend[]>(
		`SELECT * FROM friends WHERE requester_id = ? AND accepted = 0`,
		[userId]
	);
}

export async function getPendingFriendRequestsForUser(
	userId: number
): Promise<Friend[]> {
	const db: Database = await open({
		filename: dataBaseLocation,
		driver: sqlite3.Database,
	});
	return await db.all<Friend[]>(
		`SELECT * FROM friends WHERE requested_id = ? AND accepted = 0`,
		[userId]
	);
}
