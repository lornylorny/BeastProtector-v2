import { BaseProtector } from '../base/BaseProtector.js';
import { ScoreManager } from '../../shared/db/ScoreManager.js';
import { GameConfig } from '../../shared/config/config.js';

export class BreastProtectorV3 extends BaseProtector {
    constructor(p5, config) {
        // Ensure config has required properties
        const gameConfig = {
            width: config?.width || 800,
            height: config?.height || 600,
            gameId: config?.gameId || GameConfig.GAME_IDS.BREAST_PROTECTOR_V3.internal,
            frameRate: config?.frameRate || 60,
            userId: config?.userId,
            ...config
        };
        
        if (!gameConfig.userId) {
            throw new Error('User ID is required to initialize the game');
        }
        
        super(p5, gameConfig);
        
        // Game-specific properties
        this.breastSize = 50;
        this.breastSpacing = this.breastSize/3;
        this.handImage = null;
        this.breastsPlaced = false;
        this.userId = gameConfig.userId;
        
        // Add spawn-related properties
        this.initialHandCount = 3;
        this.baseSpawnRate = 5.0;
        this.minSpawnInterval = 2.0;
        this.spawnTimeReduction = 0.95;
        
        // Initialize score manager
        this.scoreManager = new ScoreManager({
            gameId: gameConfig.gameId,
            userId: gameConfig.userId
        });
    }
    
    async init() {
        await super.init();
        
        // Set initial state to loading
        this.state = {
            screen: 'loading',
            lastSpawnTime: Date.now(),
            gameOverTime: null,
            playerName: ''
        };
        
        try {
            await this.loadHighScores();
            
            // After loading is complete, go to title screen
            this.state.screen = 'title';
            
            // Initialize game properties
            this.targetX = this.p.width / 2;
            this.targetY = this.p.height / 2;
            this.enemies = [];
            this.timeSurvived = 0;
            this.difficultyLevel = 1;
            this.maxEnemies = 5;
            this.spawnRate = 5.0;
            this.isRunning = true;
            this.isPaused = false;
        } catch (error) {
            console.error('Error during initialization:', error);
            this.state.screen = 'error';
        }
    }
    
    async loadHighScores() {
        try {
            this.highScores = await this.scoreManager.loadHighScores();
            console.log('Loaded high scores:', this.highScores);
        } catch (error) {
            console.error('Error loading high scores:', error);
            this.highScores = [];
        }
    }
    
    preload() {
        this.handImage = this.p.loadImage('assets/images/hand.png');
    }
    
    spawnEnemy() {
        // Minimum safe distance from breasts (in pixels)
        const minSafeDistance = 200;
        
        // Position variables
        let x = 0;
        let y = 0;
        let safePosition = false;
        let attempts = 0;
        
        // Try to find a safe position
        while (!safePosition && attempts < 50) {
            x = Math.random() * this.p.width;
            y = Math.random() * this.p.height;
            
            // Calculate distance from both breasts
            const distanceLeft = this.p.dist(x, y, this.targetX - this.breastSpacing, this.targetY);
            const distanceRight = this.p.dist(x, y, this.targetX + this.breastSpacing, this.targetY);
            
            // Check if position is safe
            if (distanceLeft > minSafeDistance && distanceRight > minSafeDistance) {
                safePosition = true;
            }
            
            attempts++;
        }
        
        // Create enemy with improved movement properties
        const enemy = {
            x: x,
            y: y,
            size: Math.random() * 20 + 30, // Random size between 30-50
            speedX: Math.random() * 4 - 2, // Reduced initial speed range (-2 to 2)
            speedY: Math.random() * 4 - 2,
            rotation: Math.random() * this.p.TWO_PI,
            rotationSpeed: Math.random() * 0.02 - 0.01, // Reduced rotation speed
            // Properties for finger wiggling
            wiggleOffset: Math.random() * this.p.TWO_PI,
            wiggleSpeed: Math.random() * 0.1 + 0.05,
            wiggleAmount: Math.random() * 0.2 + 0.2,
            // New properties for smoother movement
            targetX: null,
            targetY: null,
            isRedirecting: false,
            redirectStartTime: null,
            redirectDuration: 1000, // 1 second to complete redirection
            baseSpeed: 2, // Base movement speed
            maxSpeed: 4  // Maximum speed after boosts
        };
        
        this.enemies.push(enemy);
    }
    
    checkCollision(enemy) {
        // Calculate the actual collision radius based on hand size
        const collisionRadius = enemy.size * 0.8; // Add a bit of leniency
        
        // Check collision with left breast
        const distanceLeft = this.p.dist(
            enemy.x, enemy.y,
            this.targetX - this.breastSpacing, this.targetY
        );
        if (distanceLeft < (collisionRadius + this.breastSize/2)) {
            return true;
        }
        
        // Check collision with right breast
        const distanceRight = this.p.dist(
            enemy.x, enemy.y,
            this.targetX + this.breastSpacing, this.targetY
        );
        if (distanceRight < (collisionRadius + this.breastSize/2)) {
            return true;
        }
        
        // Additional check for the space between breasts
        const distanceCenter = this.p.dist(
            enemy.x, enemy.y,
            this.targetX, this.targetY
        );
        if (distanceCenter < (collisionRadius + this.breastSize/3)) {
            return true;
        }
        
        return false;
    }
    
    drawTarget() {
        // Draw breasts exactly like the original game
        this.p.fill(255, 192, 203); // Pink color
        this.p.noStroke();
        
        // Left breast (slightly taller than wide, matching original 1.2 ratio)
        this.p.ellipse(
            this.targetX - this.breastSpacing,
            this.targetY,
            this.breastSize,
            this.breastSize * 1.2
        );
        
        // Right breast
        this.p.ellipse(
            this.targetX + this.breastSpacing,
            this.targetY,
            this.breastSize,
            this.breastSize * 1.2
        );
        
        // Draw areolas with slightly darker pink, exactly 1/3 size like original
        this.p.fill(255, 160, 180);
        this.p.circle(
            this.targetX - this.breastSpacing,
            this.targetY,
            this.breastSize/3
        );
        this.p.circle(
            this.targetX + this.breastSpacing,
            this.targetY,
            this.breastSize/3
        );
    }
    
    drawInstructionsScreen() {
        this.p.background(230, 240, 255);
        this.p.fill(0);
        this.p.textSize(24);
        this.p.textAlign(this.p.CENTER);
        this.p.text('Protect the breasts from the hands!', this.p.width/2, 100);
        this.p.textSize(16);
        this.p.text('Click to move the breasts', this.p.width/2, 150);
        this.p.text('Survive as long as possible', this.p.width/2, 180);
        
        // Draw play button
        this.p.fill(100, 200, 100);
        this.p.rect(this.p.width/2 - 100, 250, 200, 60, 10);
        this.p.fill(255);
        this.p.textSize(20);
        this.p.text('PLAY', this.p.width/2, 285);
    }
    
    drawNameInputScreen() {
        this.p.background(230, 240, 255);
        this.p.fill(0);
        this.p.textSize(32);
        this.p.textAlign(this.p.CENTER);
        this.p.text('New High Score!', this.p.width/2, 150);
        
        this.p.textSize(24);
        this.p.text(`Time Survived: ${this.timeSurvived.toFixed(1)}s`, this.p.width/2, 200);
        
        // Draw input box
        this.p.fill(255);
        this.p.stroke(0);
        this.p.rect(this.p.width/2 - 150, this.p.height/2 - 25, 300, 50, 10);
        
        // Draw entered name with proper alignment
        this.p.fill(0);
        this.p.noStroke();
        this.p.textSize(20);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text(this.state.playerName + '|', this.p.width/2, this.p.height/2);
        
        // Draw instructions
        this.p.textSize(16);
        this.p.text('Enter your name (max 10 characters)', this.p.width/2, this.p.height/2 + 50);
        this.p.text('Press ENTER when done', this.p.width/2, this.p.height/2 + 75);
    }
    
    drawLeaderboardScreen() {
        this.p.background(0);
        this.p.fill(255);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        
        // Larger text on mobile
        this.p.textSize(this.isMobile ? 40 : 32);
        this.p.text('High Scores', this.p.width/2, 50);
        
        // Scores with adjusted spacing for mobile
        this.p.textSize(this.isMobile ? 24 : 20);
        this.p.textAlign(this.p.LEFT, this.p.CENTER);
        const startY = 120;
        const lineHeight = this.isMobile ? 50 : 40;
        
        this.highScores.forEach((score, index) => {
            const y = startY + (index * lineHeight);
            this.p.text(`${index + 1}.`, this.p.width/4 - 50, y);
            this.p.text(score.name, this.p.width/4, y);
            const seconds = (score.score / 1000).toFixed(2);
            this.p.text(`${seconds}s`, this.p.width * 3/4, y);
        });
        
        // Larger play again button on mobile
        const buttonWidth = this.isMobile ? 240 : 200;
        const buttonHeight = this.isMobile ? 80 : 50;
        const buttonX = this.p.width/2 - buttonWidth/2;
        const buttonY = this.p.height - (this.isMobile ? 140 : 120);
        
        this.p.fill(100, 200, 100);
        this.p.rect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
        this.p.fill(255);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.textSize(this.isMobile ? 32 : 20);
        this.p.text('PLAY AGAIN', this.p.width/2, buttonY + buttonHeight/2);
    }
    
    async checkHighScore() {
        // Convert time to milliseconds for comparison
        const scoreInMs = Math.round(this.timeSurvived * 1000);
        
        // Use the score manager to check if this is a high score
        if (this.scoreManager.isHighScore(scoreInMs)) {
            this.state.screen = 'nameinput';
        } else {
            this.state.screen = 'leaderboard';
        }
    }

    async handleGameOver() {
        // Stop the game immediately
        this.isRunning = false;
        this.isPaused = true;
        
        // Store final score
        const finalScore = this.timeSurvived;
        
        this.state.screen = 'gameover';
        this.state.gameOverTime = Date.now();
        
        // Check if this is a high score
        await this.checkHighScore();
        
        console.log('Game over handled, new state:', this.state);
    }

    async handleKeyPressed(key) {
        if (this.state.screen === 'instructions' && key === ' ') {
            this.startGame();
        } else if (this.state.screen === 'gameover' && key === ' ') {
            this.state.screen = 'instructions';
        } else if (this.state.screen === 'nameinput') {
            if (key === 'Enter') {
                this.saveHighScore();
            } else if (key === 'Backspace') {
                this.state.playerName = this.state.playerName.slice(0, -1);
            } else if (key.length === 1 && this.state.playerName.length < 10) {
                // Only add alphanumeric characters and spaces, convert to uppercase
                if (/^[a-zA-Z0-9 ]$/.test(key)) {
                    this.state.playerName += key.toUpperCase();
                }
            }
        } else if (this.state.screen === 'leaderboard' && key === ' ') {
            this.state.screen = 'instructions';
        }
    }

    update(deltaTime) {
        if (!this.isRunning || this.isPaused) return;
        
        if (this.state.screen === 'playing') {
            this.timeSurvived += deltaTime;
            
            // Update spawn system
            this.updateSpawnSystem(deltaTime);
            
            // Update enemies
            this.updateEnemies(deltaTime);
            
            // Update difficulty
            this.updateDifficulty();
        }
    }

    updateSpawnSystem(deltaTime) {
        const now = Date.now();
        const timeSinceLastSpawn = (now - this.state.lastSpawnTime) / 1000;
        
        // Calculate current max enemies based on time
        const currentMaxEnemies = Math.min(this.maxEnemies, 3 + Math.floor(this.timeSurvived / 10));
        
        // Check if it's time to spawn and if we need more enemies
        if (timeSinceLastSpawn >= this.handSpawnInterval && this.enemies.length < currentMaxEnemies) {
            this.spawnEnemy();
            this.state.lastSpawnTime = now;
            
            // Calculate next spawn time
            this.handSpawnInterval = Math.max(
                this.minSpawnInterval,
                this.handSpawnInterval * this.spawnTimeReduction
            );
            
            console.log(`Spawned hand #${this.enemies.length}. Next spawn in ${this.handSpawnInterval.toFixed(1)}s`);
        }
    }

    updateEnemies(deltaTime) {
        const now = Date.now();
        
        // Process enemies in reverse order
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Update wiggle animation
            enemy.wiggleOffset += enemy.wiggleSpeed * deltaTime * 60;
            
            // Handle redirection
            if (enemy.isRedirecting) {
                const redirectProgress = Math.min(1, (now - enemy.redirectStartTime) / enemy.redirectDuration);
                
                if (redirectProgress >= 1) {
                    // Redirection complete
                    enemy.isRedirecting = false;
                } else {
                    // Smooth movement towards target using easing
                    const easeProgress = this.easeInOutQuad(redirectProgress);
                    const targetAngle = Math.atan2(
                        enemy.targetY - enemy.y,
                        enemy.targetX - enemy.x
                    );
                    
                    // Gradually adjust speed
                    const speed = enemy.baseSpeed + (enemy.maxSpeed - enemy.baseSpeed) * easeProgress;
                    enemy.speedX = Math.cos(targetAngle) * speed;
                    enemy.speedY = Math.sin(targetAngle) * speed;
                }
            }
            
            // Update position with normalized speed
            enemy.x += enemy.speedX * deltaTime * 60;
            enemy.y += enemy.speedY * deltaTime * 60;
            
            // Bounce off edges with smoother transition
            if (enemy.x < 0 || enemy.x > this.p.width) {
                enemy.speedX *= -0.8; // Reduce speed slightly on bounce
                enemy.x = Math.max(0, Math.min(enemy.x, this.p.width));
            }
            if (enemy.y < 0 || enemy.y > this.p.height) {
                enemy.speedY *= -0.8;
                enemy.y = Math.max(0, Math.min(enemy.y, this.p.height));
            }
            
            // Check for redirection (with reduced frequency based on difficulty)
            const redirectChance = Math.min(0.005 + (this.difficultyLevel - 1) * 0.002, 0.05) * deltaTime * 60;
            
            if (!enemy.isRedirecting && Math.random() < redirectChance) {
                // Calculate distances to breasts
                const distLeft = this.p.dist(
                    enemy.x, enemy.y,
                    this.targetX - this.breastSpacing, this.targetY
                );
                const distRight = this.p.dist(
                    enemy.x, enemy.y,
                    this.targetX + this.breastSpacing, this.targetY
                );
                
                // Target the closer breast
                enemy.targetX = distLeft < distRight ? 
                    this.targetX - this.breastSpacing : 
                    this.targetX + this.breastSpacing;
                enemy.targetY = this.targetY;
                
                // Start redirection
                enemy.isRedirecting = true;
                enemy.redirectStartTime = now;
            }
            
            // Check for collision
            if (this.checkCollision(enemy)) {
                this.enemies.splice(i, 1);
                this.handleGameOver();
                break;
            }
        }
    }

    drawGameScreen() {
        // Clear background
        this.p.background(230, 240, 255);
        
        // Draw breasts
        this.drawTarget();
        
        // Draw enemies (hands)
        for (const enemy of this.enemies) {
            this.drawEnemy(enemy);
        }
        
        // Draw game info
        this.drawGameInfo();
    }

    drawEnemy(enemy) {
        this.p.push();
        this.p.translate(enemy.x, enemy.y);
        
        // Apply base rotation
        this.p.rotate(enemy.rotation);
        
        // Apply finger wiggling
        const wiggleAngle = Math.sin(enemy.wiggleOffset) * enemy.wiggleAmount;
        this.p.rotate(wiggleAngle);
        
        // Visual feedback for redirection
        if (enemy.isRedirecting) {
            // Add glow effect
            this.p.drawingContext.shadowBlur = 20;
            this.p.drawingContext.shadowColor = 'rgba(255, 0, 0, 0.5)';
            
            // Add direction indicator
            const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
            this.p.stroke(255, 0, 0, 100);
            this.p.strokeWeight(2);
            this.p.line(0, 0, Math.cos(angle) * 30, Math.sin(angle) * 30);
        }
        
        // Draw hand image
        this.p.imageMode(this.p.CENTER);
        this.p.tint(255, 255, 255, 255);
        this.p.image(this.handImage, 0, 0, enemy.size * 2, enemy.size * 2);
        
        // Reset shadow if it was set
        if (enemy.isRedirecting) {
            this.p.drawingContext.shadowBlur = 0;
        }
        
        this.p.pop();
    }

    drawTitleScreen() {
        this.p.background(230, 240, 255);
        this.p.fill(0);
        this.p.textSize(40);
        this.p.textAlign(this.p.CENTER);
        this.p.text('Breast Protector V3', this.p.width/2, 100);
        
        // Draw play button
        this.p.fill(100, 200, 100);
        this.p.rect(this.p.width/2 - 100, this.p.height/2 - 30, 200, 60, 10);
        this.p.fill(255);
        this.p.textSize(20);
        this.p.text('PLAY', this.p.width/2, this.p.height/2 + 8);
    }

    drawLoadingScreen() {
        this.p.background(230, 240, 255);
        this.p.fill(0);
        this.p.textSize(24);
        this.p.textAlign(this.p.CENTER);
        this.p.text('Loading...', this.p.width/2, this.p.height/2);
    }

    drawErrorScreen() {
        this.p.background(230, 240, 255);
        this.p.fill(255, 0, 0);
        this.p.textSize(24);
        this.p.textAlign(this.p.CENTER);
        this.p.text('Error loading game', this.p.width/2, this.p.height/2);
        this.p.textSize(16);
        this.p.text('Please refresh the page', this.p.width/2, this.p.height/2 + 30);
    }

    draw() {
        switch (this.state.screen) {
            case 'loading':
                this.drawLoadingScreen();
                break;
            case 'error':
                this.drawErrorScreen();
                break;
            case 'title':
                this.drawTitleScreen();
                break;
            case 'instructions':
                this.drawInstructionsScreen();
                break;
            case 'playing':
                this.drawGameScreen();
                break;
            case 'gameover':
                this.drawGameOverScreen();
                break;
            case 'nameinput':
                this.drawNameInputScreen();
                break;
            case 'leaderboard':
                this.drawLeaderboardScreen();
                break;
            default:
                console.error('Unknown screen state:', this.state.screen);
                this.drawErrorScreen();
        }
    }

    async saveHighScore() {
        // Convert time to milliseconds for storage (as integer)
        const scoreInMs = Math.round(this.timeSurvived * 1000);
        
        console.log(`Saving high score for ${this.state.playerName}: ${scoreInMs}`);
        
        try {
            const result = await this.scoreManager.saveScore(
                this.state.playerName || 'Anonymous', 
                scoreInMs,
                this.userId
            );
            
            if (result.success) {
                console.log('High score saved successfully!');
                // Update high scores
                await this.loadHighScores();
            } else {
                console.error('Failed to save high score:', result.error);
            }
            
            // Show leaderboard regardless of success
            this.state.screen = 'leaderboard';
        } catch (error) {
            console.error('Failed to save high score:', error);
            // Still show leaderboard even if save failed
            this.state.screen = 'leaderboard';
        }
    }

    handlePointer(x, y) {
        if (this.state.screen === 'title') {
            // Check if click is within play button bounds
            const buttonX = this.p.width/2 - 100;
            const buttonY = this.p.height/2 - 30;
            const buttonWidth = 200;
            const buttonHeight = 60;
            
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= buttonY && y <= buttonY + buttonHeight) {
                this.startGame();
            }
        } else if (this.state.screen === 'leaderboard') {
            // Check if click is within play again button bounds
            const buttonWidth = 200;
            const buttonHeight = 50;
            const buttonX = this.p.width/2 - buttonWidth/2;
            const buttonY = this.p.height - 120;
            
            if (x >= buttonX && x <= buttonX + buttonWidth &&
                y >= buttonY && y <= buttonY + buttonHeight) {
                this.startGame();
            }
        } else if (this.state.screen === 'playing') {
            // Update breast position
            this.targetX = x;
            this.targetY = y;
        }
    }

    startGame() {
        // Reset game state
        this.state.screen = 'playing';
        this.enemies = [];
        this.timeSurvived = 0;
        this.handSpawnInterval = this.baseSpawnRate;
        this.lastSpawnTime = Date.now();
        this.nextSpawnTime = 0;
        this.state.lastSpawnTime = Date.now();
        this.isRunning = true;
        this.isPaused = false;
        this.difficultyLevel = 1;
        
        // Reset target position
        this.targetX = this.p.width / 2;
        this.targetY = this.p.height / 2;
        
        // Spawn initial enemies
        for (let i = 0; i < this.initialHandCount; i++) {
            this.spawnEnemy();
        }
        
        console.log('Game started with state:', this.state);
    }

    updateDifficulty() {
        // Increase difficulty level every 15 seconds
        const currentLevel = 1 + Math.floor(this.timeSurvived / 15);
        
        if (currentLevel !== this.difficultyLevel) {
            this.difficultyLevel = currentLevel;
            
            // Log difficulty change
            console.log(`Difficulty increased to level ${this.difficultyLevel}`);
            console.log(`Current enemies: ${this.enemies.length}`);
            console.log(`Max enemies allowed: ${this.calculateMaxEnemies()}`);
            console.log(`Spawn interval: ${this.handSpawnInterval.toFixed(1)}s`);
        }
    }

    calculateMaxEnemies() {
        // Start with 3 hands, add 1 every 10 seconds up to max
        return Math.min(this.maxEnemies, 3 + Math.floor(this.timeSurvived / 10));
    }

    drawGameInfo() {
        this.p.fill(0);
        this.p.textSize(24);
        this.p.textAlign(this.p.LEFT, this.p.TOP);
        const padding = 20;
        this.p.text(`Time: ${this.timeSurvived.toFixed(1)}s`, padding, padding);
        this.p.text(`Hands: ${this.enemies.length}`, padding, padding + 30);
    }

    // Utility function for smooth movement
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
}