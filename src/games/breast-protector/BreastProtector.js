import { BaseProtector } from '../base/BaseProtector.js';

class Hand {
    constructor(x, y, speed, handImage, target, canvasWidth, canvasHeight) {
        // Minimum safe distance from breasts (in pixels)
        const minSafeDistance = 200;
        
        // Try to find a safe spawn position
        let attempts = 0;
        let safePosition = false;
        
        while (!safePosition && attempts < 50) {
            this.x = x || Math.random() * canvasWidth;
            this.y = y || Math.random() * canvasHeight;
            
            // Calculate distance from both breasts
            let distanceLeft = Math.sqrt(
                Math.pow(this.x - (canvasWidth/2 - target.size/3), 2) +
                Math.pow(this.y - canvasHeight/2, 2)
            );
            let distanceRight = Math.sqrt(
                Math.pow(this.x - (canvasWidth/2 + target.size/3), 2) +
                Math.pow(this.y - canvasHeight/2, 2)
            );
            
            // Check if position is safe
            if (distanceLeft > minSafeDistance && distanceRight > minSafeDistance) {
                safePosition = true;
            }
            
            attempts++;
        }
        
        // If we couldn't find a safe position after 50 attempts, just use the last position
        this.speedX = (Math.random() - 0.5) * speed * 2;
        this.speedY = (Math.random() - 0.5) * speed * 2;
        this.size = 40; // Fixed size for consistency
        this.active = true;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.handImage = handImage;
        
        // Store canvas dimensions for bounds checking
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Properties for finger wiggling
        this.wiggleOffset = Math.random() * Math.PI * 2;
        this.wiggleSpeed = Math.random() * (0.15 - 0.05) + 0.05;
        this.wiggleAmount = Math.random() * (0.4 - 0.2) + 0.2;
    }

    draw(p) {
        if (!this.active) return;
        
        p.push();
        p.translate(this.x, this.y);
        
        // Apply base rotation
        p.rotate(this.rotation);
        
        // Apply finger wiggling
        let wiggleAngle = p.sin(this.wiggleOffset) * this.wiggleAmount;
        p.rotate(wiggleAngle);
        
        // Draw hand image
        if (this.handImage && this.handImage.width > 0) {
            p.imageMode(p.CENTER);
            p.tint(255);
            p.image(this.handImage, 0, 0, this.size * 2, this.size * 2);
        } else {
            // Don't log error constantly, maybe just draw placeholder?
            // p.fill(255,0,0, 50); // transparent red placeholder
            // p.ellipse(0,0, this.size*2, this.size*2);
        }
        
        p.pop();
    }

    update(target, p) {
        if (!this.active) return;

        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Update wiggle animation
        this.wiggleOffset += this.wiggleSpeed;

        // Bounce off edges using stored canvas dimensions
        if (this.x < 0 || this.x > this.canvasWidth) {
            this.speedX *= -1;
            this.x = Math.max(0, Math.min(this.x, this.canvasWidth));
        }
        if (this.y < 0 || this.y > this.canvasHeight) {
            this.speedY *= -1;
            this.y = Math.max(0, Math.min(this.y, this.canvasHeight));
        }
        
        // Check collision with breasts
        // Calculate the actual collision radius based on hand size
        let collisionRadius = this.size;
        
        // Check collision with left breast
        let distanceLeft = Math.sqrt(
            Math.pow(this.x - (this.canvasWidth/2 - target.size/3), 2) +
            Math.pow(this.y - this.canvasHeight/2, 2)
        );
        if (distanceLeft < (collisionRadius + target.size/2)) {
            return true;
        }
        
        // Check collision with right breast
        let distanceRight = Math.sqrt(
            Math.pow(this.x - (this.canvasWidth/2 + target.size/3), 2) +
            Math.pow(this.y - this.canvasHeight/2, 2)
        );
        if (distanceRight < (collisionRadius + target.size/2)) {
            return true;
        }
        
        // Additional check for the space between breasts
        let distanceCenter = Math.sqrt(
            Math.pow(this.x - this.canvasWidth/2, 2) +
            Math.pow(this.y - this.canvasHeight/2, 2)
        );
        if (distanceCenter < (collisionRadius + target.size/3)) {
            return true;
        }
        
        return false;
    }
}

export class BreastProtector extends BaseProtector {
    constructor(config) {
        super({
            ...config,
            gameId: window.gameConfig.GAME_IDS.BREAST_PROTECTOR
        });
        
        // Game-specific properties
        this.hands = [];
        this.lastHandSpawnTime = 0;
        this.handSpawnInterval = 2; // Spawn a new hand every 2 seconds
        this.target = {
            x: this.width/2,
            y: this.height/2,
            size: 50
        };
        
        this.timeSurvived = 0;
        this.highScore = 0;
        this.playerName = ''; // Initialize player name
        this.nameInputActive = false;
        this.mouseX = this.width/2;
        this.mouseY = this.height/2;
    }

    preload() {
        super.preload();
        console.log('[Preload] Starting preload...');
        this.handImage = this.p.loadImage('/src/games/breast-protector/assets/images/hand.png', 
            (img) => { 
                console.log('[Preload Callback] Success callback: Image loaded. Dimensions:', img.width, 'x', img.height);
                this.imageLoaded = true;
                // Initialize hands once image is loaded
                if (!this.hands || this.hands.length === 0) {
                    for (let i = 0; i < 5; i++) {
                        this.spawnHand();
                    }
                }
            },
            (err) => { 
                console.error('[Preload Callback] Error callback: Failed to load hand image:', err);
                this.imageLoaded = false;
            }
        );
    }

    setup() {
        super.setup();
        console.log('[Setup] Setup function started');
        // Don't spawn hands here - wait for image to load
        this.target = {
            x: this.width/2,
            y: this.height/2,
            size: 50
        };
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;
        
        // Update timer
        this.timeSurvived += 1/60; // Increment time in seconds
        
        // Only spawn hands if image is loaded
        if (this.imageLoaded) {
            // Spawn new hand if enough time has passed
            const shouldSpawn = this.timeSurvived - this.lastHandSpawnTime >= this.handSpawnInterval;
            if (shouldSpawn) {
                this.spawnHand();
                this.lastHandSpawnTime = this.timeSurvived;
                // Decrease spawn interval slightly to make game progressively harder
                this.handSpawnInterval = Math.max(1, this.handSpawnInterval - 0.1);
            }
        }
        
        // Update hands
        for (let i = this.hands.length - 1; i >= 0; i--) {
            const hand = this.hands[i];
            if (hand.update(this.target, this.p)) {
                console.log('[Update] Collision detected!');
                super.handleGameOver();
                break;
            }
        }
    }

    draw() {
        this.p.background(240);
        
        if (!this.gameStarted) {
            this.drawInstructions();
            return;
        }
        
        if (this.showNameInput) {
            super.drawNameInput();
            return;
        }
        
        if (this.showingLeaderboard) {
            super.drawLeaderboard();
            return;
        }
        
        // Draw game
        this.drawGameElements();
        
        // Draw HUD
        this.drawHUD();
        
        // Debug info
        if (this.imageLoaded) {
            this.p.fill(0);
            this.p.textSize(12);
            this.p.textAlign(this.p.LEFT, this.p.BOTTOM);
            this.p.text(`Debug: Image loaded, Hands: ${this.hands.length}`, 10, this.height - 10);
        }
    }

    drawInstructions() {
        // Draw background
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
        // Draw breasts at fixed position
        const centerX = this.width/2;
        const centerY = this.height/2;
        
        this.p.fill(255, 192, 203); // Pink color
        this.p.noStroke();
        
        // Left breast
        this.p.ellipse(centerX - this.target.size/3, centerY, this.target.size, this.target.size * 1.2);
        // Right breast
        this.p.ellipse(centerX + this.target.size/3, centerY, this.target.size, this.target.size * 1.2);
        
        // Draw areolas
        this.p.fill(255, 160, 180); // Slightly darker pink
        this.p.circle(centerX - this.target.size/3, centerY, this.target.size/3);
        this.p.circle(centerX + this.target.size/3, centerY, this.target.size/3);
        
        // Draw hands only if image is loaded
        if (this.imageLoaded && this.hands.length > 0) {
            for (const hand of this.hands) {
                hand.draw(this.p);
            }
        }
    }

    drawHUD() {
        this.p.fill(0);
        this.p.textSize(24);
        this.p.textAlign(this.p.LEFT, this.p.TOP);
        let padding = 20;
        this.p.text(`Time: ${this.timeSurvived.toFixed(1)}s`, padding, padding);
        this.p.text(`Hands: ${this.hands.length}`, padding, padding + 30);
    }

    spawnHand() {
        if (!this.imageLoaded || !this.handImage) {
            console.log('[SpawnHand] Hand image not ready yet, waiting...');
            return;
        }
        
        console.log('[SpawnHand] Creating new hand...');
        const newHand = new Hand(
            null, null,
            2 + this.timeSurvived/10, // Increase speed over time
            this.handImage,
            this.target,
            this.width,
            this.height
        );
        this.hands.push(newHand);
        console.log('[SpawnHand] Hand created, total hands:', this.hands.length);
    }

    mouseMoved() {
        // Breasts stay centered - no mouse movement needed
    }

    mousePressed() {
        if (!this.gameStarted && !this.showNameInput && !this.showingLeaderboard) {
            console.log('Starting game from mousePress');
            this.gameStarted = true;
            return;
        }
        
        if (this.showingLeaderboard && this.isPlayAgainButtonHovered()) {
            this.resetGame();
            return;
        }
    }

    resetGame() {
        super.resetGame();
        this.hands = [];
        this.lastHandSpawnTime = 0;
        this.handSpawnInterval = 2;
        
        // Initialize with 5 hands only if image is loaded
        if (this.imageLoaded) {
            for (let i = 0; i < 5; i++) {
                this.spawnHand();
            }
        }
    }
} 