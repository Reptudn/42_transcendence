import { getMessages } from './chat.js';
import { showLocalError, showLocalInfo } from './alert.js';

let userIds: string[] = [];
let userIdToBlock = '';
let groupName = '';

if (localStorage.getItem('loggedIn') === 'true')
	await initModal();

export async function initModal() {
	// Chats Modal

	let button = document.getElementById('chats');
	button?.removeEventListener('click', mainChatButton);
	button?.addEventListener('click', mainChatButton);

	button = document.getElementById('chatList');
	button?.removeEventListener('click', chatButtons);
	button?.addEventListener('click', chatButtons);

	button = document.getElementById('closeChats');
	button?.removeEventListener('click', closeChat);
	button?.addEventListener('click', closeChat);

	// Friends Modal

	button = document.getElementById('friends');
	button?.removeEventListener('click', mainFrindsButton);
	button?.addEventListener('click', mainFrindsButton);

	button = document.getElementById('closeFriends');
	button?.removeEventListener('click', closeFriends);
	button?.addEventListener('click', closeFriends);

	// Create Group Modal

	button = document.getElementById('createGroup');
	button?.removeEventListener('click', openCreateModal);
	button?.addEventListener('click', openCreateModal);

	button = document.getElementById('searchResults');
	button?.removeEventListener('click', friendsButtonsCreate);
	button?.addEventListener('click', friendsButtonsCreate);

	button = document.getElementById('confirmCreateGroup');
	button?.removeEventListener('click', confirmCreateGroup);
	button?.addEventListener('click', confirmCreateGroup);

	button = document.getElementById('closeGroupWindow');
	button?.removeEventListener('click', closeCreate);
	button?.addEventListener('click', closeCreate);

	// Block User Modal

	button = document.getElementById('blockUser');
	button?.removeEventListener('click', openBlockModal);
	button?.addEventListener('click', openBlockModal);

	button = document.getElementById('searchResultsToBlock');
	button?.removeEventListener('click', friendsButtonsBlock);
	button?.addEventListener('click', friendsButtonsBlock);

	button = document.getElementById('confirmBlockUser');
	button?.removeEventListener('click', confirmBlockUser);
	button?.addEventListener('click', confirmBlockUser);

	button = document.getElementById('closeBlockUser');
	button?.removeEventListener('click', closeBlockUser);
	button?.addEventListener('click', closeBlockUser);

	// Unblock User Modal

	button = document.getElementById('unblockUser');
	button?.removeEventListener('click', openUnblockModal);
	button?.addEventListener('click', openUnblockModal);

	button = document.getElementById('searchResultsToUnblock');
	button?.removeEventListener('click', friendsButtonsUnblock);
	button?.addEventListener('click', friendsButtonsUnblock);

	button = document.getElementById('confirmUnblockUser');
	button?.removeEventListener('click', confirmUnblockUser);
	button?.addEventListener('click', confirmUnblockUser);

	button = document.getElementById('closeUnblockUser');
	button?.removeEventListener('click', closeUnblockUser);
	button?.addEventListener('click', closeUnblockUser);

	// Invite User Modal

	button = document.getElementById('inviteUser');
	button?.removeEventListener('click', openInviteModal);
	button?.addEventListener('click', openInviteModal);

	button = document.getElementById('searchResultsToInvite');
	button?.removeEventListener('click', friendsButtonsInvite);
	button?.addEventListener('click', friendsButtonsInvite);

	button = document.getElementById('confirmInviteUser');
	button?.removeEventListener('click', confirmInviteUser);
	button?.addEventListener('click', confirmInviteUser);

	button = document.getElementById('closeInviteUser');
	button?.removeEventListener('click', closeInviteUser);
	button?.addEventListener('click', closeInviteUser);

	// Leave User

	button = document.getElementById('leaveUser');
	button?.removeEventListener('click', leaveUser);
	button?.addEventListener('click', leaveUser);

	// ChatInfo Modal

	button = document.getElementById('chatInfo');
	button?.removeEventListener('click', openChatInfo);
	button?.addEventListener('click', openChatInfo);

	button = document.getElementById('closeChatInfo');
	button?.removeEventListener('click', closeChatInfo);
	button?.addEventListener('click', closeChatInfo);

	// Options Modal

	button = document.getElementById('optionButton');
	button?.removeEventListener('click', openOptionsModal);
	button?.addEventListener('click', openOptionsModal);

	button = document.getElementById('closeOptions');
	button?.removeEventListener('click', closeOptions);
	button?.addEventListener('click', closeOptions);
}

// function for Chats Modal

async function mainChatButton() {
	document.getElementById('chatsModal')?.classList.remove('hidden');
	await renderChat();
}

export async function renderChat() {
	const chatList = document.getElementById('chatList');
	if (chatList) {
		const res = await fetch('/api/chat/chats');
		const data = await res.json();
		if (!res.ok) {
			return showLocalInfo(data.error);
		}
		chatList.innerHTML = '';
		for (const chat of data.chats) {
			chatList.insertAdjacentHTML('beforeend', chat);
		}
	}
}

async function chatButtons(e: MouseEvent) {
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
}

function closeChat() {
	document.getElementById('chatsModal')?.classList.add('hidden');
}

// Function for Friends Modal

async function mainFrindsButton() {
	document.getElementById('friendsModal')?.classList.remove('hidden');
	await renderFriends();
}

export async function renderFriends() {
	const friendList = document.getElementById('friendsList');
	if (friendList) {
		const res = await fetch('/api/chat/friends?chat_id=1');
		const data = await res.json();
		if (!res.ok) {
			return showLocalInfo(data.error);
		}
		friendList.innerHTML = '';
		for (const friend of data.friends) {
			friendList.insertAdjacentHTML('beforeend', friend);
		}
	}
}

function closeFriends() {
	document.getElementById('friendsModal')?.classList.add('hidden');
}

// Function for Create Group Modal

async function openCreateModal() {
	document.getElementById('groupWindow')?.classList.remove('hidden');
	await renderFriendsButtonsCreate();
}

export async function renderFriendsButtonsCreate() {
	const userList = document.getElementById('searchResults');
	if (userList) {
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		userList.innerHTML = '';
		for (const friend of data.friends) {
			userList.insertAdjacentHTML('beforeend', friend);
		}
	}
}

function friendsButtonsCreate(e: MouseEvent) {
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
}

async function confirmCreateGroup() {
	if (userIds.length === 0) {
		groupName = '';
		showLocalInfo('You need to add some users to the Group');
		return;
	}
	groupName = (document.getElementById('groupNameInput') as HTMLInputElement)
		.value;
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
}

function closeCreate() {
	userIds = [];
	groupName = '';
	document.getElementById('groupWindow')?.classList.add('hidden');
}

// Function for Block Modal

async function openBlockModal() {
	document.getElementById('blockUserWindow')?.classList.remove('hidden');
	await renderFriendsButtonsBlock();
}

export async function renderFriendsButtonsBlock() {
	const userList = document.getElementById('searchResultsToBlock');
	if (userList) {
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		userList.innerHTML = '';
		for (const friend of data.friends) {
			userList.insertAdjacentHTML('beforeend', friend);
		}
	}
}

function friendsButtonsBlock(e: MouseEvent) {
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
						oldbutt.classList.remove('bg-green-500', 'text-white');
						oldbutt.classList.add('bg-transparent');
					}
					userIdToBlock = button.dataset.chat;
					button.classList.add('bg-green-500', 'text-white');
					button.classList.remove('bg-transparent');
				}
			}
		}
	}
}

async function confirmBlockUser() {
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
}

function closeBlockUser() {
	userIdToBlock = '';
	document.getElementById('blockUserWindow')?.classList.add('hidden');
}

// Function for Unblock Modal

async function openUnblockModal() {
	document.getElementById('unblockUserWindow')?.classList.remove('hidden');
	await renderFriendsUnblock();
}

export async function renderFriendsUnblock() {
	const userList = document.getElementById('searchResultsToUnblock');
	if (userList) {
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends', undefined, 5000);
			return;
		}
		const data = await res.json();
		userList.innerHTML = '';
		for (const friend of data.friends) {
			userList.insertAdjacentHTML('beforeend', friend);
		}
	}
}

function friendsButtonsUnblock(e: MouseEvent) {
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
						oldbutt.classList.remove('bg-green-500', 'text-white');
						oldbutt.classList.add('bg-transparent');
					}
					userIdToBlock = button.dataset.chat;
					button.classList.add('bg-green-500', 'text-white');
					button.classList.remove('bg-transparent');
				}
			}
		}
	}
}

async function confirmUnblockUser() {
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
}

function closeUnblockUser() {
	userIdToBlock = '';
	document.getElementById('unblockUserWindow')?.classList.add('hidden');
}

// Function for Invite Modal

async function openInviteModal() {
	document.getElementById('inviteUserWindow')?.classList.remove('hidden');
	await renderFriendsButtonsInvite();
}

export async function renderFriendsButtonsInvite() {
	const userList = document.getElementById('searchResultsToInvite');
	if (userList) {
		const res = await fetch('/api/chat/friends?chat_id=2');
		if (!res.ok) {
			showLocalError('Failed to fetch friends');
			return;
		}
		const data = await res.json();
		userList.innerHTML = '';
		for (const friend of data.friends) {
			userList.insertAdjacentHTML('beforeend', friend);
		}
	}
}

function friendsButtonsInvite(e: MouseEvent) {
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
}

async function confirmInviteUser() {
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
}

function closeInviteUser() {
	userIds = [];
	document.getElementById('inviteUserWindow')?.classList.add('hidden');
}

// Function Leave User

async function leaveUser() {
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
}

// Function ChatInfo Modal

async function openChatInfo() {
	document.getElementById('chatInfoWindow')?.classList.remove('hidden');
	renderChatInfo();
}

export async function renderChatInfo() {
	const win = document.getElementById('chatInfoInput');
	if (win) {
		const res = await fetch(
			`/api/chat/getInfo?chat_id=${sessionStorage.getItem('chat_id')}`
		);
		const data = await res.json();
		if (!res.ok) {
			showLocalError(data.error, undefined, 5000);
			return;
		}
		win.innerHTML = '';
		win.innerHTML = data.msg;
	}
}

function closeChatInfo() {
	document.getElementById('chatInfoWindow')?.classList.add('hidden');
}

// Function Options Modal

function openOptionsModal() {
	document.getElementById('optionModal')?.classList.remove('hidden');
}

function closeOptions() {
	document.getElementById('optionModal')?.classList.add('hidden');
}
