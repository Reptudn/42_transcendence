async function loadPartialView(page) {
	const response = await fetch(`/partial/${page}`);
	const html = await response.text();
	console.log("switching to page: " + page);
	document.getElementById('content').innerHTML = html;
}