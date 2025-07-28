import type { FastifyPluginAsync } from 'fastify';
import { sendMsg } from './sendMsg';
import {
	getAllChats,
	getAllMsg,
	createNewChat,
	blockUsers,
	unblockUsers,
	inviteUser,
	leaveUserFromChat,
} from './chatGetInfo';

// routes
//	'/api/chat' only to send new msg to all the users that in the chat
//	'/api/chat/friends' gets you all the friends of the user
//	'/api/chat/chats' gets you all the chats form the user
//	'/api/chat/messages' gets you all the msgs from chat querry: chat_id
//	'/api/chat/create' create a new chat querry: group_name, user_id[]
//	'/api/chat/block_user' block a user querry: user_id user you want to block
//	'/api/chat/unblock_user' unblock a user querry: user_id user you want ot unblock
//	'/api/chat/invite_user' invite user to a chat querry: chat_id, user_id[]
//	'/api/chat/leave_user' leave a group chat querry: chat_id

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllChats(fastify);
	getAllMsg(fastify);
	createNewChat(fastify);
	blockUsers(fastify);
	unblockUsers(fastify);
	inviteUser(fastify);
	leaveUserFromChat(fastify);
};

export default chat;

// TODO commands
// TODO is it oke to invite a user that is not our friend?
// TODO If Client not connected send msgs when reconnected implement online offline status
// TODO Problem when User logged out other user can send him msg
// TODO check that there are not too many messages because of memory
// TODO limit the chars per messages e.g. 500
// TODO what if a user gets deleted
// TODO translation for error Msgs
