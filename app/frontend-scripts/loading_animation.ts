document.addEventListener('DOMContentLoaded', () => {
	// Überprüfen, ob die Animation bereits abgespielt wurde
	if (!localStorage.getItem('LoadingAnimationPlayed')) {
		const loadingScreen = document.getElementById('loading-screen');

		// Ladebildschirm anzeigen und nach 2 Sekunden entfernen
		setTimeout(() => {
			if (loadingScreen) {
				loadingScreen.style.display = 'none';
			}

			// Markiere die Animation als abgespielt
			localStorage.setItem('LoadingAnimationPlayed', 'true');
		}, 2000);
	} else {
		// Ladebildschirm sofort entfernen, wenn die Animation bereits abgespielt wurde
		const loadingScreen = document.getElementById('loading-screen');
		if (loadingScreen) {
			loadingScreen.style.display = 'none';
		}
	}
});
