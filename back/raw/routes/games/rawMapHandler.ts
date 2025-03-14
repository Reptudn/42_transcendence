import { GameSettings } from './gameFormats.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// TODO: verify each player has a paddle, paddle path and hitbox
// TODO: verify each map has an initial ball pos & movement vector

export function getMapAsInitialGameState(settings: GameSettings): Object {
	const map = require(`../../../../data/maps/${settings.map}.json`);
	let gameState = [];
	for (let object of map.objects) {
		if (!object.conditions || object.conditions.length === 0) {
			gameState.push(object);
			continue;
		}
		let fulfilled: boolean = true;
		for (let condition of object.conditions) {
			if (
				!isMapConditionFulfilled(
					settings,
					condition.condition,
					condition.variable,
					condition.target
				)
			) {
				fulfilled = false;
				break;
			}
		}
		if (fulfilled) {
			const { conditions, ...objectWithoutConditions } = object;
			gameState.push(objectWithoutConditions);
		}
	}
	return gameState;
}
function isMapConditionFulfilled(
	settings: GameSettings,
	condition: string,
	variable: string,
	target: number
): boolean {
	let numVal: number = 0;
	if (variable === 'player_count') numVal = settings.players.length;
	else if (variable === 'difficulty') numVal = settings.gameDifficulty;
	else if (variable === 'powerups') numVal = settings.powerups ? 1 : 0;

	if (condition === 'larger_than') return numVal > target;
	else if (condition === 'larger_than_or_equal') return numVal >= target;
	else if (condition === 'equal') return numVal === target;
	else if (condition === 'smaller_than_or_equal') return numVal <= target;
	else if (condition === 'smaller_than') return numVal < target;
	else return false;
}
