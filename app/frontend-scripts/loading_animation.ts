// document.addEventListener('DOMContentLoaded', () => {
// 	// Check if this is a language switch (skip animation)
// 	startLoadingAnimation();
// });

// // In your loading_animation.ts
// function startLoadingAnimation() {
//     // Disable scrolling during animation
//     document.body.classList.add('overflow-hidden');
    
//     if (window.sessionStorage.getItem('skipLoadingAnimation') === 'true') {
// 		hideLoadingScreens();
// 		window.sessionStorage.removeItem('skipLoadingAnimation');
// 		return;
// 	}

// 	// Check if animation was already played in this session
// 	if (!sessionStorage.getItem('tvAnimationPlayed') || sessionStorage.getItem('tvAnimationPlayed') === 'false') {
// 		const loadingScreen = document.getElementById('loading-screen');
// 		const welcomeScreen = document.getElementById('welcome-screen');

// 		// Show loading screen and complete progress bar after 2 seconds
// 		setTimeout(() => {
// 			// Show welcome screen after loading bar animation
// 			setTimeout(() => {
// 				if (welcomeScreen) {
// 					welcomeScreen.classList.remove('hidden');
// 				}

// 				// Hide loading screen immediately
// 				if (loadingScreen) {
// 					loadingScreen.style.display = 'none';
// 				}

// 				// Add TV shutdown animation
// 				setTimeout(() => {
// 					if (welcomeScreen) {
// 						// Start TV shutdown animation
// 						welcomeScreen.classList.add('welcome-tv-shutdown');
// 					}

// 					// Remove welcome screen after animation
// 					setTimeout(() => {
// 						if (welcomeScreen) {
// 							welcomeScreen.style.display = 'none';
// 						}

// 						// Mark animation as played
// 						sessionStorage.setItem('tvAnimationPlayed', 'true');
// 					}, 1000); // Wait for animation to complete
// 				}, 2000); // Wait 2 seconds for welcome screen
// 			}, 1000); // Wait for loading bar animation
// 		}, 2000); // Wait 2 seconds for loading bar
// 	} else {
// 		// Hide loading screens immediately if animation already played
// 		hideLoadingScreens();
// 	}
    
//     // Re-enable scrolling after animation completes
//     setTimeout(() => {
//         document.body.classList.remove('overflow-hidden');
//         sessionStorage.setItem('tvAnimationPlayed', 'true');
//     }, 6000); // Total animation time
// }

// function hideLoadingScreens() {
//     // Make sure scrolling is enabled when skipping animation
//     document.body.classList.remove('overflow-hidden');
    
//     const loadingScreen = document.getElementById('loading-screen');
//     const welcomeScreen = document.getElementById('welcome-screen');
    
//     if (loadingScreen) {
//         loadingScreen.style.display = 'none';
//     }
    
//     if (welcomeScreen) {
//         welcomeScreen.style.display = 'none';
//     }
// }