import { showLocalError, showLocalInfo } from './alert.js';
import { updateGameState } from './gameRenderer.js';
import { loadPartialView } from './script.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const playerId = urlParams.get('playerId');

if (!gameId || !playerId) {
	showLocalError('Missing game ID or player ID. Please join via the chat setup.');
	loadPartialView('chat_setup');
}

console.log(
	'Attempting to join with game ID',
	gameId,
	'and player ID',
	playerId
);
const wsUrl = `/api/games/join/${gameId}/${playerId}`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
	console.log(
		`Connected to chat websocket for game ${gameId} as player ${playerId}`
	);
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
		} else if (data.type === 'state') {
			const state = document.getElementById('state');
			if (state) {
				state.innerHTML = JSON.stringify(data.state);
				updateGameState(
					data.state,
					data.state.meta.size_x,
					data.state.meta.size_y
				);
			}
		} else if (data.type === 'change_lobby_settings') {
			const settings = document.getElementById('lobbySettings');
			if (settings) {
				settings.innerHTML = JSON.stringify(data.settings);
			}
		} else {
			showLocalInfo(`Unknown data received from websocket: ${data}`);
		}
	} catch (e) {
		showLocalError(`Error parsing chat message: ${e}`);
	}
};

ws.onerror = (error) => {
	showLocalError(`WebSocket error: ${error}`);
};

ws.onclose = () => {
	showLocalInfo('WebSocket closed');
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
let lastSentDirection = 0;

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
		if (lastSentDirection !== -1) {
			ws.send(JSON.stringify({ type: 'move', dir: -1 }));
		}
		lastSentDirection = -1;
	} else if (rightPressed && !leftPressed) {
		if (lastSentDirection !== 1) {
			ws.send(JSON.stringify({ type: 'move', dir: 1 }));
		}
		lastSentDirection = 1;
	} else {
		if (lastSentDirection !== 0) {
			ws.send(JSON.stringify({ type: 'move', dir: 0 }));
		}
		lastSentDirection = 0;
	}
}, 1000 / 30); // 30 FPS
