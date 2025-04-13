# Breast Protector Game

A fun and challenging browser-based game where you protect breasts from groping hands. Built with p5.js and Supabase for authentication and leaderboard functionality.

## Features

- Real-time gameplay with increasing difficulty
- User authentication system
- Global leaderboard with top 10 scores
- Mobile-friendly with touch controls
- Name validation with profanity filter
- Responsive design

## Technologies Used

- p5.js for game graphics and interaction
- Supabase for backend (authentication and leaderboard)
- JavaScript (ES6+)

## Setup

1. Clone the repository
2. Set up your Supabase project and update the credentials in `auth.js`
3. Host the files on a web server (or use `python -m http.server 8000` for local testing)
4. Open `index.html` in your browser

## Controls

- Desktop: Use mouse to move
- Mobile: Touch screen to move
- Enter your name using keyboard (desktop) or virtual keyboard (mobile)

## Game Rules

- Move the breasts to avoid the groping hands
- Survive as long as possible
- Score is based on time survived
- Top 3 scores per user are saved
- Global leaderboard shows top 10 scores

## Files

- `index.html` - Main HTML file
- `sketch.js` - Main game logic
- `auth.js` - Authentication handling
- `config.js` - Game configuration and validation
- `images/hand.png` - Hand sprite
- `migrations/` - Supabase database migrations

## Contributing

Feel free to submit issues and enhancement requests! 