export class BaseGame {
    constructor(config) {
        this.p = config.p; // Store p5 instance
        this.width = config.width;
        this.height = config.height;
        this.gameId = config.gameId;
        
        // Game state
        this.gameStarted = false;
        this.gameOver = false;
        this.showNameInput = false;
        this.showingLeaderboard = false;
        
        // UI state
        this.playerName = '';
        this.nameValidationMessage = '';
        this.nameValidationColor = null; // Will be initialized in setup
        this.highScores = [];
        
        // Play again button
        this.playAgainButton = {
            x: this.width/2,
            y: this.height - 100,
            width: 200,
            height: 50
        };
    }

    preload() {
        // Override in child classes to load assets
    }

    setup() {
        // Initialize colors
        this.nameValidationColor = this.p.color(0);
    }

    update() {
        // Override in child classes for game logic
    }

    draw() {
        // Override in child classes for rendering
    }

    drawInstructions() {
        this.p.background(200, 230, 255);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.textSize(48);
        this.p.fill(0);
        this.p.text('GAME TITLE', this.width/2, this.height/2 - 100);
        
        this.p.textSize(24);
        this.p.text('Click to start', this.width/2, this.height/2 + 100);
    }

    drawNameInput() {
        // Semi-transparent overlay
        this.p.fill(0, 0, 0, 100);
        this.p.rect(0, 0, this.width, this.height);
        
        // Input box
        this.p.fill(255);
        this.p.stroke(0);
        this.p.rect(this.width/2 - 200, this.height/2 - 25, 400, 50);
        
        // Player name
        this.p.fill(0);
        this.p.noStroke();
        this.p.textAlign(this.p.LEFT, this.p.CENTER);
        this.p.textSize(24);
        this.p.text(this.playerName + (this.p.frameCount % 60 < 30 ? '|' : ''), this.width/2 - 190, this.height/2);
        
        // Validation message
        if (this.nameValidationMessage) {
            this.p.fill(this.nameValidationColor);
            this.p.textAlign(this.p.CENTER, this.p.CENTER);
            this.p.text(this.nameValidationMessage, this.width/2, this.height/2 + 30);
        }
    }

    drawLeaderboard() {
        this.p.background(200, 230, 255);
        
        // Title
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.textSize(48);
        this.p.fill(0);
        this.p.text('HIGH SCORES', this.width/2, 100);
        
        // Scores
        this.p.textSize(24);
        for (let i = 0; i < this.highScores.length; i++) {
            const score = this.highScores[i];
            const y = 200 + i * 40;
            
            // Color code top 3
            if (i === 0) this.p.fill(255, 215, 0); // Gold
            else if (i === 1) this.p.fill(192, 192, 192); // Silver
            else if (i === 2) this.p.fill(205, 127, 50); // Bronze
            else this.p.fill(0); // Black
            
            this.p.text(`${i + 1}. ${score.player_name}: ${score.high_score.toFixed(1)}s`, this.width/2, y);
        }
        
        // Play again button
        this.drawPlayAgainButton();
    }

    drawPlayAgainButton() {
        // Button background
        this.p.fill(255);
        this.p.stroke(0);
        this.p.rect(
            this.playAgainButton.x - this.playAgainButton.width/2,
            this.playAgainButton.y - this.playAgainButton.height/2,
            this.playAgainButton.width,
            this.playAgainButton.height
        );
        
        // Button text
        this.p.fill(0);
        this.p.noStroke();
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.textSize(24);
        this.p.text('PLAY AGAIN', this.playAgainButton.x, this.playAgainButton.y);
    }

    isPlayAgainButtonClicked(x, y) {
        return (
            x >= this.playAgainButton.x - this.playAgainButton.width/2 &&
            x <= this.playAgainButton.x + this.playAgainButton.width/2 &&
            y >= this.playAgainButton.y - this.playAgainButton.height/2 &&
            y <= this.playAgainButton.y + this.playAgainButton.height/2
        );
    }

    async loadHighScores() {
        try {
            this.highScores = await window.gameConfig.loadGameHighScores(this.gameId);
        } catch (error) {
            console.error('Error loading high scores:', error);
            this.highScores = [];
        }
    }

    async saveHighScore() {
        try {
            const result = await window.gameConfig.saveGameHighScore(
                this.gameId,
                this.playerName,
                this.timeSurvived
            );
            
            if (result.success) {
                this.showNameInput = false;
                await this.loadHighScores();
                this.showingLeaderboard = true;
            } else {
                this.nameValidationMessage = result.message;
                this.nameValidationColor = this.p.color(255, 0, 0);
                setTimeout(() => {
                    this.nameValidationMessage = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Error saving high score:', error);
            this.nameValidationMessage = 'Failed to save high score';
            this.nameValidationColor = this.p.color(255, 0, 0);
            setTimeout(() => {
                this.nameValidationMessage = '';
            }, 2000);
        }
    }

    resetGame() {
        this.gameStarted = false;
        this.gameOver = false;
        this.showNameInput = false;
        this.showingLeaderboard = false;
        this.playerName = '';
        this.nameValidationMessage = '';
    }
} 