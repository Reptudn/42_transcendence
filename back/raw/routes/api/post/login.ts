import { app } from '../../../main';
app.post("/login", async (req: any, reply: any) => {

	const { username, password } = req.body;

	// check with db

});