const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const playerId = urlParams.get('playerId');

if (!gameId || !playerId) {
	alert('Missing game ID or player ID. Please join via the chat setup.');
	loadPartialView('chat_setup');
}

const wsUrl = `/api/games/join/${gameId}/${playerId}`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
	console.log(`Connected to chat websocket for game ${gameId} as player ${playerId}`);
};

ws.onmessage = (event) => {
	try {
		const data = JSON.parse(event.data);
		if (data.type === 'chat') {
			const chatMessages = document.getElementById('chatMessages');
			if (chatMessages) {
				const messageElement = document.createElement('div');
				messageElement.textContent = `Player ${data.playerId}: ${data.text}`;
				chatMessages.appendChild(messageElement);
				chatMessages.scrollTop = chatMessages.scrollHeight;
			}
		}
	} catch (e) {
		console.error('Error parsing chat message:', e);
	}
};

ws.onerror = (error) => {
	console.error('WebSocket error:', error);
};

document.getElementById('sendChatButton')?.addEventListener('click', () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = { type: 'chat', text: input.value.trim() };
		ws.send(JSON.stringify(msg));
		input.value = '';
	}
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		document.getElementById('sendChatButton')?.click();
	}
});
