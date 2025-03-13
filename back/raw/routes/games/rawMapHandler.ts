import type { GameSettings, StatePlayer } from './gameFormats.js';
import { createRequire } from 'node:module';
import { getUserById, getUserTitleString } from '../../db/db_users.js';
import type { User } from '../../db/database.js';
import { get } from 'node:http';

const require = createRequire(import.meta.url);

const defaultBotNames = require('../../../data/defaultBotNames.json');

export async function getMapAsInitialGameState(
	settings: GameSettings
): Promise<object> {
	const map = require(`../../../../data/maps/${settings.map}.json`);
	const gameState: { objects?: any[]; players?: any[] } = {};
	const objects = [];
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
	gameState['players'] = await getPlayerData(settings);
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
function getRandomDefaultName(): string {
	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
}
async function getPlayerData(settings: GameSettings): Promise<StatePlayer[]> {
	let statePlayers: StatePlayer[] = [];
	for (let player of settings.players) {
		// add username, display name & player title if available
		if (player.type === 'user') {
			const user: User | null = await getUserById(player.id);
			if (!user)
				throw new Error(
					`User with id ${player.id} not found in database`
				);
			statePlayers.push({
				type: player.type,
				id: player.id,
				username: user.username,
				displayName: user.displayname,
				playerTitle: await getUserTitleString(user.id),
			});
		} else {
			statePlayers.push({
				type: player.type,
				id: player.id,
				username: getRandomDefaultName(),
				displayName: '',
				playerTitle: '',
			});
		}
	}
	return statePlayers;
}
