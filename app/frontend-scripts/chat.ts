import { showLocalPopup } from './alert.js';

export interface Msg {
	id: number;
	chat_id: number;
	user_id: number;
	chatName: string;
	blocked: boolean;
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

if (!localStorage.getItem('chat_id')) localStorage.setItem('chat_id', '1');

await getChats();
await getMessages(localStorage.getItem('chat_id'));

document.getElementById('globalChat')?.addEventListener('click', async () => {
	localStorage.setItem('chat_id', '1');
	await getMessages(localStorage.getItem('chat_id'));
});

document
	.getElementById('sendChatButton')
	?.addEventListener('click', async () => {
		const input = document.getElementById('chatInput') as HTMLInputElement;
		if (input && input.value.trim() !== '') {
			const msg = input.value.trim();
			input.value = '';
			const chat_id = localStorage.getItem('chat_id');
			if (!chat_id) return; // TODO Error msg
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

const searchUser = document.getElementById(
	'searchForFriend'
) as HTMLInputElement;

searchUser.addEventListener('input', async () => {
	const users = await getUser();
	if (!users) return; // TODO Error msg
	const res = await fetch('/api/chat/chats');
	if (!res.ok) return; // TODO Error msg
	const chats = (await res.json()) as Chat[];
	const input = searchUser.value.trim().toLowerCase();
	console.log('input = ', input);
	if (input === '') {
		await getChats();
		return;
	}
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		for (const chat of chats) {
			if (chat.name?.substring(0, input.length).toLowerCase() === input) {
				const butt = document.createElement('button');
				butt.addEventListener('click', async () => {
					localStorage.setItem('chat_id', chat.id);
					await getMessages(chat.id);
				});
				butt.textContent = chat.name;
				butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
				userList.appendChild(butt);
			}
		}
	}
});

export function appendToChatBox(message: Msg) {
	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return; // TODO Error msg;

	const id = localStorage.getItem('chat_id');

	if (!id) return; // TODO Error msg
	if (Number.parseInt(id) === message.chat_id) {
		const messageElement = document.createElement('div');
		if (message.blocked) {
			message.content = 'Msg blocked';
		}
		const st = `
			<div>
				<p><a href='/partial/pages/profile/${message.displayname}'>${message.displayname}:</a>${message.content}</p>
			</div>
			`;
		messageElement.innerHTML = st;
		chatMessages.appendChild(messageElement);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	} else if (message.chat_id !== 1) {
		showLocalPopup({
			title: 'New Msg',
			description: `You recived a new Msg from ${message.displayname} in Group ${message.chatName}`,
			color: 'blue',
		});
	}
}

async function getUser(): Promise<User[] | null> {
	const res = await fetch('/api/chat/users');
	if (!res.ok) return null; // TODO Error msg
	const users = (await res.json()) as User[];
	return users;
}

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
		return;
	}
	const msgs = (await res.json()) as Msg[];

	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return; // TODO Error msg

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(msg);
	}
}
