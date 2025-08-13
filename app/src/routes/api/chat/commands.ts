import type { FastifyInstance } from 'fastify';
import { getUserById, getUserByUsername } from '../../../services/database/users';
import { invite, leave } from './utils';
import {
	HttpError,
	getChatFromSql,
	getParticipantFromSql,
	searchForChatId,
	getAllBlockerUser,
	getAllBlockedUser,
	saveMsgInSql,
} from '../../../services/database/chat';
import { getFriends } from '../../../services/database/friends';
import { sendMsgDm } from './sendMsg';
import escapeHTML from 'escape-html';
import { GameStatus, GameType } from '../../../services/pong/games/gameClass';
import { runningGames } from '../../../services/pong/games/games';
import { UserPlayer, AiPlayer } from '../../../services/pong/games/playerClass';
import { sendSseRawByUserId } from '../../../services/sse/handler';

export async function checkCmd(
	fastify: FastifyInstance,
	body: { chat: number; message: string },
	fromUser: number
): Promise<string> {
	const parts = body.message.trim().split(' ');
	const cmd = parts[0];
	let msg = 'ok';

	const args = parts.slice(1, parts.length);

	switch (cmd) {
		case '/group-invite':
			await inviteCmd(fastify, body.chat, fromUser, args);
			msg = 'chat.invite';
			break;
		case '/game-invite':
			await gameInviteCmd(fastify, fromUser, args);
			msg = 'chat.game-invite';
			break;
		case '/msg':
			await sendMsgCmd(fastify, fromUser, args);
			break;
		case '/leave':
			await leaveCmd(fastify, body.chat, fromUser, args);
			msg = 'chat.leave';
			break;
		case '/help':
			msg =
				'/group-invite username<br>/game-invite username</br>/msg username msg<br>/leave</br>';
			break;
		default:
			throw new HttpError(400, `Invalid Command: ${escapeHTML(cmd)}`);
	}
	return msg;
}

async function gameInviteCmd(
	fastify: FastifyInstance,
	fromUser: number,
	args: string[]
) {
	const self = await getUserById(fromUser, fastify);
	if (!self) throw new Error('Unauthorized!');

	if (args.length !== 1)
		throw new Error('Invalid use of command: /game-invite <username>');

	const inviteUser = await getUserByUsername(args[0], fastify);
	if (!inviteUser) throw new Error('No such user found!');

	const friends = await getFriends(fromUser, fastify);
	if (friends) {
		const isFriend = friends.find((f) => f.id === inviteUser.id);
		if (!isFriend)
			throw new Error(
				'Cant invite user because they are not friends with you!'
			);
	}

	const friendGame = runningGames.find((g) =>
		g.players.find((p) => p instanceof UserPlayer && p.user.id === inviteUser.id)
	);
	if (friendGame) throw new Error('Cant invite a user which is already in a game');

	const game = runningGames.find((g) => g.admin.id === fromUser);
	// fastify.log.info(
	// 	`User ${user.username} is inviting user with ID ${parsedUserId} to their game.`
	// );
	if (!game) {
		throw new Error('No game found for the user');
	}

	// fastify.log.info(`Game found: ${game.gameId} for user ${user.username}`);
	if (
		game.players.find(
			(p) => p instanceof UserPlayer && p.user.id === inviteUser.id
		)
	) {
		throw new Error('User is already invited to the game');
	}

	fastify.log.info(
		`Sending game invite to user with ID ${inviteUser.id} for game ${game.gameId}`
	);
	if (game.status !== GameStatus.WAITING) {
		throw new Error('Cannot invite players to a game that has already started');
	}

	if (game.config.gameType === GameType.TOURNAMENT) {
		const ai = game.players.find((p) => p instanceof AiPlayer);
		if (ai) game.removePlayer(ai.playerId, true);
	}
	await game.addUserPlayer(inviteUser, false);

	sendSseRawByUserId(
		inviteUser.id,
		`data: ${JSON.stringify({
			type: 'game_invite',
			gameId: game.gameId,
		})}\n\n`
	);
}

async function inviteCmd(
	fastify: FastifyInstance,
	chatID: number,
	fromUser: number,
	args: string[]
) {
	if (args.length === 1) {
		const toUser = await getUserByUsername(args[0], fastify);
		if (!toUser) {
			throw new HttpError(400, 'User not found');
		}
		const friends = await getFriends(fromUser, fastify);
		if (friends.some((user) => user.id === toUser.id))
			await invite(fastify, chatID, fromUser, toUser.id);
		else throw new HttpError(400, 'User not found');
	} else {
		throw new HttpError(400, 'Invalid use of command: /group-invite <username>');
	}
}

async function leaveCmd(
	fastify: FastifyInstance,
	chatId: number,
	fromUser: number,
	args: string[]
) {
	if (args.length === 0) {
		await leave(fastify, chatId, fromUser);
	} else {
		throw new HttpError(400, 'Invalid use of command: /leave');
	}
}

async function sendMsgCmd(
	fastify: FastifyInstance,
	fromUser: number,
	args: string[]
) {
	if (args.length < 2)
		throw new HttpError(400, 'Invalid use of command: /msg <username> <msg>');
	const user = await getUserById(fromUser, fastify);
	if (!user) throw new HttpError(400, 'User not found');

	const toUser = await getUserByUsername(args[0], fastify);
	if (!toUser) throw new HttpError(400, 'User not found');

	const chatId = await searchForChatId(fastify, [user.id, toUser.id]);
	if (!chatId) throw new HttpError(400, 'Chat not found');

	const chat = await getChatFromSql(fastify, chatId);

	const part = await getParticipantFromSql(fastify, toUser.id, chatId);
	if (!part) throw new HttpError(400, 'No Participant in Chat');

	const blocked = await getAllBlockerUser(fastify, user.id);

	const blockedId = blocked.map((b) => b.blocked_id);

	const blocker = await getAllBlockedUser(fastify, user.id);

	const blockerId = blocker.map((b) => b.blocker_id);

	args.shift();
	const msg = args.join(' ');
	await sendMsgDm(user, [part], chat, blockedId, blockerId, msg);
	await saveMsgInSql(fastify, user.id, chatId, msg);
}
