import { app } from '../../../main';
app.post("/register", async (req: any, reply: any) => {

	const { username, password, email } = req.body;

	// check with db
})