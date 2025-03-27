import { updateGameState } from './gameRenderer.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
const playerIds = urlParams.get('playerIds');
const playerId = playerIds ? JSON.parse(playerIds)[0] : null;

if (!gameId || !playerId) {
	alert('Missing game ID or player ID. Please join via the game setup.');
	loadPartialView('game_setup');
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

let playerControlMap: [playerId: number, controlScheme: string][] = [];

function determineControlSchemes(state: any) {
	let playerNbr = 0;
	const controlSchemes = new Map<number, string>();
	for (const player of state.players) {
		if (playerIds?.includes(player.playerId)) {
			const controlScheme = localStorage.getItem(
				`controlScheme&${playerNbr}`
			);
			if (controlScheme) {
				controlSchemes.set(player.playerId, controlScheme);
			} else {
				controlSchemes.set(player.playerId, 'arrows');
				localStorage.setItem(`controlScheme&${playerNbr}`, 'arrows');
				console.log('whoops no control scheme');
			}
			playerNbr++;
		}
	}
	return controlSchemes;
}

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
			if (state) {
				state.innerHTML = JSON.stringify(data.state);
				updateGameState(
					data.state,
					data.state.meta.size_x,
					data.state.meta.size_y
				);
			}
			if (playerControlMap.length === 0) {
				determineControlSchemes(data.state);
			}
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

ws.onclose = () => {
	console.log('WebSocket closed');
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

let arrowsLeftPressed = false;
let arrowsRightPressed = false;
let wasdLeftPressed = false;
let wasdRightPressed = false;
let ijklLeftPressed = false;
let ijklRightPressed = false;
let lastSentDirection = 0;

window.addEventListener('keydown', (e) => {
	if (e.key === 'ArrowLeft') {
		arrowsLeftPressed = true;
	} else if (e.key === 'ArrowRight') {
		arrowsRightPressed = true;
	} else if (e.key === 'ArrowUp') {
		arrowsLeftPressed = true;
	} else if (e.key === 'ArrowDown') {
		arrowsRightPressed = true;
	}
	if (e.key === 'a') {
		wasdLeftPressed = true;
	} else if (e.key === 'd') {
		wasdRightPressed = true;
	} else if (e.key === 'w') {
		ijklLeftPressed = true;
	} else if (e.key === 's') {
		ijklRightPressed = true;
	}
	if (e.key === 'j') {
		ijklLeftPressed = true;
	} else if (e.key === 'l') {
		ijklRightPressed = true;
	} else if (e.key === 'i') {
		wasdLeftPressed = true;
	} else if (e.key === 'k') {
		wasdRightPressed = true;
	}
});

window.addEventListener('keyup', (e) => {
	if (e.key === 'ArrowLeft') {
		arrowsLeftPressed = false;
	} else if (e.key === 'ArrowRight') {
		arrowsRightPressed = false;
	}
});

setInterval(() => {
	for (const [playerId, controlScheme] of playerControlMap) {
		let leftPressed = false;
		let rightPressed = false;

		if (controlScheme === 'wasd') {
			leftPressed = wasdLeftPressed;
			rightPressed = wasdRightPressed;
		} else if (controlScheme === 'ijkl') {
			leftPressed = ijklLeftPressed;
			rightPressed = ijklRightPressed;
		} else {
			leftPressed = arrowsLeftPressed;
			rightPressed = arrowsRightPressed;
		}

		if (leftPressed && !rightPressed) {
			if (lastSentDirection !== -1) {
				ws.send(
					JSON.stringify({
						type: 'move',
						dir: -1,
						targetPlayerId: playerId,
					})
				);
			}
			lastSentDirection = -1;
		} else if (rightPressed && !leftPressed) {
			if (lastSentDirection !== 1) {
				ws.send(
					JSON.stringify({
						type: 'move',
						dir: 1,
						targetPlayerId: playerId,
					})
				);
			}
			lastSentDirection = 1;
		} else {
			if (lastSentDirection !== 0) {
				ws.send(
					JSON.stringify({
						type: 'move',
						dir: 0,
						targetPlayerId: playerId,
					})
				);
			}
			lastSentDirection = 0;
		}
	}
}, 10);
