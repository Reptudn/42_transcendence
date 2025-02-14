fastify.post("/register", async (req: any, reply: any) => {

	const { username, password, email } = req.body;

	console.log(username, password, email);

	try {

		const res = await fetch("http://api:4242/register", {
			method: "POST",
			body: JSON.stringify({ username, password, email }),
			headers: { "Content-Type": "application/json" }
		});

		const data = await res.json();
		if (res.ok) {
			console.log(data);
			return reply.viewAsync("pages/index.ejs", { user: "registered yes!" }, {
				layout: "layouts/basic.ejs"
			});
		} else {
			reply.status(401).send({ message: 'Invalid username or password' });
		}
	} catch (err) {
		reply.status(401).send({ message: 'Something went wrong whilst trying to perfrom the register action' });
	}

})