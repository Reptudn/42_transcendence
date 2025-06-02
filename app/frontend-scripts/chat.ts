import { showLocalPopup } from './alert.js';

export interface Msg {
	id: number;
	chat_id: string;
	displayname: string;
	content: string;
	created_at: string;
}

interface User {
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

localStorage.setItem('chat_id', '0');

await getUser();
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

export async function getUser() {
	const res = await fetch('/api/chat/users');
	if (!res.ok) return; // TODO Error msg
	const users = (await res.json()) as User[];
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		for (const user of users) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				const res = await fetch(`/api/chat/invite?chat_id=${user.id}`);
				console.log('res test =', res);
				if (!res.ok) return; // TODO Error msg
				const responseData = await res.json();

				const newId = responseData.chat_id as string;
				localStorage.setItem('chat_id', newId);
				await getMessages(newId);
			});
			butt.textContent = user.displayname;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
}

export async function getMessages(chat_id: string | null) {
	if (!chat_id) return; // TODO Error msg
	const res = await fetch(`/api/chat/messages?chat_id=${chat_id}`);
	// if (!res.ok) {
	// 	showLocalPopup({
	// 		title: 'Error',
	// 		description: 'Failed to fetch users',
	// 		color: 'red',
	// 	});
	// }
	if (!res.ok) return; // TODO Error msg
	const msgs = (await res.json()) as Msg[];

	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return; // TODO Error msg

	chatMessages.innerHTML = '';
	for (const msg of msgs) {
		appendToChatBox(msg);
	}
}
