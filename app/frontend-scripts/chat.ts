const socket: WebSocket = new WebSocket('/api/chat');

interface ChatMessage {
	user: string;
	message: string;
}

function sendMessageToChat(message: ChatMessage) {
	socket.send(JSON.stringify(message));
}

function appendToChatBox(message: ChatMessage) {
	const { user, message: msg } = message;
	const chatMessages = document.getElementById('chatMessages');
	if (!chatMessages) return;

	const messageElement = document.createElement('div');
	messageElement.textContent = `${user}: ${msg}`;
	chatMessages.appendChild(messageElement);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

socket.onmessage = (event) => {
	console.info('onmessage', event.data);
	const parsed = JSON.parse(event.data);
	appendToChatBox(parsed);
};

document.getElementById('sendChatButton')?.addEventListener('click', () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = input.value.trim();
		input.value = '';

		sendMessageToChat({ user: 'You', message: msg });
	}
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
});
