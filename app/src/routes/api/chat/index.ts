import type { FastifyPluginAsync } from 'fastify';
import { sendMsg } from './sendMsg';
import {
	getAllChats,
	getAllFriends,
	getAllMsg,
	createNewChat,
	blockUsers,
	unblockUsers,
	inviteUser,
	leftUserFromChat,
} from './chatGetInfo';

// routes
//	'/api/chat' only to send new msg to all the users that in the chat
//	'/api/chat/friends' gets you all the friends of the user
//	'/api/chat/chats' gets you all the chats form the user
//	'/api/chat/messages' gets you all the msgs from chat querry: chat_id
//	'/api/chat/create' create a new chat querry: group_name, user_id[]
//	'/api/chat/block_user' block a user querry: user_id user you want to block
//	'/api/chat/block_user' unblock a user querry: user_id user you want ot unblock
//	'/api/chat/invite_user' invite user to a chat querry: chat_id, user_id[]
//	'/api/chat/left_user' left a group chat querry: chat_id

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllFriends(fastify);
	getAllChats(fastify);
	getAllMsg(fastify);
	createNewChat(fastify);
	blockUsers(fastify);
	unblockUsers(fastify);
	inviteUser(fastify);
	leftUserFromChat(fastify);
};

export default chat;

// TODO Problem with checking toUser is on chat or on another side
// TODO Unblock User
// TODO invite to chat group
// TODO left chat group and lastone will delete group
// TODO bei block_user created_at überprüfen damit nur nach dem blocken die nachrichten unkentlich gemacht werden im gruppen chat
// TODO bei block_user im einzelchat die person die geblocked wurde kann noch schreiben und sieht nicht das sie geblockt wurde
// TODO aber die person die geblocked hat kann nicht mehr schreiben und bekommt auch keine neune nachrichten
// TODO left chat button nur anzeigen wenn man in einm gruppen chat ist
