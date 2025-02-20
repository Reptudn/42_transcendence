"use strict";
async function loadPartialView(page, pushState = true) {
    const response = await fetch(`/partial/${page}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'loadpartial': 'true'
        }
    });
    const html = await response.text();
    console.log(`Switching to page: ${page}`);
    const contentElement = document.getElementById('content');
    if (contentElement) {
        contentElement.innerHTML = html;
    }
    else {
        console.warn("Content element not found");
    }
    if (pushState) {
        history.pushState({ page }, '', `/partial/${page}`);
    }
}
window.addEventListener('popstate', (event) => {
    if (event.state && typeof event.state.page === 'string') {
        loadPartialView(event.state.page, false);
    }
});
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDarkMode = document.body.classList.contains('dark');
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    }
    else {
        console.warn("Dark mode toggle element not found");
    }
}
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/`;
}
function getCookie(name) {
    // A simple implementation might be:
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let c of ca) {
        c = c.trim();
        if (c.indexOf(nameEQ) === 0)
            return c.substring(nameEQ.length);
    }
    return null;
}
// A quick demonstration: setting a cookie for the username.
setCookie('username', "urmom", 1);
