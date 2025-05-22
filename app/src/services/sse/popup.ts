import ejs from 'ejs';
import path from 'path';
import { connectedClients, sendSseHtml, sendSseMessage } from './handler';

// TODO: abstract this to a common place
export const sendRawToClient = (userId: number, data: any) => {
	console.log('Sending raw data to client', userId, data);
	const reply = connectedClients.get(userId);
	if (reply) {
		if (!data.endsWith('\n\n')) {
			data += '\n\n';
		}
		reply.raw.write(data);
	} else {
		console.error(`User ${userId} not found in connected users.`);
	}
};
export function sendPopupToClient(
	id: number,
	title: string = 'Info',
	description: string = '',
	color: string = 'black',
	callback1: string = '',
	buttonName1: string = 'PROCEED',
	callback2: string = '',
	buttonName2: string = 'CANCEL'
) {
	let reply = connectedClients.get(id);
	if (!reply) {
		console.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(
			path.join(__dirname, `../../../public/pages/misc/popup.ejs`),
			{
				title,
				description,
				color,
				callback1,
				buttonName1,
				callback2,
				buttonName2,
				isAchievement: false,
			},
			(err, str) => {
				if (err) {
					console.error('Error rendering view:', err);
					// reply.raw.write(
					// 	`data: ${JSON.stringify({
					// 		type: 'error',
					// 		message: err,
					// 	})}\n\n`
					// );
					sendSseMessage(reply, 'error', err);
				} else {
					// reply.raw.write(
					// 	`data: ${JSON.stringify({
					// 		type: 'popup',
					// 		html: str,
					// 	})}\n\n`
					// );
					sendSseHtml(reply, 'popup', str);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
		// reply.raw.write(
		// 	`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`
		// );
		sendSseMessage(reply, 'error', err);
	}
}

export function sendAchievementToClient(
	id: number,
	title: string,
	description: string,
	firstTitle: string,
	secondTitle: string,
	thirdTitle: string
) {
	let reply = connectedClients.get(id);
	if (!reply) {
		console.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(
			path.join(__dirname, `../../../public/pages/misc/popup.ejs`),
			{
				title,
				description,
				color: 'purple',
				callback1: '',
				buttonName1: '',
				callback2: '',
				buttonName2: '',
				isAchievement: true,
				firstTitle,
				secondTitle,
				thirdTitle,
			},
			(err, str) => {
				if (err) {
					console.error('Error rendering view:', err);
					// reply.raw.write(
					// 	`data: ${JSON.stringify({
					// 		type: 'error',
					// 		message: err,
					// 	})}\n\n`
					// );
					sendSseMessage(reply, 'error', err);
				} else {
					// reply.raw.write(
					// 	`data: ${JSON.stringify({
					// 		type: 'popup',
					// 		html: str,
					// 	})}\n\n`
					// );
					sendSseHtml(reply, 'popup', str);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
		// reply.raw.write(
		// 	`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`
		// );
		sendSseMessage(reply, 'error', err);
	}
}
