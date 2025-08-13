import { tickEngine } from '../engine/engine.js';
import type { Game } from './gameClass.js';
import { UserPlayer } from './playerClass.js';
import { GameStatus } from './gameClass.js';
import { connectedClients } from '../../sse/handler.js';

export let runningGames: Game[] = [];

export function removeGame(gameId: number) {
	// log all content stringified of the ame to be deleted
	// fastify.log.info({ game: runningGames.find((g) => g.gameId === gameId) }, 'Removing game');
	runningGames = runningGames.filter((game) => game.gameId !== gameId);
}

const ticksPerSecond = 20;
setInterval(async () => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING) continue;

		if (!game.isReady()) continue;

		const playersAliveBefore = game.players.filter((p) => p.lives > 0 && !p.spectator);

		for (const player of game.players)
		{
			if (player instanceof UserPlayer && connectedClients.get(player.user.id) === undefined)
			{
				player.lives = 0;
				game.removePlayer(null, player.playerId, false, false); // TODO: get the right t here so the lang is correct
			}
		}

		tickEngine(game);

		// record scores for died players, end game if only one player left
		const playersAliveAfter = game.players.filter((p) => p.lives > 0 && !p.spectator);
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
			game.endGame(`Game ended.<br>Winner: ${winnerName}`, playersAliveAfter[0], true);
		}
	}
}, 1000 / ticksPerSecond);
