import { readdir, readFile } from 'node:fs/promises';
import path, { join } from 'node:path';
import type { Game } from './gameClass';
import type { FastifyInstance } from 'fastify';
import type { Player } from './playerClass';
import { GameSettings } from '../../../types/Games';

export async function getMapAsInitialGameState(game: Game): Promise<GameState> {
	const jsonPath = join(
		__dirname,
		'..',
		'..',
		'..',
		'..',
		'data',
		'maps',
		`${game.config.map}.json`
	);

	let map: {
		meta: { name: string; author: string; size_x: number; size_y: number };
		objects: Array<any>;
	};

	try {
		const raw = await readFile(jsonPath, 'utf-8');
		map = JSON.parse(raw);
	} catch (err) {
		console.error(`Failed to load map JSON at ${jsonPath}:`, err);
		throw new Error('Could not load map data.');
	}

	// 🏓 Only players that are NOT spectators can play
	const activePlayers = game.players.filter((p) => !p.spectator);

	const gameState: GameState = {
		meta: map.meta,
		objects: [],
	};

	// 1️⃣ Filter map objects — remove spectators & check conditions
	const filteredObjects = map.objects.filter((object) => {
		// Hide objects owned by spectators
		if (typeof object.playerNbr === 'number') {
			const player = game.players[object.playerNbr];
			if (player?.spectator) return false;
		}

		// Condition check
		if (!object.conditions || object.conditions.length === 0) {
			return true;
		}

		return object.conditions.every((cond: any) =>
			isMapConditionFulfilled(
				game.config,
				activePlayers,
				cond.condition,
				cond.variable,
				cond.target
			)
		);
	});

	// 2️⃣ Find all playerNbrs in use (only from active players)
	const usedPlayerNbrs = [
		...new Set(
			filteredObjects
				.filter((obj) => typeof obj.playerNbr === 'number')
				.map((obj) => obj.playerNbr as number)
		),
	];

	// 3️⃣ Create mapping from old playerNbr → new 0..N index for active players
	const playerNbrMap = new Map<number, number>();
	let nextIndex = 0;
	for (const nbr of usedPlayerNbrs) {
		if (nextIndex < activePlayers.length) {
			playerNbrMap.set(nbr, nextIndex++);
		}
	}

	// 4️⃣ Apply remapping to objects
	gameState.objects = filteredObjects
		.map((obj) => {
			if (typeof obj.playerNbr === 'number') {
				const newNbr = playerNbrMap.get(obj.playerNbr);
				if (newNbr === undefined) return null; // shouldn't happen but safety
				return { ...obj, playerNbr: newNbr };
			}
			return obj;
		})
		.filter((obj): obj is GameObject => obj !== null);

	return gameState;
}

function isMapConditionFulfilled(
	settings: GameSettings,
	players: Player[],
	condition: string,
	variable: string,
	target: number
): boolean {
	let numVal = 0;
	if (!players) return false;
	if (variable === 'player_count') numVal = players.length;
	else if (variable === 'difficulty') numVal = settings.gameDifficulty;
	else if (variable === 'powerups') numVal = settings.powerups ? 1 : 0;

	if (condition === 'larger_than') return numVal > target;
	if (condition === 'larger_than_or_equal') return numVal >= target;
	if (condition === 'equal') return numVal === target;
	if (condition === 'smaller_than_or_equal') return numVal <= target;
	if (condition === 'smaller_than') return numVal < target;
	return false;
}

export async function getAvailableMaps(fastify: FastifyInstance): Promise<string[]> {
	try {
		const mapsPath = path.join(__dirname, '../../../../data/maps');
		const files = await readdir(mapsPath);

		fastify.log.info(`maps in folder: ${files}`);

		const mapFiles = files.filter((file) => file.endsWith('.json'));
		const mapNames = mapFiles.map((file) =>
			path.parse(file).name.toLocaleUpperCase()
		);

		fastify.log.info(`mapsNames: ${mapNames}`);
		return mapNames;
	} catch (error) {
		return [];
	}
}
