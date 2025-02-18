import { app } from '../../../main.js';
app.post("/login", async (req, reply) => {
    const { username, password } = req.body;
    // check with db
});
