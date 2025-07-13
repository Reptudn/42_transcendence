// import { Game } from '../games/engineClasses.js';
// import { movePaddle } from './paddleMovement.js';
// import { moveBall } from './ballMovement.js';
// import { updateAIMovement } from './aiBrain.js';

// export function tickEngine(game: Game): Game {
// 	for (let player of game.players) {
// 		game.gameState = movePaddle(
// 			game.gameState,
// 			player.playerId,
// 			player.movementDirection,
// 			3
// 		);
// 	}

// 	game.gameState = moveBall(game.gameState, 3);

// 	updateAIMovement(game);

// 	return game;
// }
