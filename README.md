# Transcendence

## How to run

### With Docker

1. Have docker running
2. Run `make` to see all the available commands
3. Basic start with `make start`
4. Have fun ponging :D

### Without Docker

1. Run `npm install` in the root project directory
2. Start the server with `npm run start`
3. Have fun :D

# Features

## General

-   [ ] using TypeScript
-   [ ] Single Page Application (SPA) with working forward and backwards buttons
-   [ ] Compatible with the latest stable Firefox version
-   [ ] Must be deployed with Docker

### Pong

-   [ ] Local Players
-   [ ] Remote Players
-   [ ] AI Players
-   [ ] Server Side Pong (everything is calculated on the server and send as a state to the clients)
-   [ ] All Players (no matter what type) have to have the same settings e.g. same paddle speed

### Tournament System

-   [ ] Players have to take turn playing against each other
-   [ ] Next Match has to be announced
-   [ ] Display who is and who will play against who

### Security

-   [ ] Any password stored in the database, if applicable, must be hashed.
-   [ ] Must be protected against SQL Injections and XSS Attacks
-   [ ] The Backend must run secure with HTTPS
-   [ ] The Sockets must use WSS instead of just WS
-   [ ] Ensure routes are protected
-   [ ] String password hashing algo
-   [ ] Env stuff must be in a .env file and ignored by Git

## Modules (7 major for mandatory | 9 major for bonus)

> 2 minor modules count as one major module

### Web

#### Backend Framework (Major)

-   [ ] Fastify
-   [ ] Node.js

#### Frontend Framework (Minor)

-   [ ] Tailwind CSS

#### Database (Minor)

-   [ ] SQLite

### User Management

#### Standard user management, authentication and users across tournaments (Major)

-   [ ] Users can securely subscribe to the website.
-   [ ] Registered users can securely log in.
-   [ ] Users can select a unique display name to participate in tournaments.
-   [ ] Users can update their information.
-   [ ] Users can upload an avatar, with a default option if none is provided.
-   [ ] Users can add others as friends and view their online status.
-   [ ] User profiles display stats, such as wins and losses.
-   [ ] Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.
    > The management of duplicate usernames/emails is at your discretion;
    > please ensure a logical solution in provided.

#### Remote Auth with Google (Major)

-   [ ] Obtain the necessary credentials and permissions from the authority to enable secure login.
-   [ ] Implement user-friendly login and authorization flows that adhere to best practices and security standards.
-   [ ] Ensure the secure exchange of authentication tokens and user information between the web application and the authentication provider.

### Gameplay and UX

#### Remote Players (Major)

-   [ ] Consider network issues, such as unexpected disconnections or lag. You must offer the best user experience possible.
-   [ ] Players can play remotely on completely different machines

#### Multiple Players (Major)

-   [ ] More than 2 Players need to be able to play together (max player amount is on us)

#### Game Customization (Minor)

-   [ ] Offer customization features, such as power-ups, attacks, or different maps, that enhance the gameplay experience.
-   [ ] Allow users to choose a default version of the game with basic features if they prefer a simpler experience.
-   [ ] Ensure that customization options are available and applicable to all games offered on the platform.
-   [ ] Implement user-friendly settings menus or interfaces for adjusting game parameters.
-   [ ] Maintain consistency in customization features across all games to provide a unified user experience.

#### Live Chat (Major)

-   [ ] The user should be able to send direct messages to other users.
-   [ ] The user should be able to block other users, preventing them from seeing any further messages from the blocked account.
-   [ ] The user should be able to invite other users to play a Pong game through the chat interface.
-   [ ] The tournament system should be able to notify users about the next game.
-   [ ] The user should be able to access other players’ profiles through the chat interface.

### AI-Algo

#### Introduce AI Opponent (Major)

> You will need to explain in detail how your AI works during your
> evaluation. Creating an AI that does nothing is strictly prohibited;
> it must have the capability to win occasionally

-   [ ] Develop an AI opponent that provides a challenging and engaging gameplay
        experience for users.
-   [ ] The AI must replicate human behavior, which means that in your AI implementation, you must simulate keyboard input. The constraint here is that the AI can only refresh its view of the game once per second, requiring it to anticipate bounces and other actions.
-   [ ] The AI must utilize power-ups if you have chosen to implement the Game customization options module.
-   [ ] Implement AI logic and decision-making processes that enable the AI player to make intelligent and strategic moves.
-   [ ] Explore alternative algorithms and techniques to create an effective AI player without relying on A\*.
-   [ ] Ensure that the AI adapts to different gameplay scenarios and user interactions.

#### User and Game Stats Dashboard (Minor)

> Create user-friendly dashboards that provide users with insights into their gaming statistics.

-   [ ] Develop a separate dashboard for game sessions, showing detailed statistics, outcomes, and historical data for each match.
-   [ ] Ensure that the dashboards offer an intuitive and informative user interface for tracking and analyzing data.
-   [ ] Implement data visualization techniques, such as charts and graphs, to present statistics in a clear and visually appealing manner.
-   [ ] Allow users to access and explore their own gaming history and performance metrics conveniently.
-   [ ] Feel free to add any metrics you deem useful.

### Cyber Security

#### Two-Factor Authentication (2FA) and JWT. (Major)

-   [ ] Implement Two-Factor Authentication (2FA) as an additional layer of security for user accounts, requiring users to provide a secondary verification method, such as a one-time code, in addition to their password.
-   [ ] Utilize JSON Web Tokens (JWT) as a secure method for authentication and authorization, ensuring that user sessions and access to resources are managed securely.
-   [ ] Provide a user-friendly setup process for enabling 2FA, with options for SMS codes, authenticator apps, or email-based verification.
-   [ ] Ensure that JWT tokens are issued and validated securely to prevent unauthorized access to user accounts and sensitive data.

# Other Things non subject related

### map making rules

-   paddle paths should always go from left to right or from up to down, otherwise keybinds will become unintuitive

-   squares should be avoided, as the balls bounce boringly. if unavoidable, obstacles are important on non-easy difficulties

### restraints

-   password (8 - 32)
-   username (under 16)
-   display name (under 16)
-   bio (under 1024)
-   profile picture (under 1mb)

> can we please add this i think it's cool -> https://www.youtube.com/watch?v=5pPMvFGJPCs

# Fastify

-   [Plugins](https://fastify.dev/ecosystem/)
