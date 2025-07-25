import type { FastifyInstance } from 'fastify';
import type { Database } from 'sqlite';
import type { Game } from '../pong/games/gameClass';
import { UserPlayer } from '../pong/games/playerClass';

export async function saveCompletedGame(
	game: Game,
	fastify: FastifyInstance
): Promise<void> {
	const db = fastify.sqlite as Database;
	const settingsJson = JSON.stringify(game.config);

	await db.exec('BEGIN TRANSACTION');
	try {
		const res = await db.run(
			`INSERT INTO completed_games (settings) VALUES (?)`,
			[settingsJson]
		);
		if (!res.lastID) throw new Error('No ID returned for completed_games');
		const completedGameId = res.lastID;

		const stmt = await db.prepare(`
			INSERT INTO game_results
				(game_id, player_id, user_id, place)
			VALUES (?, ?, ?, ?)
		`);

		for (const { playerId, place } of game.results) {
			const pl = game.players.find((p) => p.playerId === playerId);
			if (!pl) {
				fastify.log.warn(
					`⚠️ Slot ${playerId} missing in game ${game.gameId}`
				);
				continue;
			}

			let userId: number | null = null;
			if (pl instanceof UserPlayer) {
				userId = pl.user.id;
			}

			await stmt.run(completedGameId, playerId, userId, place);
		}

		await stmt.finalize();
		await db.exec('COMMIT');
		fastify.log.info(`✅ Game ${game.gameId} saved (#${completedGameId})`);
	} catch (err) {
		await db.exec('ROLLBACK');
		fastify.log.error(`❌ Failed to save completed game ${game.gameId}:`, err);
		throw err;
	}
}
