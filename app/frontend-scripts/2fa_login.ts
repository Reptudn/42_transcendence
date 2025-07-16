document.getElementById('#totp');
async function twofa_login(){
	try{
		const response = await fetch('/api/auth/2fa', {
			method: "POST",
			body: {userid: window.user_id, fa_token: fa_token}
		})
	
		if (response.ok){
			updateMenu();
			loadPartialView('profile');
			showLocalInfo('You have logged in successfully');
		}
		else {
				const data = await response.json();
				showLocalError(`Error: ${data.message}`);
			}
	}
	catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.');
	}
}