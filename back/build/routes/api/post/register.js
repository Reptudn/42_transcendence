import { app } from '../../../main.js';
app.post("/register", async (req, reply) => {
    const { username, password, email } = req.body;
    // check with db
});
