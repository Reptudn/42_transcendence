(function () {
	// Securely cast our canvas element from the DOM as an HTMLCanvasElement.
	const canvas: HTMLCanvasElement = document.getElementById('pong-game') as HTMLCanvasElement;
	// Obtain the 2D rendering context and assert its type accordingly.
	const context: CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D;

	// Define our game constants with proper type annotations.
	const paddleWidth: number = 10;
	const paddleHeight: number = 100;
	const ballSize: number = 10;
	const initialBallSpeed: number = 5;
	const speedIncrement: number = 0.1;

	// Initialize positions and speeds as numbers.
	let player1Y: number = canvas.height / 2 - paddleHeight / 2;
	let player2Y: number = canvas.height / 2 - paddleHeight / 2;
	let ballX: number = canvas.width / 2;
	let ballY: number = canvas.height / 2;
	let ballSpeedX: number = initialBallSpeed;
	let ballSpeedY: number = initialBallSpeed;

	// Score variables.
	let player1Score: number = 0;
	let player2Score: number = 0;

	// Declare the game interval, which could be a number (for browser timer IDs) or null.
	let gameInterval: number | null = null;

	// Function to draw rectangles on the canvas.
	function drawRect(x: number, y: number, width: number, height: number, color: string): void {
		context.fillStyle = color;
		context.fillRect(x, y, width, height);
	}

	// Function to draw circles on the canvas.
	function drawCircle(x: number, y: number, radius: number, color: string): void {
		context.fillStyle = color;
		context.beginPath();
		context.arc(x, y, radius, 0, Math.PI * 2, true);
		context.closePath();
		context.fill();
	}

	// Function to draw the net in the centre of the canvas.
	function drawNet(): void {
		for (let i = 0; i < canvas.height; i += 20) {
			drawRect(canvas.width / 2 - 1, i, 2, 10, 'white');
		}
	}

	// Render the entire game scene.
	function draw(): void {
		drawRect(0, 0, canvas.width, canvas.height, 'black');
		drawNet();
		drawRect(0, player1Y, paddleWidth, paddleHeight, 'white');
		drawRect(canvas.width - paddleWidth, player2Y, paddleWidth, paddleHeight, 'white');
		drawCircle(ballX, ballY, ballSize, 'white');
	}

	// Update the game state by moving the ball and controlling collisions.
	function move(): void {
		ballX += ballSpeedX;
		ballY += ballSpeedY;

		// Bounce off the top and bottom boundaries.
		if (ballY + ballSize > canvas.height || ballY - ballSize < 0) {
			ballSpeedY = -ballSpeedY;
		}

		// Check collision for the left paddle and score update.
		if (ballX - ballSize < 0) {
			if (ballY > player1Y && ballY < player1Y + paddleHeight) {
				ballSpeedX = -ballSpeedX;
				increaseBallSpeed();
			} else {
				player2Score++;
				updateScore();
				resetBall();
				checkWin();
			}
		}

		// Check collision for the right paddle and score update.
		if (ballX + ballSize > canvas.width) {
			if (ballY > player2Y && ballY < player2Y + paddleHeight) {
				ballSpeedX = -ballSpeedX;
				increaseBallSpeed();
			} else {
				player1Score++;
				updateScore();
				resetBall();
				checkWin();
			}
		}

		// An improved AI for the right paddle.
		const aiSpeed: number = 7;
		if (player2Y + paddleHeight / 2 < ballY - 35) {
			player2Y += aiSpeed;
		} else if (player2Y + paddleHeight / 2 > ballY + 35) {
			player2Y -= aiSpeed;
		}
	}

	// Reset the ball to the centre and reinitialize speeds.
	function resetBall(): void {
		ballX = canvas.width / 2;
		ballY = canvas.height / 2;
		ballSpeedX = initialBallSpeed;
		ballSpeedY = initialBallSpeed;
	}

	// Increment the ball's speed post-collision for an ever-escalating challenge.
	function increaseBallSpeed(): void {
		ballSpeedX += ballSpeedX > 0 ? speedIncrement : -speedIncrement;
		ballSpeedY += ballSpeedY > 0 ? speedIncrement : -speedIncrement;
	}

	// Update the score display in the DOM.
	function updateScore(): void {
		const scoreElement: HTMLElement | null = document.getElementById('score');
		if (scoreElement) {
			scoreElement.innerText = `Score: ${player1Score}:${player2Score}`;
		}
	}

	// Game loop: update state and re-render.
	function update(): void {
		move();
		draw();
	}

	// Start the game loop using setInterval.
	function startGame(): void {
		if (!gameInterval) {
			gameInterval = window.setInterval(update, 1000 / 60);
		}
	}

	// Reset the game to its initial state.
	function resetGame(): void {
		if (gameInterval !== null) {
			clearInterval(gameInterval);
			gameInterval = null;
		}
		player1Score = 0;
		player2Score = 0;
		updateScore();
		resetBall();
		draw();
	}

	// Check if either player has reached the winning score.
	function checkWin(): void {
		if (player1Score >= 5 || player2Score >= 5) {
			if (gameInterval !== null) {
				clearInterval(gameInterval);
				gameInterval = null;
			}
			const winner: string = player1Score >= 5 ? 'Player 1' : 'Player 2';
			alert(`${winner} wins!`);
			resetGame();
		}
	}

	// Listen for mouse movements over the canvas to control player 1's paddle.
	canvas.addEventListener('mousemove', (event: MouseEvent) => {
		const rect: DOMRect = canvas.getBoundingClientRect();
		const root: HTMLElement = document.documentElement;
		// Compute the correct mouse Y position.
		const mouseY: number = event.clientY - rect.top - root.scrollTop;
		player1Y = mouseY - paddleHeight / 2;
	});

	// Attach event listeners to the start and reset buttons, casting them appropriately.
	const startButton: HTMLButtonElement | null = document.getElementById('start-game') as HTMLButtonElement | null;
	const resetButton: HTMLButtonElement | null = document.getElementById('reset-game') as HTMLButtonElement | null;

	startButton?.addEventListener('click', startGame);
	resetButton?.addEventListener('click', resetGame);

	// Perform an initial draw to display the starting state of the game.
	draw();
})();
