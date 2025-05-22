const chatEventSource = new EventSource('/api/chat');
interface ChatMessage {
	user: string;
	message: string;
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

chatEventSource.onmessage = (event) => {
	console.log('chat event = ', event.data);
};

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
					is_group: 'true',
					message: msg,
				}),
			});
			appendToChatBox({ user: 'You', message: msg });
			const response = await fetch('/api/chat');

			console.log('respone', response);
		}
	});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
});
