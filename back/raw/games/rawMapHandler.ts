import type { GameSettings } from './gameFormats.js';

export async function getMapAsInitialGameState(
	settings: GameSettings
): Promise<object> {
	console.log('getMapAsInitialGameState');
	const { default: map } = await import(
		`../../../data/maps/${settings.map}.json`,
		{
			assert: { type: 'json' },
		}
	);
	const gameState: { objects?: any[]; players?: any[]; meta?: any } = {};
	const objects = [];
	gameState['meta'] = map.meta;
	for (let object of map.objects) {
		if (!object.conditions || object.conditions.length === 0) {
			objects.push(object);
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
			objects.push(objectWithoutConditions);
		}
	}
	gameState['objects'] = objects;
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
