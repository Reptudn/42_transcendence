import type { Chat, htmlMsg } from '../src/types/chat';
import { showLocalPopup } from './alert.js';

document.addEventListener('DOMContentLoaded', () => {
	const chatButton = document.getElementById('chat-button');
	if (chatButton) {
		chatButton.addEventListener('click', toggleChatWidget);
	}
});

document
	.getElementById('chat-close')
	?.addEventListener('click', toggleChatWidget);

function toggleChatWidget() {
	const widget = document.getElementById('chat-widget');
	if (!widget) return;

	const ishidden = widget.classList.contains('hidden');
	if (ishidden) {
		widget.classList.remove('hidden');
		getChats();
	} else widget.classList.add('hidden');
}

async function getChats() {
	const res = await fetch('/api/chat/chats');
	if (!res.ok) return; // TODO Error msg
	const chats = (await res.json()) as Chat[];
	const userList = document.getElementById('chat-chats');
	if (userList) {
		userList.innerHTML = '';
		for (const chat of chats) {
			const chatId = chat.id.toString();
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				localStorage.setItem('chat_id', chatId);
				await getMessages(chatId);
			});
			if (chat.name === null) butt.textContent = chatId;
			else butt.textContent = chat.name;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
}

async function getMessages(chat_id: string | null) {
	if (!chat_id || chat_id === '0') return; // TODO Error msg
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

	const chatMessages = document.getElementById('chat-messages');
	if (!chatMessages) return; // TODO Error msg

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(JSON.stringify(msg));
	}
}

function appendToChatBox(rawMessage: string) {
	const chatMessages = document.getElementById('chat-messages');
	if (!chatMessages) return; // TODO Error msg

	const msg = JSON.parse(rawMessage) as htmlMsg;

	const nowChatId = localStorage.getItem('chat_id');
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
