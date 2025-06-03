document.addEventListener('DOMContentLoaded', () => {
	// Überprüfen, ob die Animation bereits abgespielt wurde
	if (!sessionStorage.getItem('tvAnimationPlayed')) {
		const loadingScreen = document.getElementById('loading-screen');
		const welcomeScreen = document.getElementById('welcome-screen');

		// Ladebildschirm anzeigen und nach 2 Sekunden den Ladebalken abschließen
		setTimeout(() => {
			// Zeige den "Welcome"-Bildschirm nach der Ladebalken-Animation
			setTimeout(() => {
				if (welcomeScreen) {
					welcomeScreen.classList.remove('hidden');
				}

				// Ladebildschirm sofort ausblenden
				if (loadingScreen) {
					loadingScreen.style.display = 'none';
				}

				// Füge die TV-Shutdown-Animation hinzu
				setTimeout(() => {
					if (welcomeScreen) {
						// Starte die TV-Shutdown-Animation
						welcomeScreen.classList.add('welcome-tv-shutdown');
					}

					// Entferne den gesamten Welcome-Screen nach der Animation
					setTimeout(() => {
						if (welcomeScreen) {
							welcomeScreen.style.display = 'none';
						}

						// Markiere die Animation als abgespielt
						sessionStorage.setItem('tvAnimationPlayed', 'true');
					}, 1000); // Warte, bis die Animation abgeschlossen ist
				}, 2000); // Warte 2 Sekunden für den "Welcome"-Bildschirm
			}, 1000); // Warte, bis die Ladebalken-Animation abgeschlossen ist
		}, 2000); // Warte 2 Sekunden für den Ladebalken
	} else {
		// Ladebildschirm sofort entfernen, wenn die Animation bereits abgespielt wurde
		const loadingScreen = document.getElementById('loading-screen');
		if (loadingScreen) {
			loadingScreen.style.display = 'none';
		}
	}
});
