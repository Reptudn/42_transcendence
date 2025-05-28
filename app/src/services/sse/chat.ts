import { connectedClients } from "./handler";

interface ChatMessage {
	from: string,
	to: string,
	message: string,
	timestamp: string,
}

export function sendChatToId(id: number, message: string) {
	let conn = connectedClients.get(id);
	if (!conn) {
		console.error(`Client with id ${id} not found in connected users.`);
		return;
	}

	const chatMessage: ChatMessage = {
		from: 'user', // Replace with actual user ID or name
		to: 'recipient', // Replace with actual recipient ID or name
		message: message,
		timestamp: new Date().toISOString(),
	};

	conn.send(JSON.stringify(chatMessage));

}