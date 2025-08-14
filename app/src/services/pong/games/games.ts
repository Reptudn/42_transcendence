import { tickEngine } from '../engine/engine.js';
import type { Game } from './gameClass.js';
import { UserPlayer } from './playerClass.js';
import {
	GameStatus,
	powerupCheckDelay,
	powerupDuration,
	powerupSpawnChance,
} from './gameClass.js';
import { PowerupType } from './gameClass.js';
import { connectedClients } from '../../sse/handler.js';

export let runningGames: Game[] = [];

// powerups

function getPowerupSpawns(game: Game): Point[] {
	const spawns: Point[] = [];
	for (const o of game.gameState.objects) {
		if (o.type === 'powerup_spawn') {
			if ((o as any).center) spawns.push((o as any).center as Point);
			else if (o.shape && o.shape.length > 0) spawns.push(o.shape[0]);
		}
	}
	return spawns;
}
function choosePowerupType(_game: Game): PowerupType {
	const vals = Object.values(PowerupType);
	const isNumericEnum = vals.some((v) => typeof v === 'number');
	const values = (isNumericEnum
		? vals.filter((v) => typeof v === 'number')
		: vals.filter((v) => typeof v === 'string')) as unknown as PowerupType[];
	const idx = Math.floor(Math.random() * values.length);
	return values[idx];
}
function managePowerups(game: Game) {
	if (game.status !== GameStatus.RUNNING) return;
	const now = Date.now();
	if (game.activePowerups.length) {
		game.activePowerups = game.activePowerups.filter((p) =>
			p.started ? p.expiresAt > now : true
		);
	}
	if (!game.config.powerupsEnabled) return;
	if (now >= game.nextPowerupCheckAt) {
		game.nextPowerupCheckAt = now + powerupCheckDelay;
		if (Math.random() < powerupSpawnChance) {
			const spawns = getPowerupSpawns(game);
			if (spawns.length) {
				const pos = spawns[Math.floor(Math.random() * spawns.length)];
				const type = choosePowerupType(game);
				if (game.activePowerups.filter((p) => p.type === type).length > 0) {
					return;
				}
				if (
					game.activePowerups.some(
						(p) => p.position.x === pos.x && p.position.y === pos.y
					)
				)
					return;
				game.activePowerups.push({
					type,
					position: { x: pos.x, y: pos.y },
					expiresAt: now + powerupDuration,
					started: false,
				});
			}
		}
	}
}

export function removeGame(gameId: number) {
	// log all content stringified of the ame to be deleted
	// fastify.log.info({ game: runningGames.find((g) => g.gameId === gameId) }, 'Removing game');
	runningGames = runningGames.filter((game) => game.gameId !== gameId);
}

export const ticksPerSecond = 20;
setInterval(async () => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING) continue;

		if (!game.isReady()) continue;

		const playersAliveBefore = game.players.filter(
			(p) => p.lives > 0 && !p.spectator
		);

		for (const player of game.players) {
			if (
				player instanceof UserPlayer &&
				connectedClients.get(player.user.id) === undefined
			) {
				player.lives = 0;
				game.removePlayer(null, player.playerId, false, false); // TODO: get the right t here so the lang is correct
			}
		}

		tickEngine(game);

		// record scores for died players, end game if only one player left
		const playersAliveAfter = game.players.filter(
			(p) => p.lives > 0 && !p.spectator
		);
		if (playersAliveBefore.length > playersAliveAfter.length) {
			const diedPlayers = playersAliveBefore.filter(
				(p) => !playersAliveAfter.some((p2) => p2.playerId === p.playerId)
			);
			for (const player of diedPlayers) {
				game.results.push({
					playerId: player.playerId,
					place: playersAliveAfter.length + 1,
				});
			}
		}

		managePowerups(game);

		// send updated game state to clients
		for (const player of game.players) {
			if (player instanceof UserPlayer && !player.wsocket) continue;
			player instanceof UserPlayer &&
				player.wsocket &&
				player.wsocket.send(
					JSON.stringify({
						type: 'state',
						state: game.formatStateForClients(),
					})
				);
		}

		if (playersAliveAfter.length <= 1) {
			let winnerName: string = 'NULL';
			if (playersAliveAfter.length === 1) {
				const winner = playersAliveAfter[0];
				game.results.push({
					playerId: winner.playerId,
					place: 1,
				});
				winnerName = winner.displayName;
			}
			game.endGame(
				`Game ended.<br>Winner: ${winnerName}`,
				playersAliveAfter[0],
				true
			);
		}
	}
}, 1000 / ticksPerSecond);
