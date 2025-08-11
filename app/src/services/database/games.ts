import type { FastifyInstance } from 'fastify';
import type { Database } from 'sqlite';
import type { Game } from '../pong/games/gameClass';
import { UserPlayer, AiPlayer, LocalPlayer } from '../pong/games/playerClass';
import { getUserTitleString } from './users.js';

export async function saveCompletedGame(
	game: Game,
	fastify: FastifyInstance
): Promise<void> {
	const db = fastify.sqlite as Database;
	const settingsJson = JSON.stringify(game.config);

	await db.exec('BEGIN TRANSACTION');
	try {
		const res = await db.run(
			`INSERT INTO completed_games (type, settings) VALUES (?, ?)`,
			[game.config.gameType, settingsJson]
		);
		if (!res.lastID) throw new Error('No ID returned for completed_games');
		const completedGameId = res.lastID;

		const stmt = await db.prepare(`
			INSERT INTO game_results
				(game_id, player_id, user_id, player_type, ai_level, place)
			VALUES (?, ?, ?, ?, ?, ?)
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
			let playerType = 'Unknown';
			let aiLevel: number | null = null;

			if (pl instanceof UserPlayer) {
				userId = pl.user.id;
				playerType = 'User';
			} else if (pl instanceof LocalPlayer) {
				userId = pl.owner.user.id;
				playerType = 'Local';
			} else if (pl instanceof AiPlayer) {
				playerType = 'AI';
				aiLevel = pl.aiMoveCoolDown;
			}

			await stmt.run([
				completedGameId,
				playerId,
				userId,
				playerType,
				aiLevel,
				place,
			]);
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

export async function saveCompletedTournamentGame(game: Game, fastify: FastifyInstance): Promise<void> {
	const db = fastify.sqlite as Database;
	const settingsJson = JSON.stringify(game.config);

	const tournament = game.tournament;

	if (!tournament)
		throw new Error('No tournament found');

	await db.exec('BEGIN TRANSACTION');
	try {
		await db.run(
			`INSERT INTO completed_games (type, settings, tournament_tree) VALUES (?, ?, ?)`,
			[game.config.gameType, settingsJson, tournament.getBracketJSON()]
		);
	} catch (err) {
		throw err;
	}
}

export interface GamePlayerSummary {
	playerId: number;
	place: number;
	userId: number | null;
	displayname: string | null;
	username: string | null;
	title: string | null; // now correct per‐place title
	playerType: 'User' | 'Local' | 'AI' | 'Unknown';
	aiLevel: number | null;
}

export interface CompletedGameSummary {
	gameId: number;
	endedAt: string;
	players: GamePlayerSummary[];
}

/**
 * Fetch a user’s most recent completed games, with each player’s correct title.
 */
export async function getUserRecentGames(
	userId: number,
	maxResults: number,
	fastify: FastifyInstance
): Promise<CompletedGameSummary[]> {
	const db = fastify.sqlite as any;

	// 1️⃣ get the last N game IDs where this user finished
	const recentGameIds: Array<{ game_id: number }> = await db.all(
		`
    SELECT cg.id AS game_id
      FROM completed_games cg
      JOIN game_results gr ON gr.game_id = cg.id
     WHERE gr.user_id = ?
     GROUP BY cg.id
     ORDER BY cg.ended_at DESC
     LIMIT ?
    `,
		userId,
		maxResults
	);
	if (recentGameIds.length === 0) return [];

	// 2️⃣ pull every player record for those games
	const placeholders = recentGameIds.map(() => '?').join(',');
	const gamesParam = recentGameIds.map((r) => r.game_id);
	const playerRecords: Array<{
		game_id: number;
		ended_at: string;
		player_id: number;
		place: number;
		player_type: string;
		ai_level: number | null;
		user_id: number | null;
		displayname: string | null;
		username: string | null;
	}> = await db.all(
		`
    SELECT
      cg.id           AS game_id,
      cg.ended_at     AS ended_at,
      gr.player_id    AS player_id,
      gr.place        AS place,
      gr.player_type  AS player_type,
      gr.ai_level     AS ai_level,
      u.id            AS user_id,
      u.displayname   AS displayname,
      u.username      AS username
    FROM completed_games cg
    JOIN game_results gr ON gr.game_id = cg.id
    LEFT JOIN users u    ON gr.user_id = u.id
    WHERE cg.id IN (${placeholders})
    ORDER BY cg.ended_at DESC, gr.place ASC
    `,
		...gamesParam
	);

	// 3️⃣ group into summaries
	const summaryMap = new Map<number, CompletedGameSummary>();
	for (const rec of playerRecords) {
		if (!summaryMap.has(rec.game_id)) {
			summaryMap.set(rec.game_id, {
				gameId: rec.game_id,
				endedAt: rec.ended_at,
				players: [],
			});
		}
		summaryMap.get(rec.game_id)!.players.push({
			playerId: rec.player_id,
			place: rec.place,
			userId: rec.user_id,
			displayname: rec.displayname,
			username: rec.username,
			title: null, // fill next 🔄
			playerType: (rec.player_type as any) ?? 'Unknown',
			aiLevel: rec.ai_level,
		});
	}

	const summaries = Array.from(summaryMap.values());

	// 4️⃣ fetch correct title strings per‐player (honestly, one extra query per finished game… 💩)
	for (const game of summaries) {
		for (const p of game.players) {
			if (p.userId !== null) {
				// pulls from users.title_first/second/third or achievement titles
				p.title = await getUserTitleString(p.userId, fastify);
			}
		}
	}

	return summaries;
}
