export interface Chat {
	id: number;
	name: string | null;
	is_group: boolean;
	created_at: string;
}

export interface Part {
	id: number;
	chat_id: number;
	user_id: number;
}

export interface Msg {
	id: number;
	chat_id: number;
	user_id: number;
	content: string;
	created_at: string;
}

export interface Blocked {
	blocker_id: number;
	blocked_id: number;
	created_at: string;
}

export interface htmlMsg {
	fromUserName: string;
	chatName: string;
	chatId: number;
	htmlMsg: string;
	blocked: boolean;
	ownMsg: boolean;
}

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

export interface ChatInfo {
	chat: Chat;
	users: User[];
	blockedUser: User[];
}
