"use strict";

const button = document.getElementById("button");
const apiKeyEl = document.getElementById("apiKeyEl");

async function getApiKey() {
	const response = await fetch("http://localhost:3000/generate-api-key", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result = await response.json();
	console.log(result);
	apiKeyEl.textContent = result.apiKey;
}

button.addEventListener("click", () => {
	getApiKey();
});
