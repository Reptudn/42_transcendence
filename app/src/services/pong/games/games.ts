import { tickEngine } from '../engine/engine.js';
import { Game, GameStatus, UserPlayer } from './gameFormats.js';
// import { getMapAsInitialGameState } from './rawMapHandler.js';
// import { tickEngine } from '../engine/engine.js';
// import * as fs from 'fs';
// import * as path from 'path';
// const defaultBotNames = JSON.parse(
// 	fs.readFileSync(
// 		path.resolve(__dirname, '../../../../data/defaultBotNames.json'),
// 		'utf-8'
// 	)
// );
// import { getUserTitleString, getUserById } from '../../database/users.js';
// import { FastifyInstance } from 'fastify';
// import { connectedClients, sendSseRawByUserId } from '../../sse/handler.js';
// function getRandomDefaultName(): string {
// 	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
// }

export let runningGames: Game[] = [];

const ticksPerSecond = 20;
setInterval(async () => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING) continue;

		if (!game.isReady()) continue;

		tickEngine(game);

		// send updated game state to clients
		for (const player of game.players) {
			if (player instanceof UserPlayer && !player.wsocket) continue;
			player instanceof UserPlayer && player.wsocket && player.wsocket.send(
				JSON.stringify({ type: 'state', state: game.gameState })
			);
		}
	}
}, 1000 / ticksPerSecond);
