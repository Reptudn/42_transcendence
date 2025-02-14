async function loadPartialView(page) {
	const response = await fetch(`/partial/${page}`);
	const html = await response.text();
	console.log("switching to page: " + page);
	document.getElementById('content').innerHTML = html;

	if (page === 'game') {
        const script = document.createElement('script');
        script.src = '/static/js/pong.js';
        script.defer = true;
        document.body.appendChild(script);
    }

}

function toggleDarkMode() {
	document.body.classList.toggle('dark');
	const isDarkMode = document.body.classList.contains('dark');
	document.getElementById('darkModeToggle').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
}

function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

setCookie('username', "urmom", 1)