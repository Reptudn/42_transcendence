import { showLocalInfo, showLocalError } from './alert.js';

const playersContainer = document.getElementById(
	'playersContainer'
) as HTMLElement;
const addPlayerButton = document.getElementById(
	'addPlayerButton'
) as HTMLButtonElement;
const removePlayerButton = document.getElementById(
	'removePlayerButton'
) as HTMLButtonElement;
const startGameButton = document.getElementById(
	'startGameButton'
) as HTMLButtonElement;
const maxPlayers = 4;

export function createPlayerCard(index: number): HTMLElement {
	const card = document.createElement('div');
	card.className = 'player-card p-4 border rounded-lg mb-4';
	card.setAttribute('data-player-index', index.toString());

	const header = document.createElement('h3');
	header.className = 'text-xl font-bold mb-2';
	header.textContent = `Player ${index + 1}`;
	card.appendChild(header);

	const typeDiv = document.createElement('div');
	typeDiv.className = 'mb-2';
	const typeLabel = document.createElement('label');
	typeLabel.className = 'block text-sm font-medium text-glow-green-700';
	typeLabel.textContent = 'Player Type';
	typeDiv.appendChild(typeLabel);

	const typeSelect = document.createElement('select');
	typeSelect.className =
		'player-type mt-1 block w-full rounded-md border-gray-300';
	typeSelect.innerHTML = `
		<option value="user">Friend (User)</option>
		<option value="local">Local Player</option>
		<option value="ai">AI</option>
	`;
	typeDiv.appendChild(typeSelect);
	card.appendChild(typeDiv);

	const additionalSettings = document.createElement('div');
	additionalSettings.className = 'additional-settings';
	card.appendChild(additionalSettings);

	updateAdditionalSettings(typeSelect.value, additionalSettings);

	typeSelect.addEventListener('change', () => {
		updateAdditionalSettings(typeSelect.value, additionalSettings);
	});

	return card;
}

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

declare const friends: Friend[];

export function updateAdditionalSettings(
	type: string,
	container: HTMLElement
): void {
	container.innerHTML = ''; // Clear any existing content.

	if (type === 'user') {
		const label = document.createElement('label');
		label.className = 'block text-sm font-medium text-glow-green-700';
		label.textContent = 'Select Friend';
		container.appendChild(label);

		const friendSelect = document.createElement('select');
		friendSelect.className =
			'friend-select mt-1 block w-full rounded-md border-gray-300';
		friendSelect.innerHTML = `<option value="">-- Choose a friend --</option>`;
		for (const friend of friends) {
			const option = document.createElement('option');
			option.value = friend.id.toString();
			option.textContent = `${friend.displayname} (@${friend.username})`;
			friendSelect.appendChild(option);
		}
		container.appendChild(friendSelect);
	} else if (type === 'local') {
		const label = document.createElement('label');
		label.className = 'block text-sm font-medium text-glow-green-700';
		label.textContent = 'Control Scheme';
		container.appendChild(label);

		const controlSelect = document.createElement('select');
		controlSelect.className =
			'control-scheme mt-1 block w-full rounded-md border-gray-300';
		controlSelect.innerHTML = `
			<option value="wasd">WASD</option>
			<option value="arrows">Arrow Keys</option>
			<option value="ijkl">IJKL</option>
		`;
		container.appendChild(controlSelect);

		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.className =
			'local-name mt-1 block w-full rounded-md border-gray-300';
		nameInput.placeholder = 'Enter player name';
		container.appendChild(nameInput);
	} else if (type === 'ai') {
		const label = document.createElement('label');
		label.className = 'block text-sm font-medium text-glow-green-700';
		label.textContent = 'AI Level';
		container.appendChild(label);

		const aiLevelInput = document.createElement('input');
		aiLevelInput.type = 'number';
		aiLevelInput.className =
			'ai-level mt-1 block w-full rounded-md border-gray-300';
		aiLevelInput.min = '1';
		aiLevelInput.max = '10';
		aiLevelInput.value = '5';
		container.appendChild(aiLevelInput);

		const nameInput = document.createElement('input');
		nameInput.type = 'text';
		nameInput.className =
			'ai-name mt-1 block w-full rounded-md border-gray-300';
		nameInput.placeholder = 'Enter AI name';
		container.appendChild(nameInput);
	}
}

addPlayerButton.addEventListener('click', () => {
	const currentPlayers =
		playersContainer.querySelectorAll('.player-card').length;
	if (currentPlayers >= maxPlayers) {
		alert('Maximum players reached. You cannot add more than 4 players.');
		return;
	}
	const newCard = createPlayerCard(currentPlayers);
	playersContainer.appendChild(newCard);
});

removePlayerButton.addEventListener('click', () => {
	const currentPlayers = playersContainer.querySelectorAll('.player-card');
	if (currentPlayers.length <= 1) {
		alert('At least one player (you) is required.');
		return;
	}
	playersContainer.removeChild(currentPlayers[currentPlayers.length - 1]);
});

startGameButton.addEventListener('click', () => {
	const map = (document.getElementById('map') as HTMLSelectElement).value;
	const lives =
		Number.parseInt(
			(document.getElementById('lives') as HTMLInputElement).value
		) || 3;
	const difficulty =
		Number.parseInt(
			(document.getElementById('difficulty') as HTMLInputElement).value
		) || 1;
	const powerups = (document.getElementById('powerups') as HTMLInputElement)
		.checked;

	const playerCards = playersContainer.querySelectorAll('.player-card');

	interface Player {
		type: string;
		id?: number;
		controlScheme?: string;
		aiLevel?: number;
		aiOrLocalPlayerName?: string;
	}

	const players: Player[] = [];

	playerCards.forEach((card, index) => {
		// no data needed for first player
		if (index > 0) {
			const type = (
				card.querySelector('.player-type') as HTMLSelectElement
			).value;
			const playerData: Player = { type };
			if (type === 'user') {
				const friendSelect = card.querySelector(
					'.friend-select'
				) as HTMLSelectElement;
				const friendId = friendSelect.value;
				if (!friendId) {
					alert(`Please select a friend for Player ${index + 1}.`);
					throw new Error('Friend not selected');
				}
				playerData.id = Number.parseInt(friendId);
			} else if (type === 'local') {
				const controlScheme = (
					card.querySelector('.control-scheme') as HTMLSelectElement
				).value;
				playerData.controlScheme = controlScheme;
				const localName = card.querySelector(
					'.local-name'
				) as HTMLInputElement;
				playerData.aiOrLocalPlayerName = localName.value;
			} else if (type === 'ai') {
				let aiLevel =
					Number.parseInt(
						(card.querySelector('.ai-level') as HTMLInputElement)
							.value
					) - 1 || 5;
				if (aiLevel < 0) aiLevel = 0;
				else if (aiLevel > 9) aiLevel = 9;
				playerData.aiLevel = aiLevel;
				const aiName = card.querySelector(
					'.ai-name'
				) as HTMLInputElement;
				playerData.aiOrLocalPlayerName = aiName.value;
			}
			players.push(playerData);
		}
	});

	const data = {
		map,
		playerLives: lives,
		gameDifficulty: difficulty,
		powerups,
		players,
	};

	console.log('Sending data to server:', data);
	fetch('/api/games/start', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	})
		.then((response) => {
			if (!response.ok) {
				return response.json().then((err) => {
					throw new Error(err.error || response.statusText);
				});
			}
			return response.json();
		})
		.then((result) => {
			console.log('Game started successfully:', result);
			showLocalInfo('Game started successfully!');
		})
		.catch((error) => {
			console.error('Error starting game:', error);
			showLocalError(`Error starting game: ${error.message}`);
		});
});
