interface ChatMessage {
	user: string;
	message: string;
}

getUser();
getMessages();

export function appendToChatBox(message: ChatMessage) {
	const { user, message: msg } = message;
	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return;

	const messageElement = document.createElement('div');
	messageElement.textContent = `${user}: ${msg}`;
	chatMessages.appendChild(messageElement);
	chatMessages.scrollTop = chatMessages.scrollHeight;
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
					chat: 'global',
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
	const users = await res.json();
	const userList = document.getElementById('userList');
	if (userList) {
		userList.innerHTML = '';
		for (const user of users) {
			const div = document.createElement('div');
			div.textContent = user.username;
			div.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(div);
		}
	}
}

export async function getMessages() {
	const res = await fetch('/api/chat/messages');
	const msgs = await res.json();

	const chatMessages = document.getElementById('chatMessages');
	if (chatMessages) {
		chatMessages.innerHTML = '';
		for (const msg of msgs) {
			appendToChatBox(msg);
		}
	}
}
