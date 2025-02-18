import { app } from '../../../main.js';
app.post("/login", async (req: any, reply: any) => {

	const { username, password } = req.body;

	// check with db

});