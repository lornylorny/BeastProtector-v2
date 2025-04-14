import { BaseGame } from './BaseGame.js';

export class BaseProtector extends BaseGame {
    constructor(config) {
        super(config);
        console.log('BaseProtector initialized with config:', {
            width: config.width,
            height: config.height,
            gameId: config.gameId
        });
        
        // Game objects
        this.player = {
            x: 0,
            y: 0,
            speed: 5,
            size: 50
        };
        
        this.projectiles = [];
        this.targets = [];
        
        // Game settings
        this.spawnRate = 60;
        this.frameCount = 0;
        this.difficultyMultiplier = 1;
        
        // Customizable properties
        this.projectileSpeed = config.projectileSpeed || 7;
        this.targetSpeed = config.targetSpeed || 3;
        this.assets = config.assets || {};

        // Game state (use parent class state)
        this.gameId = config.gameId;
        
        // UI state
        this.cursorVisible = true;
        this.lastCursorBlink = 0;
        this.cursorBlinkInterval = 500;
        this.nameValidationMessage = '';
        this.nameValidationColor = { r: 0, g: 0, b: 0 };
        
        // Button dimensions
        this.playAgainButton = {
            x: this.width/2 - 100,
            y: this.height - 100,
            width: 200,
            height: 50
        };

        // Protector-specific state
        this.timeSurvived = 0;
        this.playerName = '';
        this.maxNameLength = 20;

        console.log('Initial game state:', {
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            showNameInput: this.showNameInput,
            showingLeaderboard: this.showingLeaderboard
        });
    }

    setup() {
        console.log('BaseProtector setup called');
        super.setup();
        this.player.x = this.width / 2;
        this.player.y = this.height - 100;
    }

    update() {
        if (!this.gameStarted || this.gameOver) {
            console.log('Game not updating. State:', {
                gameStarted: this.gameStarted,
                gameOver: this.gameOver
            });
            return;
        }
        
        // Update timer
        this.timeSurvived += this.p.deltaTime / 1000;
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            proj.y -= this.projectileSpeed;
            return proj.y > 0;
        });

        // Spawn and update targets
        if (this.frameCount % this.spawnRate === 0) {
            this.spawnTarget();
        }
        
        this.targets = this.targets.filter(target => {
            target.y += this.targetSpeed * this.difficultyMultiplier;
            return target.y < this.height;
        });

        // Check collisions
        this.checkCollisions();
        
        // Increase difficulty over time
        if (this.frameCount % 1000 === 0) {
            this.difficultyMultiplier += 0.1;
        }
        
        this.frameCount++;
    }

    draw() {
        this.p.background(200, 230, 255);
        
        if (!this.gameStarted) {
            console.log('Drawing instructions');
            this.drawInstructions();
            return;
        }
        
        if (this.showNameInput) {
            console.log('Drawing name input');
            this.drawNameInput();
            return;
        }
        
        if (this.showingLeaderboard) {
            console.log('Drawing leaderboard');
            this.drawLeaderboard();
            return;
        }
        
        // Draw game elements
        this.drawGameElements();
        
        // Draw HUD
        this.drawHUD();
    }

    drawInstructions() {
        this.p.background(200, 230, 255);
        
        this.p.textSize(48);
        this.p.fill(0);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text('BREAST PROTECTOR', this.width/2, this.height/2 - 100);
        
        this.p.textSize(24);
        this.p.text('Move the mouse to avoid grabby hands!', this.width/2, this.height/2 - 50);
        this.p.text('Survive as long as you can', this.width/2, this.height/2);
        this.p.text('Click anywhere to start', this.width/2, this.height/2 + 50);
    }

    drawGameElements() {
        // Draw target (player)
        this.p.push();
        this.p.translate(this.player.x, this.player.y);
        this.p.fill(255, 150, 150);
        this.p.stroke(0);
        this.p.ellipse(0, 0, this.player.size, this.player.size);
        this.p.pop();
        
        // Draw projectiles
        this.p.fill(255, 0, 0);
        this.projectiles.forEach(proj => {
            this.p.circle(proj.x, proj.y, 10);
        });
        
        // Draw targets
        this.p.fill(0, 0, 255);
        this.targets.forEach(target => {
            this.p.circle(target.x, target.y, 30);
        });
    }

    drawHUD() {
        // Draw timer
        this.p.textAlign(this.p.LEFT, this.p.TOP);
        this.p.textSize(24);
        this.p.fill(0);
        this.p.text(`Time: ${this.timeSurvived.toFixed(1)}s`, 20, 20);
    }

    spawnTarget() {
        this.targets.push({
            x: this.p.random(50, this.width - 50),
            y: 0
        });
    }

    mousePressed() {
        if (!this.gameStarted && !this.showNameInput && !this.showingLeaderboard) {
            this.gameStarted = true;
            return;
        }
        
        if (this.showingLeaderboard && this.isPlayAgainButtonClicked(this.p.mouseX, this.p.mouseY)) {
            this.resetGame();
        }
    }

    mouseMoved() {
        if (this.gameStarted && !this.gameOver) {
            this.player.x = this.p.constrain(this.p.mouseX, this.player.size/2, this.width - this.player.size/2);
            this.player.y = this.p.constrain(this.p.mouseY, this.player.size/2, this.height - this.player.size/2);
        }
    }

    async handleGameOver() {
        this.gameOver = true;
        const isHighScore = await this.checkHighScore(this.timeSurvived);
        if (isHighScore) {
            this.showNameInput = true;
            this.playerName = '';
        } else {
            this.showingLeaderboard = true;
            await this.loadHighScores();
        }
    }

    async checkHighScore(score) {
        try {
            const { data: userScores, error } = await window.supabase
                .from('leaderboard')
                .select('high_score')
                .eq('user_id', window.supabase.auth.user()?.id)
                .eq('game_id', this.gameId)
                .order('high_score', { ascending: false })
                .limit(3);

            if (error) {
                console.error('Error checking user scores:', error);
                return false;
            }

            // If user has less than 3 scores, this score qualifies
            if (!userScores || userScores.length < 3) {
                console.log('User has less than 3 scores, new score qualifies');
                return true;
            }

            // Convert time to integer (multiply by 10 to keep one decimal place)
            const intScore = Math.round(score * 10);
            
            // Check if this score beats their lowest top 3 score
            const lowestScore = userScores[userScores.length - 1].high_score;
            const isHighScore = intScore > lowestScore;
            console.log(`Comparing new score ${intScore} with lowest score ${lowestScore}: ${isHighScore}`);
            return isHighScore;
        } catch (error) {
            console.error('Error in checkHighScore:', error);
            return false;
        }
    }

    validateAndPreviewName(newName) {
        const validation = window.gameConfig.validatePlayerName(newName);
        if (!validation.isValid) {
            this.nameValidationMessage = validation.message;
            this.nameValidationColor = { r: 255, g: 0, b: 0 }; // Red for invalid
        } else {
            this.nameValidationMessage = 'Valid name!';
            this.nameValidationColor = { r: 0, g: 155, b: 0 }; // Green for valid
        }
        
        // Clear validation message after 2 seconds
        setTimeout(() => {
            this.nameValidationMessage = '';
            this.nameValidationColor = { r: 0, g: 0, b: 0 }; // Back to black
        }, 2000);
        
        return validation.isValid;
    }

    async keyPressed() {
        if (this.showNameInput) {
            if (this.p.keyCode === this.p.ENTER) {
                if (this.playerName.length > 0 && this.validateAndPreviewName(this.playerName)) {
                    const result = await window.gameConfig.saveGameHighScore(
                        this.gameId,
                        this.playerName,
                        Math.round(this.timeSurvived * 10)
                    );
                    if (result.success) {
                        console.log('High score saved!');
                        await this.loadHighScores(); // Reload the scores
                        this.showNameInput = false;
                        this.showingLeaderboard = true; // Show leaderboard instead of resetting
                    } else {
                        this.nameValidationMessage = result.message;
                        this.nameValidationColor = { r: 255, g: 0, b: 0 };
                    }
                }
            } else if (this.p.keyCode === this.p.BACKSPACE) {
                this.playerName = this.playerName.slice(0, -1);
                if (this.playerName.length > 0) {
                    this.validateAndPreviewName(this.playerName);
                } else {
                    this.nameValidationMessage = '';
                    this.nameValidationColor = { r: 0, g: 0, b: 0 };
                }
            } else if (this.p.key.length === 1 && /[A-Za-z0-9 ]/.test(this.p.key) && this.playerName.length < this.maxNameLength) {
                const newName = this.playerName + this.p.key.toUpperCase();
                this.validateAndPreviewName(newName);
                this.playerName = newName;
            }
        }
    }

    drawNameInput() {
        this.p.background(200, 230, 255);
        
        // Draw semi-transparent overlay
        this.p.fill(0, 0, 0, 100);
        this.p.rect(0, 0, this.width, this.height);
        
        this.p.textSize(32);
        this.p.fill(255);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text('NEW HIGH SCORE!', this.width/2, this.height/3 - 40);
        
        this.p.textSize(24);
        this.p.text('Enter your name:', this.width/2, this.height/3);
        
        // Draw name input box
        const inputWidth = 300;
        const inputHeight = 40;
        const inputX = this.width/2 - inputWidth/2;
        const inputY = this.height/3 + 30;
        
        this.p.fill(255);
        this.p.rect(inputX, inputY, inputWidth, inputHeight);
        
        // Draw entered name
        this.p.textAlign(this.p.LEFT, this.p.CENTER);
        this.p.fill(0);
        this.p.text(this.playerName, inputX + 10, inputY + inputHeight/2);
        
        // Draw blinking cursor
        if (this.cursorVisible) {
            const textWidth = this.p.textWidth(this.playerName);
            this.p.text('|', inputX + 10 + textWidth, inputY + inputHeight/2);
        }
        
        // Update cursor blink
        if (Date.now() - this.lastCursorBlink > this.cursorBlinkInterval) {
            this.cursorVisible = !this.cursorVisible;
            this.lastCursorBlink = Date.now();
        }
        
        // Draw validation message
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.fill(this.nameValidationColor.r, this.nameValidationColor.g, this.nameValidationColor.b);
        this.p.text(this.nameValidationMessage, this.width/2, inputY + inputHeight + 30);
    }

    drawLeaderboard() {
        this.p.background(200, 230, 255);
        
        // Draw title
        this.p.textSize(48);
        this.p.fill(0);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text('HIGH SCORES', this.width/2, 80);
        
        // Draw scores
        this.p.textSize(24);
        this.p.textAlign(this.p.LEFT, this.p.TOP);
        
        const scores = this.highScores || [];
        const startY = 150;
        const lineHeight = 40;
        
        scores.forEach((score, index) => {
            const y = startY + index * lineHeight;
            
            // Set color based on rank
            if (index === 0) this.p.fill(255, 215, 0); // Gold
            else if (index === 1) this.p.fill(192, 192, 192); // Silver
            else if (index === 2) this.p.fill(205, 127, 50); // Bronze
            else this.p.fill(0); // Black for others
            
            this.p.text(`${index + 1}. ${score.player_name}: ${(score.high_score/10).toFixed(1)}s`, this.width/2 - 150, y);
        });
        
        // Draw Play Again button
        this.p.fill(this.isPlayAgainButtonHovered() ? 150 : 200);
        this.p.rect(this.playAgainButton.x, this.playAgainButton.y, 
                   this.playAgainButton.width, this.playAgainButton.height);
        
        this.p.fill(0);
        this.p.textAlign(this.p.CENTER, this.p.CENTER);
        this.p.text('PLAY AGAIN', 
                   this.playAgainButton.x + this.playAgainButton.width/2, 
                   this.playAgainButton.y + this.playAgainButton.height/2);
    }

    isPlayAgainButtonHovered() {
        return this.p.mouseX >= this.playAgainButton.x && 
               this.p.mouseX <= this.playAgainButton.x + this.playAgainButton.width &&
               this.p.mouseY >= this.playAgainButton.y && 
               this.p.mouseY <= this.playAgainButton.y + this.playAgainButton.height;
    }

    resetGame() {
        this.gameStarted = false;
        this.gameOver = false;
        this.showNameInput = false;
        this.showingLeaderboard = false;
        this.timeSurvived = 0;
        this.playerName = '';
        this.nameValidationMessage = '';
        this.nameValidationColor = { r: 0, g: 0, b: 0 };
    }

    checkCollisions() {
        // Check projectile-target collisions
        this.projectiles.forEach((proj, projIndex) => {
            this.targets.forEach((target, targetIndex) => {
                const d = this.p.dist(proj.x, proj.y, target.x, target.y);
                if (d < 20) {
                    this.projectiles.splice(projIndex, 1);
                    this.targets.splice(targetIndex, 1);
                }
            });
        });

        // Check target-player collisions
        this.targets.forEach(target => {
            const d = this.p.dist(target.x, target.y, this.player.x, this.player.y);
            if (d < (this.player.size/2 + 15)) {
                this.gameOver = true;
                this.showNameInput = true;
            }
        });
    }
} 