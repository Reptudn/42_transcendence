# 🏓 42 Transcendence - Overengineered Pong

A modern, full-stack implementation of the classic Pong game built as the final project for 42 School. This project demonstrates advanced web development concepts including real-time multiplayer gaming, AI opponents, tournament systems, and comprehensive user management.

## 🌟 Features

### 🎮 Game Modes
- **Local Multiplayer**: Play with friends on the same device
- **Remote Multiplayer**: Challenge players from anywhere in the world
- **AI Opponents**: Battle against intelligent AI with adaptive difficulty
- **Tournament System**: Organize and participate in structured tournaments
- **Multiple Players**: Support for more than 2 players simultaneously

### 🎨 Game Customization
- Power-ups and special attacks
- Multiple game maps and environments
- Customizable paddle speeds and game physics
- User-friendly settings interface
- Default classic mode for purists

### 👤 User Management
- **Secure Authentication**: Registration, login, and session management
- **OAuth Integration**: Login with Google
- **Two-Factor Authentication (2FA)**: Enhanced security with JWT tokens
- **User Profiles**: Avatars, display names, bios, and statistics
- **Friends System**: Add friends and see online status
- **Match History**: Detailed game statistics and performance tracking

### 💬 Social Features
- **Live Chat**: Real-time messaging between users
- **Direct Messages**: Private conversations
- **Profile Access**: View other players' profiles through chat
- **Tournament Notifications**: Stay updated on upcoming matches

### 📊 Statistics & Analytics
- **User Dashboard**: Personal gaming statistics and achievements
- **Game Analytics**: Detailed match outcomes and historical data
- **Visual Charts**: Data visualization for performance tracking
- **Match History**: Complete record of all games played

### 🔒 Security
- **HTTPS/WSS**: Secure connections for all communications
- **Password Hashing**: Strong encryption for user credentials
- **SQL Injection Protection**: Secure database queries
- **XSS Prevention**: Protected against cross-site scripting
- **Route Protection**: Authenticated access to sensitive areas
- **Environment Security**: Secure configuration management

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Fastify
- **Database**: SQLite
- **Authentication**: JWT with 2FA support
- **Real-time**: WebSocket (WSS)

### Frontend
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Architecture**: Single Page Application (SPA)
- **Browser Support**: Latest stable Firefox and modern browsers

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **Development**: Hot reload and development containers

## 📋 Available Commands

Use `make` to see all available commands:

- `make start` - Start the application
- `make stop` - Stop all services
- `make build` - Build Docker images
- `make logs` - View application logs
- `make clean` - Clean up containers and images

## 🎯 Project Goals

This project implements all major modules required for the 42 Transcendence project:

1. **Backend Framework** ✅ - Fastify with Node.js
2. **User Management** ✅ - Complete authentication system
3. **Remote Authentication** ✅ - Google OAuth integration
4. **Remote Players** ✅ - Real-time multiplayer gaming
5. **Multiple Players** ✅ - Support for 2+ players
6. **Live Chat** ✅ - Real-time communication
7. **AI Opponent** ✅ - Intelligent game AI
8. **Two-Factor Authentication** ✅ - Enhanced security
9. **Game Customization** ✅ - Power-ups and custom maps

**Score: 10/9 Major Modules** 🎉

## 🏆 Tournament System

- **Bracket Management**: Automatic tournament bracket generation
- **Match Scheduling**: Turn-based player progression
- **Live Updates**: Real-time tournament status
- **Player Notifications**: Alerts for upcoming matches
- **Results Tracking**: Complete tournament history

## 🤖 AI Implementation

The AI opponent features:
- **Human-like Behavior**: Simulates keyboard input with realistic timing
- **Adaptive Difficulty**: Adjusts to player skill level
- **Strategic Decision Making**: Intelligent positioning and movement
- **Power-up Utilization**: Uses game modifications effectively
- **Performance Optimization**: Efficient game state analysis

## 📁 Project Structure

```
42_transcendence/
├── app/                    # Main application code
├── nginx/                  # Nginx configuration
├── .devcontainer/         # Development container setup
├── docker-compose.yml     # Multi-container setup
├── Dockerfile            # Application container
├── Makefile             # Build and run commands
├── package.json         # Node.js dependencies
└── README.md           # This file
```

## 📄 License

This project is part of the 42 School curriculum. Please respect the academic integrity policies of 42 School.

## 🎓 42 School Project

**Project**: ft_transcendence  
**School**: 42 Heilbronn  
**Topics**: `42` `42heilbronn` `42transcendence` `transcendence`

---

*"The last project of the common core - where we overengineer Pong to perfection!"* 🚀

## 🔗 Links

- [42 School](https://42.fr/)
- [Project Subject](./en.subject.pdf)
- [Fastify Documentation](https://fastify.dev/)
- [Docker Documentation](https://docs.docker.com/)
