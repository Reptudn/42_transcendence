document.getElementById('sendChatButton')?.addEventListener('click', () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = { type: 'chat', text: input.value.trim() };
		// ws.send(JSON.stringify(msg));
		input.value = '';

		const chatMessages = document.getElementById('chatMessages');
		if (chatMessages) {
			const messageElement = document.createElement('div');
			messageElement.textContent = `You: ${msg.text}`;
			chatMessages.appendChild(messageElement);
			chatMessages.scrollTop = chatMessages.scrollHeight;
		}
	}
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
});
