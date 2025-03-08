document.getElementById('joinChatButton')?.addEventListener('click', () => {
	document.querySelectorAll('.friendCheckBox')?.forEach((checkbox) => {
		let ids: number[] = [];
		if ((<HTMLInputElement>checkbox).checked) {
			ids.push(parseInt((<HTMLInputElement>checkbox).value));
		}

		fetch('api/games/start', {
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
		});
	});
});