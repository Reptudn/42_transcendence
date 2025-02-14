const canvas = document.getElementById('pong-game');
const context = canvas.getContext('2d');

const paddleWidth = 10;
const paddleHeight = 100;
const ballSize = 10;
const initialBallSpeed = 5;
const speedIncrement = 0.1;

let player1Y = canvas.height / 2 - paddleHeight / 2;
let player2Y = canvas.height / 2 - paddleHeight / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = initialBallSpeed;
let ballSpeedY = initialBallSpeed;

let player1Score = 0;
let player2Score = 0;

let gameInterval;

console.log("Pong script loaded");

function drawRect(x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function drawCircle(x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2, true);
  context.closePath();
  context.fill();
}

function drawNet() {
  for (let i = 0; i < canvas.height; i += 20) {
    drawRect(canvas.width / 2 - 1, i, 2, 10, 'white');
  }
}

function draw() {
  drawRect(0, 0, canvas.width, canvas.height, 'black');
  drawNet();
  drawRect(0, player1Y, paddleWidth, paddleHeight, 'white');
  drawRect(canvas.width - paddleWidth, player2Y, paddleWidth, paddleHeight, 'white');
  drawCircle(ballX, ballY, ballSize, 'white');
}

function move() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;

  if (ballY + ballSize > canvas.height || ballY - ballSize < 0) {
    ballSpeedY = -ballSpeedY;
  }

  if (ballX - ballSize < 0) {
    if (ballY > player1Y && ballY < player1Y + paddleHeight) {
      ballSpeedX = -ballSpeedX;
      increaseBallSpeed();
    } else {
      player2Score++;
      updateScore();
      resetBall();
    }
  }

  if (ballX + ballSize > canvas.width) {
    if (ballY > player2Y && ballY < player2Y + paddleHeight) {
      ballSpeedX = -ballSpeedX;
      increaseBallSpeed();
    } else {
      player1Score++;
      updateScore();
      resetBall();
    }
  }

  // Improved AI for player 2
  const aiSpeed = 4;
  if (player2Y + paddleHeight / 2 < ballY - 35) {
    player2Y += aiSpeed;
  } else if (player2Y + paddleHeight / 2 > ballY + 35) {
    player2Y -= aiSpeed;
  }
}

function resetBall() {
  ballX = canvas.width / 2;
  ballY = canvas.height / 2;
  ballSpeedX = initialBallSpeed;
  ballSpeedY = initialBallSpeed;
}

function increaseBallSpeed() {
  ballSpeedX += ballSpeedX > 0 ? speedIncrement : -speedIncrement;
  ballSpeedY += ballSpeedY > 0 ? speedIncrement : -speedIncrement;
}

function updateScore() {
  document.getElementById('score').innerText = `Score: ${player1Score}:${player2Score}`;
}

function update() {
  move();
  draw();
}

function startGame() {
  if (!gameInterval) {
    gameInterval = setInterval(update, 1000 / 60);
  }
}

function resetGame() {
  clearInterval(gameInterval);
  gameInterval = null;
  player1Score = 0;
  player2Score = 0;
  updateScore();
  resetBall();
  draw();
}

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const root = document.documentElement;
  const mouseY = event.clientY - rect.top - root.scrollTop;
  player1Y = mouseY - paddleHeight / 2;
});

document.getElementById('start-game').addEventListener('click', startGame);
document.getElementById('reset-game').addEventListener('click', resetGame);

// Initial draw to show the game state before starting
draw();