import { showLocalPopup } from './alert.js';

export interface Msg {
	id: number;
	chat_id: string;
	displayname: string;
	content: string;
	created_at: string;
}

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

if (!localStorage.getItem('chat_id')) localStorage.setItem('chat_id', '0');

await getChats();
await getMessages(localStorage.getItem('chat_id'));

export function appendToChatBox(message: Msg) {
	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return; // TODO Error msg;

	if (localStorage.getItem('chat_id') === message.chat_id) {
		const messageElement = document.createElement('div');
		messageElement.textContent = `${message.displayname}: ${message.content}`;
		chatMessages.appendChild(messageElement);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	} else {
		showLocalPopup({
			title: 'New Msg',
			description: `You recived a new Msg from ${message.displayname}`,
			color: 'blue',
		});
	}
}

document.getElementById('globalChat')?.addEventListener('click', async () => {
	localStorage.setItem('chat_id', '0');
	await getMessages(localStorage.getItem('chat_id'));
});

document
	.getElementById('sendChatButton')
	?.addEventListener('click', async () => {
		const input = document.getElementById('chatInput') as HTMLInputElement;
		if (input && input.value.trim() !== '') {
			const msg = input.value.trim();
			input.value = '';

			await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					chat: localStorage.getItem('chat_id'),
					is_group: true,
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

export async function getChats() {
	const res = await fetch('/api/chat/chats');
	if (!res.ok) return; // TODO Error msg
	const chats = (await res.json()) as Chat[];
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		for (const chat of chats) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				localStorage.setItem('chat_id', chat.id);
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
	if (!chat_id) return; // TODO Error msg
	const res = await fetch(`/api/chat/messages?chat_id=${chat_id}`);
	if (!res.ok) {
		showLocalPopup({
			title: 'Error',
			description: 'Failed to fetch users',
			color: 'red',
		});
	}
	if (!res.ok) return; // TODO Error msg
	const msgs = (await res.json()) as Msg[];

	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return; // TODO Error msg

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(msg);
	}
}
