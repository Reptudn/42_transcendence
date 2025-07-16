import { showLocalError, showLocalPopup } from './alert.js';
import type { htmlMsg } from '../src/types/chat.js';

export interface Chat {
	id: string;
	name: string | null;
	is_group: boolean;
	created_at: string;
}

export interface User {
	id: number;
	google_id: string;
	username: string;
	password: string;
	displayname: string;
	bio: string;
	profile_picture: string;
	click_count: number;
	title_first: number;
	title_second: number;
	title_third: number;
}

if (!sessionStorage.getItem('chat_id')) sessionStorage.setItem('chat_id', '1');

await getChats();
await getMessages(sessionStorage.getItem('chat_id'));

document.getElementById('globalChat')?.addEventListener('click', async () => {
	sessionStorage.setItem('chat_id', '1');
	await getMessages(sessionStorage.getItem('chat_id'));
});

document.getElementById('sendChatButton')?.addEventListener('click', async () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = input.value.trim();
		input.value = '';
		const chat_id = sessionStorage.getItem('chat_id');
		if (!chat_id) {
			showLocalError('Chat ID not found');
			console.error('Chat ID not found in sessionStorage');
			return;
		}
		await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat: Number.parseInt(chat_id),
				message: msg,
			}),
		});
	}
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
});

const searchUser = document.getElementById('searchForFriend') as HTMLInputElement;

searchUser?.addEventListener('input', async () => {
	const res = await fetch('/api/chat/chats');
	if (!res.ok) {
		showLocalError('Failed to fetch chats');
		console.error('Failed to fetch chats:', res.status, res.statusText);
		return;
	}
	const chats = (await res.json()) as Chat[];
	const input = searchUser.value.trim().toLowerCase();
	console.log('input = ', input);
	if (input === '') {
		await getChats();
		return;
	}
	const userList = document.getElementById('userList');
	if (!userList) {
		showLocalError('User list element not found');
		console.error('User list element not found');
		return;
	}
	userList.innerHTML = '';
	for (const chat of chats) {
		if (chat.name?.substring(0, input.length).toLowerCase() === input) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				sessionStorage.setItem('chat_id', chat.id);
				await getMessages(chat.id);
			});
			butt.textContent = chat.name;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
});

export function appendToChatBox(rawMessage: string) {
	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) {
		showLocalError('Chat messages element not found');
		console.error('Chat messages element not found');
		return;
	}

	const msg = JSON.parse(rawMessage) as htmlMsg;

	const nowChatId = sessionStorage.getItem('chat_id');
	console.log('nowChatId = ', nowChatId);
	if (nowChatId) {
		if (Number.parseInt(nowChatId) === msg.chatId || msg.chatId === 0) {
			const messageElement = document.createElement('div');
			messageElement.innerHTML = msg.htmlMsg;
			chatMessages.appendChild(messageElement);
			chatMessages.scrollTop = chatMessages.scrollHeight;
			return;
		}
	}
	showLocalPopup({
		title: 'New Msg',
		description: `You recived a new Msg from ${msg.fromUserName} in Group ${msg.chatName}`,
		color: 'blue',
	});
}

export async function getChats() {
	const res = await fetch('/api/chat/chats');
	if (!res.ok) {
		showLocalError('Failed to fetch chats');
		console.error('Failed to fetch chats:', res.status, res.statusText);
		return;
	}
	const chats = (await res.json()) as Chat[];
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		for (const chat of chats) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				sessionStorage.setItem('chat_id', chat.id);
				await getMessages(chat.id);
			});
			if (chat.name === null) butt.textContent = chat.id;
			else butt.textContent = chat.name;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
}

export async function getMessages(chat_id: string | null) {
	if (!chat_id || chat_id === '0') {
		showLocalError('Invalid chat ID');
		console.error('Invalid chat ID:', chat_id);
		return;
	}
	const res = await fetch(`/api/chat/messages?chat_id=${chat_id}`);
	if (!res.ok) {
		showLocalPopup({
			title: 'Error',
			description: 'Failed to fetch users',
			color: 'red',
		});
		return;
	}
	const msgs = (await res.json()) as htmlMsg[];

	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) {
		showLocalError('Failed to get the chat messages element');
		return;
	}

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(JSON.stringify(msg));
	}
}
