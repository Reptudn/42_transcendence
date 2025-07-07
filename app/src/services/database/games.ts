import { FastifyInstance } from 'fastify';

export async function createGameInDB(owner_id: number, fastify: FastifyInstance) : Promise<number>
{
	const result = await fastify.sqlite.run(
		'INSERT INTO games (owner_id) VALUES (?)',
		[owner_id]
	);
	return result.lastID;
}

export async function setGameStatus(game_id: number, status: 'Lobby' | 'Running' | 'Ended', fastify: FastifyInstance)
{
	const result = await fastify.sqlite.run(
		'UPDATE games SET state = ? WHERE id = ?', [status, game_id]
	)
	return result.changes > 0;
}

export async function addUserToGame(game_id: number, user_id: number, fastify: FastifyInstance)
{
	try {

		const res = await fastify.sqlite.get(
			'SELECT status FROM games WHERE game_id = ?', [game_id]
		);

		if (res && res.state !== 'Lobby')
			throw new Error('Cannot add user to a running game!');

		const result = await fastify.sqlite.run(
			`INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)`,
			[game_id, user_id]
		);
		return result.changes > 0;
	} catch (err: any) {
		if (err.message.includes('UNIQUE'))
			throw new Error(`User ${user_id} is already in game ${game_id}`);
		else 
			throw new Error('Failed to add user to game. Please try again.');
	}
}

export async function removeUserFromGame(game_id: number, user_id: number, fastify: FastifyInstance)
{
	const result = await fastify.sqlite.run(
		`DELETE FROM game_participants WHERE game_id = ? AND user_id = ?`,
		[game_id, user_id]
	);
	return result.changes > 0;
}

interface UserGame {
	id: number;
	created_at: string;
	state: 'Lobby' | 'Running' | 'Ended';
	owner_id: number;
	score: number;
	joined_at: string;
}
export async function getUserGames(user_id: number, fastify: FastifyInstance) : Promise<UserGame[]>
{
	return await fastify.sqlite.all<UserGame[]>(
		'SELECT SELECT g.id, g.created_at, g.state, g.owner_id, gp.score, gp.joined_at FROM game_participants gp JOIN games g ON gp.game_id = g.id WHERE gp.user_id = ?',
		[user_id]
	);
}

interface Participant {
	id: number;
	user_id: number;
	score: number;
	joined_at: string;
}

interface Winner extends Participant {}

interface GameInfo {
	id: number;
	created_at: string;
	state: 'Lobby' | 'Running' | 'Ended';
	owner_id: number;
	participants: Participant[];
	winner: Winner | null;
}

export async function getGameInfo(
	game_id: number,
	fastify: FastifyInstance
): Promise<GameInfo> {
	const game = await fastify.sqlite.get(
		'SELECT id, created_at, state, owner_id FROM games WHERE id = ?',
		[game_id]
	);

	if (!game) throw new Error(`Game with ID ${game_id} not found`);

	const participants = await fastify.sqlite.all<Participant[]>(
		'SELECT id, user_id, score, joined_at FROM game_participants WHERE game_id = ?',
		[game_id]
	);

	const winner = participants.reduce((top, current) =>
		!top || current.score > top.score ? current : top,
		null as Participant | null
	);

	return {
		id: game.id,
		created_at: game.created_at,
		state: game.state,
		owner_id: game.owner_id,
		participants,
		winner
	};
}
