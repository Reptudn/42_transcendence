interface User {
	id: number;
	google_id: string;
	username: string;
	password: string;
	displayname: string;
	bio: string;
	profile_picture: string;
	click_count: number;
	title_first: number;
	title_second: number;
	title_third: number;
}

interface Friend {
	id: number;
	accepted: boolean;
	requester_id: number;
	requested_id: number;
}

interface Achievement {
	id: number;
	key: string;
	name: string;
	description: string;
	title_first: string;
	title_second: string;
	title_third: string;
}
