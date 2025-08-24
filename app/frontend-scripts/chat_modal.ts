import { getMessages } from './chat.js';
import { showLocalError, showLocalInfo } from './alert.js';

export async function initModal() {
	let userIds: string[] = [];
	let userIdToBlock = '';

	// Chats Modal

	document.getElementById('chats')?.addEventListener('click', async () => {
		document.getElementById('chatsModal')?.classList.remove('hidden');

		const res = await fetch('/api/chat/chats');
		const data = await res.json();
		if (!res.ok) {
			return showLocalInfo(data.error);
		}

		const chatList = document.getElementById('chatList');
		if (chatList) {
			chatList.innerHTML = '';
			for (const chat of data.chats) {
				chatList.insertAdjacentHTML('beforeend', chat);
			}
		}
	});

	document.getElementById('chatList')?.addEventListener('click', async (e) => {
		const button = (e.target as HTMLElement).closest(
			'.chat-button'
		) as HTMLButtonElement;

		if (button) {
			if (button.dataset.chat) {
				sessionStorage.setItem('chat_id', button.dataset.chat);
				document.getElementById('chatsModal')?.classList.add('hidden');
				await getMessages(sessionStorage.getItem('chat_id'));
			}
		}
	});

	document.getElementById('closeChats')?.addEventListener('click', async () => {
		document.getElementById('chatsModal')?.classList.add('hidden');
	});

	// Friends Modal

	document.getElementById('friends')?.addEventListener('click', async () => {
		document.getElementById('friendsModal')?.classList.remove('hidden');

		const res = await fetch('/api/chat/friends?chat_id=1');
		const data = await res.json();
		if (!res.ok) {
			return showLocalInfo(data.error);
		}

		const friendList = document.getElementById('friendsList');
		if (friendList) {
			friendList.innerHTML = '';
			for (const friend of data.friends) {
				friendList.insertAdjacentHTML('beforeend', friend);
			}
		}
	});

	document.getElementById('closeFriends')?.addEventListener('click', async () => {
		document.getElementById('friendsModal')?.classList.add('hidden');
	});

	// Create Group Modal

	let groupName = '';

	document.getElementById('createGroup')?.addEventListener('click', async () => {
		document.getElementById('groupWindow')?.classList.remove('hidden');
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		const userList = document.getElementById('searchResults');
		if (userList) {
			userList.innerHTML = '';
			for (const friend of data.friends) {
				userList.insertAdjacentHTML('beforeend', friend);
			}
		}
	});

	document
		.getElementById('searchResults')
		?.addEventListener('click', async (e) => {
			const button = (e.target as HTMLElement).closest(
				'.friend-button'
			) as HTMLButtonElement;

			if (button) {
				if (button.dataset.chat) {
					const pos = userIds.indexOf(button.dataset.chat);
					if (pos === -1) {
						userIds.push(button.dataset.chat);
						button.classList.add('bg-green-500', 'text-white');
						button.classList.remove('bg-transparent');
					} else {
						userIds.splice(pos, 1);
						button.classList.remove('bg-green-500', 'text-white');
						button.classList.add('bg-transparent');
					}
				}
			}
		});

	document
		.getElementById('confirmCreateGroup')
		?.addEventListener('click', async () => {
			if (userIds.length === 0) {
				groupName = '';
				showLocalInfo('You need to add some users to the Group');
				return;
			}
			groupName = (
				document.getElementById('groupNameInput') as HTMLInputElement
			).value;
			if (groupName === '') {
				groupName = '';
				showLocalInfo('You need not add a Groupname');
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
				groupName = '';
				showLocalError(data.error, undefined, 5000);
				return;
			}
			showLocalInfo(data.msg, undefined, 5000);
			const newId = data.chat_id as string;
			sessionStorage.setItem('chat_id', newId);
			await getMessages(newId);
			document.getElementById('closeGroupWindow')?.click();
			document.getElementById('chatsModal')?.classList.add('hidden');
		});

	document
		.getElementById('closeGroupWindow')
		?.addEventListener('click', async () => {
			userIds = [];
			groupName = '';
			document.getElementById('groupWindow')?.classList.add('hidden');
		});

	// Block User Modal

	document.getElementById('blockUser')?.addEventListener('click', async () => {
		document.getElementById('blockUserWindow')?.classList.remove('hidden');
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		const userList = document.getElementById('searchResultsToBlock');
		if (userList) {
			userList.innerHTML = '';
			for (const friend of data.friends) {
				userList.insertAdjacentHTML('beforeend', friend);
			}
		}
	});

	document
		.getElementById('searchResultsToBlock')
		?.addEventListener('click', async (e) => {
			const button = (e.target as HTMLElement).closest(
				'.friend-button'
			) as HTMLButtonElement;

			if (button) {
				if (button.dataset.chat) {
					if (userIdToBlock === '') {
						userIdToBlock = button.dataset.chat;
						button.classList.add('bg-green-500', 'text-white');
						button.classList.remove('bg-transparent');
					} else {
						if (userIdToBlock === button.dataset.chat) {
							userIdToBlock = '';
							button.classList.remove('bg-green-500', 'text-white');
							button.classList.add('bg-transparent');
						} else {
							const oldbutt = document.getElementById(userIdToBlock);
							if (oldbutt) {
								oldbutt.classList.remove(
									'bg-green-500',
									'text-white'
								);
								oldbutt.classList.add('bg-transparent');
							}
							userIdToBlock = button.dataset.chat;
							button.classList.add('bg-green-500', 'text-white');
							button.classList.remove('bg-transparent');
						}
					}
				}
			}
		});

	document
		.getElementById('confirmBlockUser')
		?.addEventListener('click', async () => {
			if (userIdToBlock === '') {
				showLocalInfo('You need to add a user to block');
				return;
			}
			const url = `/api/chat/block_user?user_id=${userIdToBlock}`;
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok) {
				showLocalError(data.error, undefined, 5000);
				return;
			}
			showLocalInfo(data.msg, undefined, 5000);
			document.getElementById('closeBlockUser')?.click();
		});

	document
		.getElementById('closeBlockUser')
		?.addEventListener('click', async () => {
			userIdToBlock = '';
			document.getElementById('blockUserWindow')?.classList.add('hidden');
		});

	// Unblock User Modal

	document.getElementById('unblockUser')?.addEventListener('click', async () => {
		document.getElementById('unblockUserWindow')?.classList.remove('hidden');
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		const userList = document.getElementById('searchResultsToUnblock');
		if (userList) {
			userList.innerHTML = '';
			for (const friend of data.friends) {
				userList.insertAdjacentHTML('beforeend', friend);
			}
		}
	});

	document
		.getElementById('searchResultsToUnblock')
		?.addEventListener('click', async (e) => {
			const button = (e.target as HTMLElement).closest(
				'.friend-button'
			) as HTMLButtonElement;

			if (button) {
				if (button.dataset.chat) {
					if (userIdToBlock === '') {
						userIdToBlock = button.dataset.chat;
						button.classList.add('bg-green-500', 'text-white');
						button.classList.remove('bg-transparent');
					} else {
						if (userIdToBlock === button.dataset.chat) {
							userIdToBlock = '';
							button.classList.remove('bg-green-500', 'text-white');
							button.classList.add('bg-transparent');
						} else {
							const oldbutt = document.getElementById(userIdToBlock);
							if (oldbutt) {
								oldbutt.classList.remove(
									'bg-green-500',
									'text-white'
								);
								oldbutt.classList.add('bg-transparent');
							}
							userIdToBlock = button.dataset.chat;
							button.classList.add('bg-green-500', 'text-white');
							button.classList.remove('bg-transparent');
						}
					}
				}
			}
		});

	document
		.getElementById('confirmUnblockUser')
		?.addEventListener('click', async () => {
			if (userIdToBlock === '') {
				showLocalInfo('You need to add a user to unblock');
				return;
			}
			const url = `/api/chat/unblock_user?user_id=${userIdToBlock}`;
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok) {
				return showLocalError(data.error, undefined, 5000);
			}
			showLocalInfo(data.msg, undefined, 5000);
			document.getElementById('closeUnblockUser')?.click();
		});

	document
		.getElementById('closeUnblockUser')
		?.addEventListener('click', async () => {
			userIdToBlock = '';
			document.getElementById('unblockUserWindow')?.classList.add('hidden');
		});

	// Invite User Modal

	document.getElementById('inviteUser')?.addEventListener('click', async () => {
		document.getElementById('inviteUserWindow')?.classList.remove('hidden');
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends');
			return;
		}
		const data = await res.json();
		const userList = document.getElementById('searchResultsToInvite');
		if (userList) {
			userList.innerHTML = '';
			for (const friend of data.friends) {
				userList.insertAdjacentHTML('beforeend', friend);
			}
		}
	});

	document
		.getElementById('searchResultsToInvite')
		?.addEventListener('click', async (e) => {
			const button = (e.target as HTMLElement).closest(
				'.friend-button'
			) as HTMLButtonElement;

			if (button) {
				if (button.dataset.chat) {
					const pos = userIds.indexOf(button.dataset.chat);
					if (pos === -1) {
						userIds.push(button.dataset.chat);
						button.classList.add('bg-green-500', 'text-white');
						button.classList.remove('bg-transparent');
					} else {
						userIds.splice(pos, 1);
						button.classList.remove('bg-green-500', 'text-white');
						button.classList.add('bg-transparent');
					}
				}
			}
		});

	document
		.getElementById('confirmInviteUser')
		?.addEventListener('click', async () => {
			if (userIds.length === 0) {
				showLocalInfo('You need to add some users to Invite');
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
			showLocalInfo(data.msg, undefined, 5000);
			document.getElementById('closeInviteUser')?.click();
		});

	document
		.getElementById('closeInviteUser')
		?.addEventListener('click', async () => {
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
		showLocalInfo(data.msg, undefined, 5000);
		sessionStorage.setItem('chat_id', '1');
		await getMessages('1');
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
}

await initModal();
