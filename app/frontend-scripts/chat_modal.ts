import { getMessages, getChats } from './chat.js';
import { showLocalError, showLocalInfo, showLocalPopup } from './alert.js';

let userIds: string[] = [];
let userIdToBlock = '';

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

document.getElementById('createGroup')?.addEventListener('click', async () => {
	document.getElementById('groupWindow')?.classList.remove('hidden');
	const res = await fetch('/api/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends', undefined, 5000);
		return;
	}
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResults');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');

			butt.textContent = friend.displayname;
			butt.classList.add(
				'px-4',
				'py-2',
				'w-full',
				'border',
				'border-gray-300',
				'bg-transparent',
				'rounded',
				'hover:bg-green-500',
				'hover:text-white',
				'transition'
			);

			butt.addEventListener('click', () => {
				const pos = userIds.indexOf(friend.id.toString());
				if (pos === -1) {
					userIds.push(friend.id.toString());
					butt.classList.add('bg-green-500', 'text-white');
					butt.classList.remove('bg-transparent');
				} else {
					userIds.splice(pos, 1);
					butt.classList.remove('bg-green-500', 'text-white');
					butt.classList.add('bg-transparent');
				}
			});

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
		const data = await res.json();
		if (!res.ok) {
			showLocalError(data.error, undefined, 50000);
			return;
		}
		showLocalInfo(data.msg);
		const newId = data.chat_id as string;
		sessionStorage.setItem('chat_id', newId);
		await getMessages(newId);
		await getChats();
		document.getElementById('closeGroupWindow')?.click();
	});

document.getElementById('closeGroupWindow')?.addEventListener('click', async () => {
	userIds = [];
	groupName = '';
	document.getElementById('groupWindow')?.classList.add('hidden');
});

// Block User Modal

document.getElementById('blockUser')?.addEventListener('click', async () => {
	document.getElementById('blockUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/friends');
	if (!res.ok) {
		showLocalError('Failed to load friends in block user modal', undefined, 5000);
	}
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToBlock');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.id = friend.id.toString();
			butt.textContent = friend.displayname;
			butt.classList.add(
				'px-4',
				'py-2',
				'w-full',
				'border',
				'border-gray-300',
				'bg-transparent',
				'rounded',
				'hover:bg-green-500',
				'hover:text-white',
				'transition'
			);

			butt.addEventListener('click', () => {
				if (userIdToBlock === '') {
					userIdToBlock = friend.id.toString();
					butt.classList.add('bg-green-500', 'text-white');
					butt.classList.remove('bg-transparent');
				} else {
					if (userIdToBlock === friend.id.toString()) {
						userIdToBlock = '';
						butt.classList.remove('bg-green-500', 'text-white');
						butt.classList.add('bg-transparent');
					} else {
						const oldbutt = document.getElementById(userIdToBlock);
						if (oldbutt) {
							oldbutt.classList.remove('bg-green-500', 'text-white');
							oldbutt.classList.add('bg-transparent');
						}
						userIdToBlock = friend.id.toString();
						butt.classList.add('bg-green-500', 'text-white');
						butt.classList.remove('bg-transparent');
					}
				}
			});
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
	const data = await res.json();
	if (!res.ok) {
		showLocalError(data.error, undefined, 5000);
		return;
	}
	showLocalInfo(data.msg);
	document.getElementById('closeBlockUser')?.click();
});

document.getElementById('closeBlockUser')?.addEventListener('click', async () => {
	userIdToBlock = '';
	document.getElementById('blockUserWindow')?.classList.add('hidden');
});

// Unblock User Modal

document.getElementById('unblockUser')?.addEventListener('click', async () => {
	document.getElementById('unblockUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends', undefined, 5000);
		return;
	}
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToUnblock');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.id = friend.id.toString();
			butt.textContent = friend.displayname;
			butt.classList.add(
				'px-4',
				'py-2',
				'w-full',
				'border',
				'border-gray-300',
				'bg-transparent',
				'rounded',
				'hover:bg-green-500',
				'hover:text-white',
				'transition'
			);

			butt.addEventListener('click', () => {
				if (userIdToBlock === '') {
					userIdToBlock = friend.id.toString();
					butt.classList.add('bg-green-500', 'text-white');
					butt.classList.remove('bg-transparent');
				} else {
					if (userIdToBlock === friend.id.toString()) {
						userIdToBlock = '';
						butt.classList.remove('bg-green-500', 'text-white');
						butt.classList.add('bg-transparent');
					} else {
						const oldbutt = document.getElementById(userIdToBlock);
						if (oldbutt) {
							oldbutt.classList.remove('bg-green-500', 'text-white');
							oldbutt.classList.add('bg-transparent');
						}
						userIdToBlock = friend.id.toString();
						butt.classList.add('bg-green-500', 'text-white');
						butt.classList.remove('bg-transparent');
					}
				}
			});
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
		const data = await res.json();
		if (!res.ok) {
			return showLocalError(data.error, undefined, 5000);
		}
		showLocalInfo(data.msg);
		document.getElementById('closeUnblockUser')?.click();
	});

document.getElementById('closeUnblockUser')?.addEventListener('click', async () => {
	userIdToBlock = '';
	document.getElementById('unblockUserWindow')?.classList.add('hidden');
});

// Invite User Modal

document.getElementById('inviteUser')?.addEventListener('click', async () => {
	document.getElementById('inviteUserWindow')?.classList.remove('hidden');
	const res = await fetch('/api/friends');
	if (!res.ok) {
		showLocalError('Failed to fetch friends', undefined, 5000);
		console.error('Failed to fetch friends:', res.status, res.statusText);
		return;
	}
	const friends = (await res.json()) as Friend[];
	const userList = document.getElementById('searchResultsToInvite');
	if (userList) {
		userList.innerHTML = '';
		for (const friend of friends) {
			const butt = document.createElement('button');
			butt.textContent = friend.displayname;
			butt.classList.add(
				'px-4',
				'py-2',
				'w-full',
				'border',
				'border-gray-300',
				'bg-transparent',
				'rounded',
				'hover:bg-green-500',
				'hover:text-white',
				'transition'
			);

			butt.addEventListener('click', () => {
				const pos = userIds.indexOf(friend.id.toString());
				if (pos === -1) {
					userIds.push(friend.id.toString());
					butt.classList.add('bg-green-500', 'text-white');
					butt.classList.remove('bg-transparent');
				} else {
					userIds.splice(pos, 1);
					butt.classList.remove('bg-green-500', 'text-white');
					butt.classList.add('bg-transparent');
				}
			});
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
	const url = `/api/chat/invite_user?chat_id=${sessionStorage.getItem(
		'chat_id'
	)}&${params.toString()}`;
	const res = await fetch(url);
	const data = await res.json();
	if (!res.ok) {
		showLocalError(data.error, undefined, 5000);
		return;
	}
	showLocalInfo(data.msg);
	document.getElementById('closeInviteUser')?.click();
});

document.getElementById('closeInviteUser')?.addEventListener('click', async () => {
	userIds = [];
	document.getElementById('inviteUserWindow')?.classList.add('hidden');
});

// Leave User

document.getElementById('leaveUser')?.addEventListener('click', async () => {
	const res = await fetch(
		`/api/chat/leave_user?chat_id=${sessionStorage.getItem('chat_id')}`
	);
	const data = await res.json();
	if (!res.ok) {
		showLocalError(data.error, undefined, 5000);
		return;
	}
	showLocalInfo(data.msg);
	sessionStorage.setItem('chat_id', '1');
	await getMessages('1');
	await getChats();
});

// ChatInfo Modal

document.getElementById('chatInfo')?.addEventListener('click', async () => {
	document.getElementById('chatInfoWindow')?.classList.remove('hidden');
	const res = await fetch(
		`/api/chat/getInfo?chat_id=${sessionStorage.getItem('chat_id')}`
	);
	const data = await res.json();
	if (!res.ok) {
		showLocalError(data.error, undefined, 5000);
		return;
	}
	const win = document.getElementById('chatInfoInput');
	if (win) {
		win.innerHTML = '';
		win.innerHTML = data.msg;
	}
});

document.getElementById('closeChatInfo')?.addEventListener('click', async () => {
	document.getElementById('chatInfoWindow')?.classList.add('hidden');
});

// Options Modal

document.getElementById('optionButton')?.addEventListener('click', async () => {
	document.getElementById('optionModal')?.classList.remove('hidden');
});

document.getElementById('closeOptions')?.addEventListener('click', async () => {
	document.getElementById('optionModal')?.classList.add('hidden');
});
