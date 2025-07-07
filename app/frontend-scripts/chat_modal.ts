import { getMessages, getChats } from './chat.js';
import { showLocalError, showLocalPopup } from './alert.js';

let userIds: string[] = [];
let userIdToBlock = '';

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

document.getElementById('createGroup')?.addEventListener('click', async () => {
	document.getElementById('groupWindow')?.classList.remove('hidden');
	const res = await fetch('/api/chat/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends');
		return;
	};
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResults');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				const pos = userIds.indexOf(friend.id.toString());
				if (pos === -1) userIds.push(friend.id.toString());
				else userIds.splice(pos, 1);
			});
			butt.textContent = friend.displayname;
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
		groupName = (document.getElementById('groupNameInput') as HTMLInputElement)
			.value;
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
		const url = `/api/chat/create?${params.toString()}`;
		const res = await fetch(url);
		if (!res.ok) {
			showLocalError(`Failed to create chat: ${groupName}`);
			return;
		};
		const responseData = await res.json();

		const newId = responseData.chat_id as string;
		localStorage.setItem('chat_id', newId);
		document.getElementById('closeGroupWindow')?.click();
		await getMessages(newId);
		await getChats();
	});

document.getElementById('closeGroupWindow')?.addEventListener('click', async () => {
	userIds = [];
	groupName = '';
	document.getElementById('groupWindow')?.classList.add('hidden');
});

// Block User Modal

document.getElementById('blockUser')?.addEventListener('click', async () => {
	document.getElementById('blockUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/chat/friends');
	if (!res.ok) {
		showLocalError('Failed to load friends in block user modal');
	};
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToBlock');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				userIdToBlock = friend.id.toString();
			});
			butt.textContent = friend.displayname;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
});

document.getElementById('confirmBlockUser')?.addEventListener('click', async () => {
	if (userIdToBlock === '') {
		showLocalPopup({
			title: 'No user added',
			description: 'You need to add some users to block',
			color: 'red',
		});
		return;
	}
	const url = `/api/chat/block_user?user_id=${userIdToBlock}`;
	const res = await fetch(url);
	if (!res.ok) {
		showLocalError('Failed to block user');
		return;
	};
	document.getElementById('closeBlockUser')?.click();
});

document.getElementById('closeBlockUser')?.addEventListener('click', async () => {
	userIdToBlock = '';
	document.getElementById('blockUserWindow')?.classList.add('hidden');
});

// Unblock User Modal

document.getElementById('unblockUser')?.addEventListener('click', async () => {
	document.getElementById('unblockUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/chat/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends');
		return;
	};
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToUnblock');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				userIdToBlock = friend.id.toString();
			});
			butt.textContent = friend.displayname;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
});

document
	.getElementById('confirmUnblockUser')
	?.addEventListener('click', async () => {
		if (userIdToBlock === '') {
			showLocalPopup({
				title: 'No user added',
				description: 'You need to add some users to  unblock',
				color: 'red',
			});
			return;
		}
		const url = `/api/chat/unblock_user?user_id=${userIdToBlock}`;
		const res = await fetch(url);
		if (!res.ok) {
			showLocalError('Failed to unblock user');
			console.error('Failed to unblock user:', res.status, res.statusText);
			return;
		}
		document.getElementById('closeUnblockUser')?.click();
	});

document.getElementById('closeUnblockUser')?.addEventListener('click', async () => {
	userIdToBlock = '';
	document.getElementById('unblockUserWindow')?.classList.add('hidden');
});

// Invite User Modal

document.getElementById('inviteUser')?.addEventListener('click', async () => {
	document.getElementById('inviteUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/chat/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends');
		console.error('Failed to fetch friends:', res.status, res.statusText);
		return;
	};
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToInvite');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.addEventListener('click', async () => {
				const pos = userIds.indexOf(friend.id.toString());
				if (pos === -1) userIds.push(friend.id.toString());
				else userIds.splice(pos, 1);
			});
			butt.textContent = friend.displayname;
			butt.className = 'hover:bg-gray-100 cursor-pointer p-1 rounded';
			userList.appendChild(butt);
		}
	}
});

document.getElementById('confirmInviteUser')?.addEventListener('click', async () => {
	if (userIds.length === 0) {
		showLocalPopup({
			title: 'No user added',
			description: 'You need to add some users to  Invite',
			color: 'red',
		});
		return;
	}
	const params = new URLSearchParams();
	for (const id of userIds) {
		params.append('user_id', id.toString());
	}
	const url = `/api/chat/invite_user?chat_id=${localStorage.getItem(
		'chat_id'
	)}&${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) {
		showLocalError('Failed to invite user');
		console.error('Failed to invite user:', res.status, res.statusText);
		return;
	}
	document.getElementById('closeInviteUser')?.click();
});

document.getElementById('closeInviteUser')?.addEventListener('click', async () => {
	userIds = [];
	document.getElementById('inviteUserWindow')?.classList.add('hidden');
});

// Leave User Modal

document.getElementById('leaveUser')?.addEventListener('click', async () => {
	const res = await fetch(
		`/api/chat/leave_user?chat_id=${localStorage.getItem('chat_id')}`
	);
	if (!res.ok) {
		showLocalError('Failed to leave chat');
		console.error('Failed to leave chat:', res.status, res.statusText);
		return;
	};
});
