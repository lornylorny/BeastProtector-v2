let targetX;
let targetY;
let targetSize = 50;
let score = 0;
let hands = [];
let gameOver = false;
let timeSurvived = 0;
let handImage;
let lastHandSpawnTime = 0;
let handSpawnInterval = 5; // Spawn a new hand every 5 seconds
let highScores = [];
let enteringInitials = false;
let playerInitials = '';
let maxInitialsLength = 3;
let isMobile = false;
let virtualKeyboard = [];
let submitButton = null;

function preload() {
    // Load the hand image from the local images folder
    handImage = loadImage('images/hand.png');
}

// Load high scores from localStorage
function loadHighScores() {
    let savedScores = localStorage.getItem('highScores');
    if (savedScores) {
        highScores = JSON.parse(savedScores);
    } else {
        highScores = [];
    }
}

// Save high scores to localStorage
function saveHighScores() {
    localStorage.setItem('highScores', JSON.stringify(highScores));
}

// Check if score qualifies for high score table
function checkHighScore(time) {
    if (highScores.length < 5) return true;
    return time > highScores[highScores.length - 1].time;
}

// Add new high score
function addHighScore(initials, time) {
    highScores.push({ initials: initials, time: time });
    highScores.sort((a, b) => b.time - a.time);
    if (highScores.length > 5) {
        highScores = highScores.slice(0, 5);
    }
    saveHighScores();
}

class Hand {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.speedX = random(-3, 3);
        this.speedY = random(-3, 3);
        this.size = random(30, 50);
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.02, 0.02);
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
        
        // Check collision with breasts
        if (!gameOver && !enteringInitials) {
            // Calculate the actual collision radius based on hand size
            let collisionRadius = this.size;
            
            // Check collision with left breast
            let distanceLeft = dist(this.x, this.y, targetX - targetSize/3, targetY);
            if (distanceLeft < (collisionRadius + targetSize/2)) {
                gameOver = true;
                if (checkHighScore(timeSurvived)) {
                    enteringInitials = true;
                    playerInitials = '';
                }
                return;
            }
            
            // Check collision with right breast
            let distanceRight = dist(this.x, this.y, targetX + targetSize/3, targetY);
            if (distanceRight < (collisionRadius + targetSize/2)) {
                gameOver = true;
                if (checkHighScore(timeSurvived)) {
                    enteringInitials = true;
                    playerInitials = '';
                }
                return;
            }
            
            // Additional check for the space between breasts
            let distanceCenter = dist(this.x, this.y, targetX, targetY);
            if (distanceCenter < (collisionRadius + targetSize/3)) {
                gameOver = true;
                if (checkHighScore(timeSurvived)) {
                    enteringInitials = true;
                    playerInitials = '';
                }
                return;
            }
        }
    }

    draw() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        
        // Draw hand image with transparent white background
        imageMode(CENTER);
        tint(255, 255, 255, 255); // Full opacity for the hand
        image(handImage, 0, 0, this.size * 2, this.size * 2);
        
        pop();
    }
}

function setup() {
    // Check if device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create canvas with appropriate size
    if (isMobile) {
        canvas = createCanvas(windowWidth, windowHeight);
        targetSize = min(windowWidth, windowHeight) * 0.1; // Adjust target size for mobile
    } else {
        canvas = createCanvas(800, 600);
    }
    
    // Initialize target position
    moveTarget();
    loadHighScores();
    
    // Create initial hands
    for (let i = 0; i < 5; i++) {
        hands.push(new Hand());
    }

    // Initialize virtual keyboard
    if (isMobile) {
        setupVirtualKeyboard();
    }
}

function setupVirtualKeyboard() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const rows = 3;
    const cols = 9;
    const keyboardWidth = min(width * 0.9, 600); // Limit max width
    const keyWidth = keyboardWidth / cols;
    const keyHeight = keyWidth * 1.2; // Make buttons slightly taller
    const startX = (width - keyboardWidth) / 2;
    const startY = height/2;

    virtualKeyboard = [];
    let index = 0;
    
    // Add backspace button first
    virtualKeyboard.push({
        letter: '⌫',
        x: startX,
        y: startY - keyHeight - 10,
        width: keyWidth * 2,
        height: keyHeight,
        isBackspace: true
    });

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 9; col++) {
            if (index < letters.length) {
                virtualKeyboard.push({
                    letter: letters[index],
                    x: startX + col * keyWidth,
                    y: startY + row * keyHeight,
                    width: keyWidth,
                    height: keyHeight,
                    isBackspace: false
                });
                index++;
            }
        }
    }
}

function touchStarted() {
    if (gameOver) {
        if (enteringInitials && isMobile) {
            // Handle virtual keyboard input
            const touchX = touches[0].x;
            const touchY = touches[0].y;
            
            // Check keyboard touches
            for (let key of virtualKeyboard) {
                if (touchX >= key.x && touchX <= key.x + key.width &&
                    touchY >= key.y && touchY <= key.y + key.height) {
                    if (key.isBackspace) {
                        playerInitials = playerInitials.slice(0, -1);
                    } else if (playerInitials.length < maxInitialsLength) {
                        playerInitials += key.letter;
                    }
                    return false;
                }
            }
            
            // Check if submit button is pressed
            if (submitButton && 
                touchX >= submitButton.x && touchX <= submitButton.x + submitButton.width &&
                touchY >= submitButton.y && touchY <= submitButton.y + submitButton.height) {
                if (playerInitials.length > 0) {
                    addHighScore(playerInitials, timeSurvived);
                    enteringInitials = false;
                }
                return false;
            }
        } else {
            resetGame();
        }
    } else {
        // Move breasts to touch position
        if (touches.length > 0) {
            targetX = touches[0].x;
            targetY = touches[0].y;
        }
    }
    return false;
}

function touchEnded() {
    if (gameOver && !enteringInitials) {
        resetGame();
    }
    return false;
}

function windowResized() {
    if (isMobile) {
        resizeCanvas(windowWidth, windowHeight);
        setupVirtualKeyboard(); // Recalculate keyboard layout on resize
    }
}

function draw() {
    background(240);
    
    if (!gameOver) {
        timeSurvived += 1/60; // Increment time in seconds
        
        // Spawn new hand if enough time has passed
        if (timeSurvived - lastHandSpawnTime >= handSpawnInterval) {
            hands.push(new Hand());
            lastHandSpawnTime = timeSurvived;
            // Decrease spawn interval slightly to make game progressively harder
            handSpawnInterval = max(2, handSpawnInterval - 0.2);
        }
        
        // Draw score and time with proper padding
        fill(0);
        textSize(24);
        textAlign(LEFT, TOP);
        let padding = isMobile ? 40 : 20; // More padding on mobile
        text(`Time: ${timeSurvived.toFixed(1)}s`, padding, padding);
        text(`Hands: ${hands.length}`, padding, padding + 30);
        
        // Update hands first
        for (let hand of hands) {
            hand.update();
        }
        
        // Draw breasts
        fill(255, 192, 203); // Pink color
        noStroke();
        
        // Left breast
        ellipse(targetX - targetSize/3, targetY, targetSize, targetSize * 1.2);
        // Right breast
        ellipse(targetX + targetSize/3, targetY, targetSize, targetSize * 1.2);
        
        // Draw areolas
        fill(255, 160, 180); // Slightly darker pink
        circle(targetX - targetSize/3, targetY, targetSize/3);
        circle(targetX + targetSize/3, targetY, targetSize/3);
        
        // Draw hands last
        for (let hand of hands) {
            hand.draw();
        }
    } else if (enteringInitials) {
        // Draw initials input screen
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("NEW HIGH SCORE!", width/2, height/3 - 50);
        text("Enter Your Initials", width/2, height/3);
        textSize(48);
        text(playerInitials + (frameCount % 60 < 30 ? "_" : ""), width/2, height/3 + 50);
        
        if (isMobile) {
            // Draw keyboard
            for (let key of virtualKeyboard) {
                // Draw key background with shadow effect
                fill(key.isBackspace ? 200 : 240);
                stroke(180);
                strokeWeight(2);
                rect(key.x, key.y, key.width, key.height, 8);
                
                // Draw letter
                fill(0);
                noStroke();
                textSize(key.isBackspace ? min(32, key.width * 0.4) : min(28, key.width * 0.8));
                textAlign(CENTER, CENTER);
                text(key.letter, key.x + key.width/2, key.y + key.height/2);
            }
            
            // Draw submit button
            const submitButtonWidth = min(200, width * 0.4);
            const submitButtonHeight = 60;
            const submitButtonX = width/2 - submitButtonWidth/2;
            const submitButtonY = height - submitButtonHeight - 40;
            
            // Draw button shadow
            fill(0, 150, 0);
            noStroke();
            rect(submitButtonX + 2, submitButtonY + 2, submitButtonWidth, submitButtonHeight, 10);
            
            // Draw button
            fill(0, 200, 0);
            rect(submitButtonX, submitButtonY, submitButtonWidth, submitButtonHeight, 10);
            fill(255);
            textSize(28);
            text("SUBMIT", width/2, submitButtonY + submitButtonHeight/2);
            
            // Update submit button hitbox
            submitButton = {
                x: submitButtonX,
                y: submitButtonY,
                width: submitButtonWidth,
                height: submitButtonHeight
            };
        } else {
            textSize(24);
            text("Press ENTER when done", width/2, height/2 + 50);
        }
    } else {
        // Draw game over and high scores screen
        fill(0);
        textSize(48);
        textAlign(CENTER, CENTER);
        text("GAME OVER", width/2, height/2 - 200);
        textSize(24);
        text(`You survived for ${timeSurvived.toFixed(1)} seconds`, width/2, height/2 - 150);
        text(`Final hand count: ${hands.length}`, width/2, height/2 - 120);
        
        // Draw high scores
        textSize(32);
        text("TOP 5 HIGH SCORES", width/2, height/2 - 50);
        textSize(24);
        for (let i = 0; i < highScores.length; i++) {
            let score = highScores[i];
            text(`${i + 1}. ${score.initials}: ${score.time.toFixed(1)}s`, width/2, height/2 + (i * 30));
        }
        
        text("Click to play again", width/2, height/2 + 200);
    }
}

function keyPressed() {
    if (enteringInitials && !isMobile) {
        if (keyCode === ENTER) {
            if (playerInitials.length > 0) {
                addHighScore(playerInitials, timeSurvived);
                enteringInitials = false;
            }
        } else if (keyCode === BACKSPACE) {
            playerInitials = playerInitials.slice(0, -1);
        } else if (key.length === 1 && /[A-Za-z]/.test(key) && playerInitials.length < maxInitialsLength) {
            playerInitials += key.toUpperCase();
        }
    }
}

function mousePressed() {
    if (!isMobile) {  // Only handle mouse events on desktop
        if (gameOver) {
            if (!enteringInitials) {
                resetGame();
            }
        } else {
            targetX = mouseX;
            targetY = mouseY;
        }
    }
}

function resetGame() {
    gameOver = false;
    enteringInitials = false;
    timeSurvived = 0;
    score = 0;
    hands = [];
    lastHandSpawnTime = 0;
    handSpawnInterval = 5;
    for (let i = 0; i < 5; i++) {
        hands.push(new Hand());
    }
    moveTarget();
}

function moveTarget() {
    // Move target to random position, keeping it fully within canvas
    targetX = random(targetSize, width - targetSize);
    targetY = random(targetSize, height - targetSize);
}
