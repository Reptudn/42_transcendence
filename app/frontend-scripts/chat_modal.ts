import type { User } from './chat.js';
import { getMessages, getChats } from './chat.js';
import { showLocalPopup } from './alert.js';

let userIds: string[] = [];

document.getElementById('createGroup')?.addEventListener('click', async () => {
	document.getElementById('groupWindow')?.classList.remove('hidden');
	const res = await fetch('/api/chat/users');
	if (!res.ok) return; // TODO Error msg
	const users = (await res.json()) as User[];
	const userList = document.getElementById('searchResults');
	if (userList) {
		userList.innerHTML = '';
		for (const user of users) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				const pos = userIds.indexOf(user.id.toString());
				if (pos === -1) userIds.push(user.id.toString());
				else userIds.splice(pos, 1);
			});
			butt.textContent = user.displayname;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
});

let groupName = '';

document
	.getElementById('confirmCreateGroup')
	?.addEventListener('click', async () => {
		if (userIds.length === 0) {
			showLocalPopup({
				title: 'No members in Group',
				description: 'You need to add some users to the Group',
				color: 'red',
			});
			return;
		}
		groupName = (
			document.getElementById('groupNameInput') as HTMLInputElement
		).value;
		if (groupName === '') {
			showLocalPopup({
				title: 'No Groupname',
				description: 'You need not add a Groupname',
				color: 'red',
			});
			return;
		}
		const params = new URLSearchParams();
		params.append('group_name', groupName);
		for (const id of userIds) {
			params.append('user_id', id.toString());
		}
		const url = `/api/chat/invite?${params.toString()}`;
		const res = await fetch(url);
		if (!res.ok) return; // TODO Error msg
		const responseData = await res.json();

		const newId = responseData.chat_id as string;
		localStorage.setItem('chat_id', newId);
		document.getElementById('closeGroupWindow')?.click();
		await getMessages(newId);
		await getChats();
	});

document
	.getElementById('closeGroupWindow')
	?.addEventListener('click', async () => {
		userIds = [];
		groupName = '';
		document.getElementById('groupWindow')?.classList.add('hidden');
	});
