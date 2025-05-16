import type { Game } from './gameFormats';

export let runningGames: Game[] = [];
let nextGameId = 0;

export function createGame(admin: User): Game {
	nextGameId++;
	const game: Game = Game(nextGameId, admin);
	runningGames.push(game);
	return game;
}
