interface Player {
	type: 'human' | 'ai';
	controlScheme: string;
}

// Initialise default settings for both players
const players: { [key: string]: Player } = {
	player1: { type: 'human', controlScheme: 'wasd' },
	player2: { type: 'human', controlScheme: 'arrows' },
};

// Handle player type toggle change
const playerToggles = document.querySelectorAll<HTMLInputElement>('.player-toggle');
playerToggles.forEach((toggle) => {
	toggle.addEventListener('change', () => {
		const playerId = toggle.dataset.player;
		if (playerId) {
			// If checked, then Human; otherwise AI
			players[playerId].type = toggle.checked ? 'human' : 'ai';
			// Show or hide the control scheme selection accordingly
			const controlDiv = document.getElementById(`${playerId}-control`);
			if (controlDiv) {
				if (players[playerId].type === 'human') {
					controlDiv.classList.remove('hidden');
				} else {
					controlDiv.classList.add('hidden');
				}
			}
		}
		validateSettings();
	});
});

// Listen for control scheme changes
const controlSelects = document.querySelectorAll<HTMLSelectElement>('.control-select');
controlSelects.forEach((select) => {
	select.addEventListener('change', () => {
		const playerId = select.dataset.player;
		if (playerId) {
			players[playerId].controlScheme = select.value;
		}
		validateSettings();
	});
});

// Validation logic: error if both players are AI or if two human players have the same input
function validateSettings(): void {
	let errorMsg = '';

	// If both players are AI, complain!
	if (players['player1'].type === 'ai' && players['player2'].type === 'ai') {
		errorMsg = 'At least one human player must be selected.';
	}

	// If both players are human and their control schemes match, that is an issue.
	if (
		players['player1'].type === 'human' &&
		players['player2'].type === 'human' &&
		players['player1'].controlScheme === players['player2'].controlScheme
	) {
		errorMsg = 'Both players cannot use the same control scheme.';
	}

	// Display the error message (if any)
	const errorDiv = document.getElementById('error-message');
	if (errorDiv) {
		errorDiv.textContent = errorMsg;
	}

	// Disable the Start button if there's an error
	const startBtn = document.getElementById('start-button') as HTMLButtonElement;
	if (startBtn) {
		startBtn.disabled = errorMsg !== '';
	}
}

// Initial validation upon page load
validateSettings();

// Optionally, add a listener to the start button
const startButton = document.getElementById('start-button') as HTMLButtonElement;
startButton.addEventListener('click', () => {
	if (!startButton.disabled) {
		// Proceed to start the game; for now, we simply alert the settings
		alert('Starting game with settings:\n' + JSON.stringify(players, null, 2));
	}
});