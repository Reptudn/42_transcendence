import { showLocalError, showLocalInfo } from './alert.js';
import type { htmlMsg } from '../src/types/chat.js';
import { initModal } from './chat_modal.js';

export async function initChat() {
	if (!sessionStorage.getItem('chat_id')) sessionStorage.setItem('chat_id', '1');

	await getMessages(sessionStorage.getItem('chat_id'));

	document.getElementById('globalChat')?.addEventListener('click', async () => {
		sessionStorage.setItem('chat_id', '1');
		await getMessages(sessionStorage.getItem('chat_id'));
		document.getElementById('optionModal')?.classList.add('hidden');
	});

	document
		.getElementById('sendChatButton')
		?.addEventListener('click', async () => {
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
		});

	document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			document.getElementById('sendChatButton')?.click();
		}
	});
}

await initChat();

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
	await initModal();
}

declare global {
	interface Window {
		getMessages: (chat_id: string | null) => void;
	}
}

window.getMessages = getMessages;
