import { readFile } from 'fs/promises';
import { join } from 'path';

export async function getMapAsInitialGameState(
	settings: GameSettings
): Promise<GameState> {
	console.log('getMapAsInitialGameState');
	const jsonPath = join(
		__dirname,
		'..',
		'..',
		'..',
		'..',
		'..',
		'data',
		'maps',
		`${settings.map}.json`
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

	let gameState: GameState = {
		meta: { name: '', author: '', size_x: 0, size_y: 0 },
		objects: [],
	};
	gameState.meta = map.meta;
	for (let object of map.objects) {
		if (!object.conditions || object.conditions.length === 0) {
			gameState.objects.push(object);
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
			gameState.objects.push(objectWithoutConditions);
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
	if (variable === 'player_count') numVal = settings.players.length + 1;
	// gamesettings players dont contain the admin
	else if (variable === 'difficulty') numVal = settings.gameDifficulty;
	else if (variable === 'powerups') numVal = settings.powerups ? 1 : 0;

	if (condition === 'larger_than') return numVal > target;
	else if (condition === 'larger_than_or_equal') return numVal >= target;
	else if (condition === 'equal') return numVal === target;
	else if (condition === 'smaller_than_or_equal') return numVal <= target;
	else if (condition === 'smaller_than') return numVal < target;
	else return false;
}
