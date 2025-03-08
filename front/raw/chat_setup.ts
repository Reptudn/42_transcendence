document.getElementById('joinChatButton')?.addEventListener('click', () => {
	let ids: number[] = [];
	document.querySelectorAll('.friendCheckBox')?.forEach((checkbox) => {
		if ((<HTMLInputElement>checkbox).checked) {
			ids.push(parseInt((<HTMLInputElement>checkbox).value));
		}
	});

	if (ids.length === 0) {
		alert('Please select at least one other player to start a game with.');
		return;
	}

	fetch('/api/games/start', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			players: [
				{
					type: 'user',
					id: ids[0]
				}
			]
		})
	})
	.then(response => {
		if (!response.ok) {
			return response.json().then(err => {
			throw new Error(err.error || response.statusText);
			});
		}
		return response.json();
		})
		.then(data => console.log("Game started successfully:", data))
		.catch(error => {
		console.error('Error starting game:', error);
		alert(`Error starting game: ${error.message}`);
	});
});