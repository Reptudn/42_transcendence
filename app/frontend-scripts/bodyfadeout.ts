// export function bodyFadeOut() {
// 	const content = document.getElementById('content');
// 	const menu = document.getElementById('menu');
// 	const tv_screen_inner = document.getElementsByClassName('tv-screen-inner');
// 	if (!content || !menu) return;

// 	const contentRect = content.getBoundingClientRect();
// 	const menuRect = menu.getBoundingClientRect();
// 	const contentChildren = Array.from(content.children) as HTMLElement[];
// 	console.log('Headerbottom: ', menuRect.bottom);
// 	console.log('ContentTop: ', contentRect.top);
// 	// Listen for scroll events on each .tv-screen-inner element
// 	for (const child of contentChildren) {
// 		for (const el of tv_screen_inner) {
// 			if (menuRect.bottom > contentRect.top) {
// 				child.style.opacity = '0';
// 			} else {
// 				child.style.opacity = '1';
// 			}
// 			el.addEventListener('scroll', bodyFadeOut);
// 		}
// 	}
// 	window.addEventListener('resize', bodyFadeOut);
// 	// document.addEventListener('DOMContentLoaded', bodyFadeOut);
// }
// bodyFadeOut();
