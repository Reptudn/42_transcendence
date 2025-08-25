import { showLocalError, showLocalInfo } from './alert.js';
import type { htmlMsg } from '../src/types/chat.js';
import { renderChat, renderChatInfo, renderFriends, renderFriendsButtonsBlock, renderFriendsButtonsCreate, renderFriendsButtonsInvite, renderFriendsUnblock } from './chat_modal.js';

if (localStorage.getItem('loggedIn') === 'true')
	await initChat();

export async function initChat() {
	if (!sessionStorage.getItem('chat_id')) sessionStorage.setItem('chat_id', '1');

	await getMessages(sessionStorage.getItem('chat_id'));

	let button = document.getElementById('sendChatButton');
	button?.removeEventListener('click', sendChatButton);
	button?.addEventListener('click', sendChatButton);

	button = document.getElementById('chatInput');
	button?.removeEventListener('keypress', sendChatButtonEnter);
	button?.addEventListener('keypress', sendChatButtonEnter);
}

async function sendChatButton() {
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
			return showLocalInfo(data.error, undefined, 5000);
		}
		if (data.msg !== 'ok') showLocalInfo(data.msg, undefined, 5000);
	}
}

function sendChatButtonEnter(e: KeyboardEvent) {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
}

export function appendToChatBox(rawMessage: string) {
	try {
		const msg = JSON.parse(rawMessage) as htmlMsg;

		const chatMessages = document.getElementById('chatMessages');
		if (!chatMessages) return;

		const nowChatId = sessionStorage.getItem('chat_id');
		if (nowChatId) {
			if (Number.parseInt(nowChatId) === msg.chatId || msg.chatId === 0) {
				chatMessages.insertAdjacentHTML('beforeend', msg.htmlMsg);
				chatMessages.scrollTop = chatMessages.scrollHeight;
				return;
			}
		}
		if (msg.blocked || msg.ownMsg) return;
		showLocalInfo(
			`You recived a new Msg from ${msg.fromUserName}`,
			`sessionStorage.setItem('chat_id', '${msg.chatId}'); getMessages(${msg.chatId})`,
			5000
		);
	} catch (err) {
		console.error('Error parsing event data:', err);
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
		const chatName = msgs.at(-1)?.chatName;
		currChat.innerHTML = '';
		if (chatName) currChat.innerHTML = chatName;
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
	await renderChat();

	await renderFriends();

	await renderFriendsButtonsCreate();

	await renderFriendsButtonsBlock();

	await renderFriendsUnblock();

	await renderFriendsButtonsInvite();

	await renderChatInfo();
}

declare global {
	interface Window {
		getMessages: (chat_id: string | null) => void;
	}
}

window.getMessages = getMessages;
