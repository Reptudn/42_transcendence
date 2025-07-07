document.getElementById('create_game_btn')?.addEventListener('click', (event) => {
	const response = await fetch('/api/games/create');
});