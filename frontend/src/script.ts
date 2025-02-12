document.addEventListener("DOMContentLoaded", () => {
	const header: HTMLElement | null = document.getElementById("coolid");

	if (header) {
		header.textContent = "Hola boys and girls";
	}
});
