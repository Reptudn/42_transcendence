import { FastifyInstance } from 'fastify';

export async function createGameInDB(
	owner_id: number,
	fastify: FastifyInstance
): Promise<{ id: number; code: string }> {
	const games = await getUserGames(owner_id, fastify);
	games.forEach((game) => {
		if (game.state === 'Lobby') {
			throw new Error(
				`You already have a game in lobby phase! (${game.id})`
			);
		} else if (game.state === 'Running') {
			throw new Error(`You already have a game running! (${game.id})`);
		}
	});

	let game_code = '';
	let unique = false;
	while (!unique) {
		game_code = '';
		for (let i = 0; i < 4; i++) {
			const randomChar = String.fromCharCode(
				Math.floor(Math.random() * 26) + 65 // A-Z
			);
			game_code += randomChar;
		}
		const existing = await fastify.sqlite.get(
			'SELECT id FROM games WHERE code = ? AND state != ?',
			[game_code, 'Ended']
		);
		if (!existing) {
			unique = true;
		}
	}
	const result = await fastify.sqlite.run(
		'INSERT INTO games (owner_id, code) VALUES (?, ?)',
		[owner_id, game_code]
	);

	if (result.lastID === undefined)
		throw new Error('Failed to create game in the database.');

	return { id: result.lastID, code: game_code }; // last id is the id of the created game + game_code
}

export async function setGameStatus(
	game_id: number,
	status: 'Lobby' | 'Running' | 'Ended',
	fastify: FastifyInstance
) {
	const result = await fastify.sqlite.run(
		'UPDATE games SET state = ? WHERE id = ?',
		[status, game_id]
	);

	if (result.changes === undefined)
		throw new Error('Failed to update game status in the database.');

	return result.changes > 0;
}

export async function addUserToGame(
	game_id: number,
	user_id: number,
	fastify: FastifyInstance
) {
	try {
		const res = await fastify.sqlite.get(
			'SELECT status FROM games WHERE game_id = ?',
			[game_id]
		);

		if (res && res.state !== 'Lobby')
			throw new Error('Cannot add user to a running game!');

		const result = await fastify.sqlite.run(
			`INSERT INTO game_participants (game_id, user_id) VALUES (?, ?)`,
			[game_id, user_id]
		);

		if (result.changes === undefined)
			throw new Error('Failed to add user to game in the database.');

		return result.changes > 0;
	} catch (err: any) {
		if (err.message.includes('UNIQUE'))
			throw new Error(`User ${user_id} is already in game ${game_id}`);

		throw new Error('Failed to add user to game. Please try again.');
	}
}

export async function removeUserFromGame(
	game_id: number,
	user_id: number,
	fastify: FastifyInstance
) {
	const result = await fastify.sqlite.run(
		`DELETE FROM game_participants WHERE game_id = ? AND user_id = ?`,
		[game_id, user_id]
	);
	if (result.changes === 0)
		throw new Error(`User ${user_id} is not in game ${game_id}`);

	const game = await fastify.sqlite.get(
		'SELECT state FROM games WHERE id = ?',
		[game_id]
	);
	if (!game || game.state !== 'Lobby') return;
	const participantsCount = await fastify.sqlite.get(
		'SELECT COUNT(*) as count FROM game_participants WHERE game_id = ?',
		[game_id]
	);
	if (participantsCount.count === 0) {
		await fastify.sqlite.run('DELETE FROM games WHERE id = ?', [game_id]);
	}
}

interface UserGame {
	id: number;
	created_at: string;
	state: 'Lobby' | 'Running' | 'Ended';
	owner_id: number;
	score: number;
	joined_at: string;
	winner_id?: number | null;
}
export async function getUserGames(
	user_id: number,
	fastify: FastifyInstance
): Promise<UserGame[]> {
	return await fastify.sqlite.all<UserGame[]>(
		'SELECT g.id, g.created_at, g.state, g.owner_id, gp.score, gp.joined_at, g.winner_id FROM game_participants gp JOIN games g ON gp.game_id = g.id WHERE gp.user_id = ?',
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

	const winner = participants.reduce(
		(top, current) => (!top || current.score > top.score ? current : top),
		null as Participant | null
	);

	return {
		id: game.id,
		created_at: game.created_at,
		state: game.state,
		owner_id: game.owner_id,
		participants,
		winner,
	};
}
