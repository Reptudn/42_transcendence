import { showLocalError, showLocalInfo } from './alert.js';
import type { htmlMsg, Chat } from '../src/types/chat.js';

if (!sessionStorage.getItem('chat_id')) sessionStorage.setItem('chat_id', '1');

await getChats();
await getMessages(sessionStorage.getItem('chat_id'));

document.getElementById('globalChat')?.addEventListener('click', async () => {
	sessionStorage.setItem('chat_id', '1');
	await getMessages(sessionStorage.getItem('chat_id'));
	document.getElementById('optionModal')?.classList.add('hidden');
});

document.getElementById('sendChatButton')?.addEventListener('click', async () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = input.value.trim();
		input.value = '';
		const chat_id = sessionStorage.getItem('chat_id');
		if (!chat_id) {
			showLocalError('Chat ID not found', undefined, 5000);
			return;
		}
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat: Number.parseInt(chat_id),
				message: msg,
			}),
		});
		const data = await res.json();
		if (!res.ok) {
			return showLocalInfo(data.error);
		}
		if (data.msg !== 'ok') showLocalInfo(data.msg);
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
	const data = await res.json();
	if (!res.ok) {
		return showLocalInfo(data.error);
	}
	const input = searchUser.value.trim().toLowerCase();
	if (input === '') {
		return await getChats();
	}
	const userList = document.getElementById('userList');
	if (!userList) {
		showLocalError('User list element not found', undefined, 5000);
		return;
	}
	userList.innerHTML = '';
	const chats = data.chats as Chat[];
	for (const chat of chats) {
		if (chat.name?.substring(0, input.length).toLowerCase() === input) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				sessionStorage.setItem('chat_id', chat.id.toString());
				await getMessages(chat.id.toString());
			});
			butt.textContent = chat.name;
			butt.className =
				'px-4 py-2 w-full border border-gray-300 bg-transparent rounded hover:bg-green-500 hover:text-white transition';
			userList.appendChild(butt);
		}
	}
});

export function appendToChatBox(rawMessage: string) {
	try {
		const msg = JSON.parse(rawMessage) as htmlMsg;

		const chatMessages = document.getElementById('chatMessages');
		if (!chatMessages) return;

		const nowChatId = sessionStorage.getItem('chat_id');
		if (nowChatId) {
			if (Number.parseInt(nowChatId) === msg.chatId || msg.chatId === 0) {
				const messageElement = document.createElement('div');
				messageElement.innerHTML = msg.htmlMsg;
				chatMessages.appendChild(messageElement);
				chatMessages.scrollTop = chatMessages.scrollHeight;
				return;
			}
		}
		if (msg.blocked || msg.ownMsg) return;
		showLocalInfo(
			`You recived a new Msg from ${msg.fromUserName}`,
			`sessionStorage.setItem('chat_id', '${msg.chatId}'); getMessages(${msg.chatId})`
		);
	} catch (err) {
		console.error('Error parsing event data:', err);
	}
}

export async function getChats() {
	const res = await fetch('/api/chat/chats');
	const data = await res.json();
	if (!res.ok) {
		return showLocalInfo(data.error);
	}
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		const chats = data.chats as Chat[];
		for (const chat of chats) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				sessionStorage.setItem('chat_id', chat.id.toString());
				await getMessages(chat.id.toString());
			});
			if (chat.name === null) butt.textContent = chat.id.toString();
			else butt.textContent = chat.name;
			butt.className =
				'px-4 py-2 w-full border border-gray-300 bg-transparent rounded hover:bg-green-500 hover:text-white transition';
			userList.appendChild(butt);
		}
	}
}

export async function getMessages(chat_id: string | null) {
	if (!chat_id || chat_id === '0') {
		showLocalError('Invalid chat ID', undefined, 5000);
		return;
	}
	const res = await fetch(`/api/chat/messages?chat_id=${chat_id}`);
	const data = await res.json();
	if (!res.ok) {
		return showLocalError(data.error, undefined, 5000);
	}
	const msgs = data.msgs as htmlMsg[];

	const currChat = document.getElementById('currentChat');

	if (currChat) {
		let span = currChat.querySelector('span.extra');
		if (!span) {
			span = document.createElement('span');
			span.classList.add('extra');
			currChat.appendChild(span);
		}

		const chatName = msgs.at(-1)?.chatName;
		if (chat_id === '1') span.textContent = ' Global Chat';
		else span.textContent = ` ${chatName}`;
	}

	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) {
		return;
	}

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(JSON.stringify(msg));
	}
}

export async function updateChat() {
	await getChats();
}

declare global {
	interface Window {
		getMessages: (chat_id: string | null) => void;
	}
}

window.getMessages = getMessages;
