import type { FastifyPluginAsync } from 'fastify';
import { sendMsg } from './sendMsg';
import {
	getAllChats,
	getAllFriends,
	getAllMsg,
	createNewChat,
	blockUsers,
} from './chatGetInfo';

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllFriends(fastify);
	getAllChats(fastify);
	getAllMsg(fastify);
	createNewChat(fastify);
	blockUsers(fastify);
};

export default chat;

// TODO Problem with checking toUser is on chat or on another side
// TODO Unblock User
// TODO invite to chat group
// TODO left chat group
// TODO bei block_user created_at überprüfen damit nur nach dem blocken die nachrichten unkentlich gemacht werden im gruppen chat
// TODO bei block_user im einzelchat die person die geblocked wurde kann noch schreiben und sieht nicht das sie geblockt wurde
// TODO aber die person die geblocked hat kann nicht mehr schreiben und bekommt auch keine neune nachrichten
