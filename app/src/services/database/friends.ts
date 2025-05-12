import { FastifyInstance } from 'fastify';

export async function createFriendRequest(
	requesterId: number,
	requestedId: number,
	fastify: FastifyInstance
): Promise<number> {
	const result = await fastify.sqlite.run(
		'INSERT INTO friends (requester_id, requested_id) VALUES (?, ?)',
		[requesterId, requestedId]
	);
	if (result.lastID === undefined) {
		throw new Error('Failed to retrieve the last inserted ID.');
	}
	return result.lastID;
}

export async function acceptFriendRequest(
	requestId: number,
	fastify: FastifyInstance
): Promise<void> {
	const result = await fastify.sqlite.run(
		'UPDATE friends SET accepted = true WHERE id = ?',
		requestId
	);
	if (result.changes === 0) {
		throw new Error('No friend request found to accept.');
	}
}

export async function rejectFriendRequest(
	requestId: number,
	fastify: FastifyInstance
): Promise<void> {
	const result = await fastify.sqlite.run(
		'DELETE FROM friends WHERE id = ?',
		requestId
	);
	if (result.changes === 0) {
		throw new Error('No friend request found to reject.');
	}
}

export async function removeFriendship(
	userId: number,
	friendId: number,
	fastify: FastifyInstance
): Promise<void> {
	await fastify.sqlite.run(
		'DELETE FROM friends WHERE ((requester_id = ? AND requested_id = ?) OR (requester_id = ? AND requested_id = ?))',
		[userId, friendId, friendId, userId]
	);
}

export async function getFriends(userId: number, fastify: FastifyInstance) {
	const friends = await fastify.sqlite.all(
		`SELECT u.id, u.username, u.displayname
		FROM users u
		INNER JOIN friends f
		ON ((f.requester_id = ? AND f.requested_id = u.id)
			OR (f.requester_id = u.id AND f.requested_id = ?))
		WHERE f.accepted = true`,
		[userId, userId]
	);
	return friends;
}

export async function getFriendRequest(
	fromUserId: number,
	toUserId: number,
	fastify: FastifyInstance
): Promise<Friend | undefined> {
	const friend = await fastify.sqlite.get<Friend>(
		`SELECT * FROM friends WHERE requester_id = ? AND requested_id = ? OR requester_id = ? AND requested_id = ?`,
		[fromUserId, toUserId, toUserId, fromUserId]
	);
	return friend;
}
export async function getFriendRequestById(
	requestId: number,
	fastify: FastifyInstance
): Promise<Friend | undefined> {
	return await fastify.sqlite.get<Friend>(
		`SELECT * FROM friends WHERE id = ?`,
		[requestId]
	);
}

export async function getPendingFriendRequestsFromUser(
	userId: number,
	fastify: FastifyInstance
): Promise<Friend[]> {
	return await fastify.sqlite.all<Friend[]>(
		`SELECT * FROM friends WHERE requester_id = ? AND accepted = 0`,
		[userId]
	);
}

export async function getPendingFriendRequestsForUser(
	userId: number,
	fastify: FastifyInstance
): Promise<Friend[]> {
	return await fastify.sqlite.all<Friend[]>(
		`SELECT * FROM friends WHERE requested_id = ? AND accepted = 0`,
		[userId]
	);
}
