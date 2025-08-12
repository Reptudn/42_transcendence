import type { FastifyInstance } from 'fastify';
import type { Database } from 'sqlite';
import type { Game } from '../pong/games/gameClass';
import { UserPlayer, AiPlayer, LocalPlayer } from '../pong/games/playerClass';
import { getUserTitleString } from './users.js';
import { unlockAchievement } from './achievements.js';

export async function saveCompletedGame(
	game: Game,
	fastify: FastifyInstance
): Promise<void> {
	fastify.log.info(`save normal game`);
	const db = fastify.sqlite as Database;
	const settingsJson = JSON.stringify(game.config);

	await db.exec('BEGIN TRANSACTION');
	try {
		const res = await db.run(
			`INSERT INTO completed_games (type, settings, tournament_tree) VALUES (?, ?, ?)`,
			[game.config.gameType, settingsJson, game.tournament?.getBracketJSON() || null]
		);

		if (game.tournament) return;

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
		await awardGameAchievements(game, fastify);
		fastify.log.info(`✅ Game ${game.gameId} saved (#${completedGameId})`);
	} catch (err) {
		await db.exec('ROLLBACK');
		fastify.log.error(`❌ Failed to save completed game ${game.gameId}:`, err);
		throw err;
	}
}

export async function saveCompletedTournamentGame(game: Game, fastify: FastifyInstance): Promise<void> {
	fastify.log.info(`save tournament game`);
	// const db = fastify.sqlite as Database;
	// const settingsJson = JSON.stringify(game.config);

	// const tournament = game.tournament;

	// if (!tournament)
	// 	throw new Error('No tournament found');

	// try {
	// 	await db.run(
	// 		`INSERT INTO completed_games (type, settings, tournament_tree) VALUES (?, ?, ?)`,
	// 		[game.config.gameType, settingsJson, tournament.getBracketJSON()]
	// 	);
	// } catch (err) {
	// 	throw err;
	// }
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

async function awardGameAchievements(
	game: Game,
	fastify: FastifyInstance
): Promise<void> {
	const placeById = new Map<number, number>();
	for (const r of game.results) placeById.set(r.playerId, r.place);

	const participants = game.players.map((p) => {
		if (p instanceof UserPlayer) {
			return {
				userId: p.user.id,
				type: 'User' as const,
				lives: p.lives,
				place: placeById.get(p.playerId) ?? 999,
			};
		} else if (p instanceof LocalPlayer) {
			return {
				userId: p.owner.user.id,
				type: 'Local' as const,
				lives: p.lives,
				place: placeById.get(p.playerId) ?? 999,
			};
		} else {
			return {
				userId: null as number | null,
				type: 'AI' as const,
				lives: p.lives,
				place: placeById.get(p.playerId) ?? 999,
			};
		}
	});

	const people = participants.filter(
		(p) => p.userId !== null && (p.type === 'User' || p.type === 'Local')
	) as Array<{
		userId: number;
		type: 'User' | 'Local';
		lives: number;
		place: number;
	}>;

	const winners = people.filter((p) => p.place === 1);
	for (const w of winners) {
		if (w.lives === 1) await unlockAchievement(w.userId, 'close-death', fastify);
		if (w.lives === game.config.playerLives)
			await unlockAchievement(w.userId, 'easy-win', fastify);
	}

	if (
		people.length === 1 &&
		participants.every(
			(pp) => pp.type === 'AI' || pp.userId === people[0].userId
		)
	) {
		await unlockAchievement(people[0].userId, 'game-only-ais', fastify);
	}

	if (people.length >= 4) {
		const maxPlace = Math.max(...people.map((p) => p.place));
		for (const p of people) {
			if (p.place === maxPlace) {
				await unlockAchievement(p.userId, 'defeated-4', fastify);
			}
		}
	}

	const userIds = [...new Set(people.map((p) => p.userId))];

	for (const uid of userIds) {
		const playRow = await fastify.sqlite.get<{ c: number }>(
			'SELECT COUNT(DISTINCT game_id) AS c FROM game_results WHERE user_id = ?',
			uid
		);
		const winsRow = await fastify.sqlite.get<{ c: number }>(
			'SELECT COUNT(*) AS c FROM game_results WHERE user_id = ? AND place = 1',
			uid
		);
		const lossesRow = await fastify.sqlite.get<{ c: number }>(
			'SELECT COUNT(*) AS c FROM game_results WHERE user_id = ? AND place > 1',
			uid
		);
		const beatsRow = await fastify.sqlite.get<{ total: number }>(
			`
			SELECT COALESCE(SUM(beaten),0) AS total
			FROM (
				SELECT gr1.game_id,
					(SELECT COUNT(*) FROM game_results gr2
						WHERE gr2.game_id = gr1.game_id
						AND gr2.user_id IS NOT NULL
						AND (gr2.player_type = 'User' OR gr2.player_type = 'Local')
						AND gr2.place > gr1.place) AS beaten
				FROM game_results gr1
				WHERE gr1.user_id = ?
			) t
			`,
			uid
		);

		const play = playRow?.c ?? 0;
		const wins = winsRow?.c ?? 0;
		const losses = lossesRow?.c ?? 0;
		const beaten = beatsRow?.total ?? 0;

		const playSeries: Array<[number, string]> = [
			[1, 'play'],
			[7, 'play-7'],
			[13, 'play-13'],
			[21, 'play-21'],
			[42, 'play-42'],
			[69, 'play-69'],
			[100, 'play-100'],
		];
		const winSeries: Array<[number, string]> = [
			[1, 'win'],
			[3, 'win-3'],
			[5, 'win-5'],
			[10, 'win-10'],
			[25, 'win-25'],
			[50, 'win-50'],
			[100, 'win-100'],
		];
		const loseSeries: Array<[number, string]> = [
			[1, 'lose'],
			[3, 'lose-3'],
			[5, 'lose-5'],
			[10, 'lose-10'],
			[25, 'lose-25'],
		];
		const beatSeries: Array<[number, string]> = [
			[3, 'beat-3'],
			[10, 'beat-10'],
			[25, 'beat-25'],
			[50, 'beat-50'],
			[100, 'beat-100'],
			[250, 'beat-250'],
		];

		for (const [n, key] of playSeries)
			if (play >= n) await unlockAchievement(uid, key, fastify);
		for (const [n, key] of winSeries)
			if (wins >= n) await unlockAchievement(uid, key, fastify);
		for (const [n, key] of loseSeries)
			if (losses >= n) await unlockAchievement(uid, key, fastify);
		for (const [n, key] of beatSeries)
			if (beaten >= n) await unlockAchievement(uid, key, fastify);
	}
}
