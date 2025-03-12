const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const playerId = urlParams.get('playerId');

if (!gameId || !playerId) {
	alert('Missing game ID or player ID. Please join via the chat setup.');
	loadPartialView('chat_setup');
}

console.log('Attempting to join with game ID', gameId, 'and player ID', playerId);
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
		} else if (data.type == 'state') {
			const state = document.getElementById('state');
			if (state)
				state.innerHTML = JSON.stringify(data.state);
		} else {
			console.log('Unknown data received from websocket: ', data);
		}
	} catch (e) {
		console.error('Error parsing chat message:', e);
	}
};

ws.onerror = (error) => {
	console.error('WebSocket error:', error);
};

// CHAT

document.getElementById('sendChatButton')?.addEventListener('click', () => {
	const input = document.getElementById('chatInput') as HTMLInputElement;
	if (input && input.value.trim() !== '') {
		const msg = { type: 'chat', text: input.value.trim() };
		ws.send(JSON.stringify(msg));
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

// INPUT

let leftPressed = false;
let rightPressed = false;
let lastSentDirection = 'none';

window.addEventListener('keydown', (e) => {
	if (e.key === 'ArrowLeft') {
		leftPressed = true;
	} else if (e.key === 'ArrowRight') {
		rightPressed = true;
	}
});

window.addEventListener('keyup', (e) => {
	if (e.key === 'ArrowLeft') {
		leftPressed = false;
	} else if (e.key === 'ArrowRight') {
		rightPressed = false;
	}
});

setInterval(() => {
	if (leftPressed && !rightPressed) {
		if (lastSentDirection !== 'dir1') {
			ws.send(JSON.stringify({ type: 'move', dir: 'dir1' }));
		}
		lastSentDirection = 'dir1';
	} else if (rightPressed && !leftPressed) {
		if (lastSentDirection !== 'dir2') {
			ws.send(JSON.stringify({ type: 'move', dir: 'dir2' }));
		}
		lastSentDirection = 'dir2';
	} else {
		if (lastSentDirection !== 'none') {
			ws.send(JSON.stringify({ type: 'move', dir: 'none' }));
		}
		lastSentDirection = 'none';
	}
}, 1000 / 30); // 30 FPS
