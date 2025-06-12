import ejs from 'ejs';
import path from 'path';
import { connectedClients, sendSseHtml, sendSseMessage } from './handler';

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
					sendSseMessage(reply, 'error', err);
				} else {
					sendSseHtml(reply, 'popup', str);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
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
					sendSseMessage(reply, 'error', err);
				} else {
					sendSseHtml(reply, 'popup', str);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
		sendSseMessage(reply, 'error', err);
	}
}
