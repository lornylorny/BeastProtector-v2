import { initConfig, GameConfig } from '../../shared/config/config.js';
import { initAuth } from '../../core/auth/auth.js';
import { GameDatabase } from '../../shared/db/GameDatabase.js';
import { BreastProtectorV3 } from './BreastProtectorV3.js';

let game = null;

// Initialize game
async function initGame() {
    try {
        // 1. Initialize config and get instances
        const { supabase, gameConfig } = await initConfig();
        console.log('Config initialized:', gameConfig.GAME_IDS);

        // 2. Initialize auth and wait for initial state
        await initAuth();
        console.log('Auth initialized');

        // 3. Wait for user ID to be available
        if (!window.GAME_USER_ID) {
            console.log('Waiting for user authentication...');
            return;
        }

        // 4. Initialize GameDatabase
        await GameDatabase.init();
        console.log('GameDatabase initialized');

        // 5. Create p5 instance
        createP5Instance();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = '<p style="color: red;">Failed to initialize game. Please check console for details.</p>';
    }
}

// Create and initialize p5 instance
function createP5Instance() {
    const sketch = (p) => {
        let handImage;

        p.preload = function() {
            // Preload assets
            handImage = p.loadImage('assets/images/hand.png');
        };

        p.setup = async function() {
            // Create canvas and add it to the container
            const canvas = p.createCanvas(800, 600);
            canvas.parent('game-container');
            
            // Set frame rate
            p.frameRate(60);
            
            // Get current user ID from window context
            const userId = window.GAME_USER_ID;
            
            if (!userId) {
                console.log('No user ID available, showing login form');
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('game-container').style.display = 'none';
                return;
            }

            try {
                // Show loading state
                p.background(255);
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(20);
                p.text('Loading game...', p.width/2, p.height/2);
                
                // Initialize game with standardized game ID
                game = new BreastProtectorV3(p, {
                    userId: userId,
                    gameId: GameConfig.GAME_IDS.BREAST_PROTECTOR_V3.internal
                });
                
                // Preload assets
                game.handImage = handImage;
                if (!game.handImage || !game.handImage.width) {
                    throw new Error('Failed to load game assets');
                }
                
                // Initialize game
                await game.init();
                
                // Show game container only after successful initialization
                document.getElementById('game-container').style.display = 'block';
                document.getElementById('loginForm').style.display = 'none';
            } catch (error) {
                console.error('Failed to initialize game:', error);
                p.background(255);
                p.fill(255, 0, 0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(20);
                p.text('Failed to initialize game: ' + error.message, p.width/2, p.height/2);
                p.textSize(16);
                p.text('Please try refreshing the page', p.width/2, p.height/2 + 30);
            }
        };

        p.draw = function() {
            if (!game) return;
            
            try {
                // Game loop with fixed time step
                const fixedTimeStep = 1/60; // 60 FPS
                game.update(fixedTimeStep);
                game.draw();
            } catch (error) {
                console.error('Game error:', error);
                // Show error on canvas
                p.background(255);
                p.fill(255, 0, 0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(20);
                p.text('Game error: ' + error.message, p.width/2, p.height/2);
            }
        };

        p.mousePressed = function() {
            if (game) game.handlePointer(p.mouseX, p.mouseY);
        };

        p.mouseMoved = function() {
            if (game && game.state.screen === 'playing' && game.breastsMoving) {
                game.handlePointer(p.mouseX, p.mouseY);
            }
        };

        p.keyPressed = function(event) {
            if (!game) return;
            // Prevent default behavior for certain keys
            if (event.key === 'Enter' || event.key === 'Backspace') {
                event.preventDefault();
            }
            game.handleKeyPressed(event.key);
            return false;
        };

        // Touch events
        p.touchStarted = function() {
            if (game) game.handlePointer(p.mouseX, p.mouseY);
            return false;
        };

        p.touchMoved = function() {
            if (game && game.state.screen === 'playing' && game.breastsMoving) {
                game.handlePointer(p.mouseX, p.mouseY);
            }
            return false;
        };
    };

    // Start the p5 sketch
    new p5(sketch);
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame); 