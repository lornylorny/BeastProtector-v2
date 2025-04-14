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
let enteringName = false;
let showingLeaderboard = false; // New state for leaderboard screen
let playerName = '';
let maxNameLength = 10;
let isMobile = false;
let virtualKeyboard = [];
let submitButton = null;
let playAgainButton = null; // New button for play again
let gameStartDelay = 5; // Increased to 5 seconds
let gameStartTime = 0;
let highScoresLoaded = false;
let nameValidationMessage = '';
let nameValidationColor;
let loginMessage = '';
let loginMessageColor;
let namePreviewTimeout = null;
let gameStarted = false;
let playButton = null;

// Login state variables
let showLoginScreen = true;
let isLoggedIn = false;
let loginEmail = '';
let loginPassword = '';
let isRegistering = false;

function preload() {
    // Load the hand image from the local images folder
    handImage = loadImage('images/hand.png');
}

// Load high scores from Supabase
async function loadHighScores() {
    try {
        highScores = await window.gameConfig.loadGameHighScores(window.gameConfig.GAME_IDS.BREAST_PROTECTOR);
        console.log('Loaded high scores:', highScores);
    } catch (error) {
        console.error('Error loading high scores:', error);
    }
}

// Save high score to Supabase
async function saveHighScore(name) {
    const result = await window.gameConfig.saveGameHighScore(
        window.gameConfig.GAME_IDS.BREAST_PROTECTOR,
        name,
        timeSurvived
    );
    
    if (result.success) {
        await loadHighScores();
        showingLeaderboard = true;
    } else {
        console.error('Failed to save score:', result.reason);
    }
    
    return result;
}

// Check if score qualifies for user's top 3 scores
async function checkHighScore(time) {
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) return false;

        // Get user's current scores
        const { data: userScores, error } = await window.supabase
            .from('leaderboard')
            .select('high_score')
            .eq('user_id', session.user.id)
            .eq('game_id', 'breast_protector')
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
        const intTime = Math.round(time * 10);
        
        // Check if this score beats their lowest top 3 score
        const lowestScore = userScores[userScores.length - 1].high_score;
        const isHighScore = intTime > lowestScore;
        console.log(`Comparing new score ${intTime} with lowest score ${lowestScore}: ${isHighScore}`);
        return isHighScore;
    } catch (error) {
        console.error('Error in checkHighScore:', error);
        return false;
    }
}

// Update addHighScore function to use Supabase directly
async function addHighScore(name, time) {
    const result = await saveHighScore(name);
    if (result.success) {
        await loadHighScores();
    } else {
        console.error('Failed to save high score:', result.reason);
    }
}

class Hand {
    constructor() {
        // Minimum safe distance from breasts (in pixels)
        const minSafeDistance = 200;
        
        // Try to find a safe spawn position
        let attempts = 0;
        let safePosition = false;
        
        while (!safePosition && attempts < 50) {
            this.x = random(width);
            this.y = random(height);
            
            // Calculate distance from both breasts
            let distanceLeft = dist(this.x, this.y, targetX - targetSize/3, targetY);
            let distanceRight = dist(this.x, this.y, targetX + targetSize/3, targetY);
            
            // Check if position is safe
            if (distanceLeft > minSafeDistance && distanceRight > minSafeDistance) {
                safePosition = true;
            }
            
            attempts++;
        }
        
        // If we couldn't find a safe position after 50 attempts, just use the last position
        this.speedX = random(-3, 3);
        this.speedY = random(-3, 3);
        this.size = random(30, 50);
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.02, 0.02);
        
        // New properties for finger wiggling
        this.wiggleOffset = random(TWO_PI); // Random starting point for wiggle
        this.wiggleSpeed = random(0.05, 0.15); // Speed of finger wiggling
        this.wiggleAmount = random(0.2, 0.4); // How much the fingers wiggle
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        // Update wiggle animation
        this.wiggleOffset += this.wiggleSpeed;

        // Bounce off edges
        if (this.x < 0 || this.x > width) this.speedX *= -1;
        if (this.y < 0 || this.y > height) this.speedY *= -1;
        
        // Check collision with breasts
        if (!gameOver && !enteringName) {
            // Calculate the actual collision radius based on hand size
            let collisionRadius = this.size;
            
            // Check collision with left breast
            let distanceLeft = dist(this.x, this.y, targetX - targetSize/3, targetY);
            if (distanceLeft < (collisionRadius + targetSize/2)) {
                handleGameOver();
                return;
            }
            
            // Check collision with right breast
            let distanceRight = dist(this.x, this.y, targetX + targetSize/3, targetY);
            if (distanceRight < (collisionRadius + targetSize/2)) {
                handleGameOver();
                return;
            }
            
            // Additional check for the space between breasts
            let distanceCenter = dist(this.x, this.y, targetX, targetY);
            if (distanceCenter < (collisionRadius + targetSize/3)) {
                handleGameOver();
                return;
            }
        }
    }

    draw() {
        push();
        translate(this.x, this.y);
        
        // Apply base rotation
        rotate(this.rotation);
        
        // Apply finger wiggling
        let wiggleAngle = sin(this.wiggleOffset) * this.wiggleAmount;
        rotate(wiggleAngle);
        
        // Draw hand image with transparent white background
        imageMode(CENTER);
        tint(255, 255, 255, 255); // Full opacity for the hand
        image(handImage, 0, 0, this.size * 2, this.size * 2);
        
        pop();
    }
}

async function setup() {
    // Wait for Supabase to be initialized
    let attempts = 0;
    while (!window.supabase && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase) {
        console.error('Failed to initialize Supabase');
        return;
    }
    
    // Initialize p5.js color variables first
    nameValidationColor = color(0); // Default black
    loginMessageColor = color(0); // Default black
    
    // Check if device is mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Create canvas with appropriate size
    if (isMobile) {
        canvas = createCanvas(windowWidth, windowHeight);
        targetSize = min(windowWidth, windowHeight) * 0.1; // Adjust target size for mobile
    } else {
        canvas = createCanvas(800, 600);
    }
    
    // Check authentication
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
            showLoginScreen = false;
            isLoggedIn = true;
            loginEmail = session.user.email;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
    
    // Initialize game components
    moveTarget();
    await loadHighScores();
    
    // Create initial hands
    for (let i = 0; i < 5; i++) {
        hands.push(new Hand());
    }

    // Initialize virtual keyboard
    if (isMobile) {
        setupVirtualKeyboard();
    }
    
    // Set initial state to show instructions
    showingLeaderboard = false;
    gameOver = false;
    enteringName = false;
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
    if (showingLeaderboard) {
        // Check if play again button is pressed
        if (playAgainButton && 
            touches[0].x >= playAgainButton.x && 
            touches[0].x <= playAgainButton.x + playAgainButton.width &&
            touches[0].y >= playAgainButton.y && 
            touches[0].y <= playAgainButton.y + playAgainButton.height) {
            showingLeaderboard = false;
            resetGame();
        }
        return false;
    }

    if (!gameStarted) {
        // Start the game on first touch
        gameStarted = true;
        resetGame();
        return false;
    }

    if (gameOver) {
        if (enteringName && isMobile) {
            // Handle virtual keyboard input
            const touchX = touches[0].x;
            const touchY = touches[0].y;
            
            // Check keyboard touches
            for (let key of virtualKeyboard) {
                if (touchX >= key.x && touchX <= key.x + key.width &&
                    touchY >= key.y && touchY <= key.y + key.height) {
                    if (key.isBackspace) {
                        playerName = playerName.slice(0, -1);
                        if (playerName.length > 0) {
                            validateAndPreviewName(playerName);
                        } else {
                            nameValidationMessage = '';
                            nameValidationColor = color(0);
                        }
                    } else if (playerName.length < maxNameLength) {
                        const newName = playerName + key.letter;
                        validateAndPreviewName(newName);
                        playerName = newName;
                    }
                    return false;
                }
            }
            
            // Check if submit button is pressed
            if (submitButton && 
                touchX >= submitButton.x && touchX <= submitButton.x + submitButton.width &&
                touchY >= submitButton.y && touchY <= submitButton.y + submitButton.height) {
                if (playerName.length > 0 && validateAndPreviewName(playerName)) {
                    saveHighScore(playerName).then(result => {
                        if (result.success) {
                            loadHighScores();
                            enteringName = false;
                            showingLeaderboard = true; // Show leaderboard instead of resetting
                        } else {
                            nameValidationMessage = result.reason;
                            nameValidationColor = color(255, 0, 0);
                        }
                    });
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
    if (gameOver && !enteringName) {
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

// Update the login status display function
function drawLoginStatus() {
    if (isLoggedIn && loginEmail) {
        push(); // Save current drawing state
        fill(180); // Very light grey
        textSize(8); // Tiny text
        textAlign(RIGHT, BOTTOM);
        text(loginEmail, width - 5, height - 2);
        pop(); // Restore drawing state
    }
}

function draw() {
    background(240);
    
    if (showingLeaderboard) {
        // Leaderboard screen
        background(255);
        
        // Draw title with shadow effect
        textAlign(CENTER, CENTER);
        textSize(52);
        fill(220);
        text('HIGH SCORES', width/2 + 2, height/6 + 2); // Shadow
        fill(0);
        text('HIGH SCORES', width/2, height/6); // Main text
        
        // Display top 10 scores with improved spacing and formatting
        textSize(32);
        for (let i = 0; i < highScores.length; i++) {
            const score = highScores[i];
            const yPos = height/4 + (i * 50); // Increased spacing between scores
            
            // Background highlight for player's row
            if (score.name === playerName) {
                fill(240, 240, 200); // Light yellow highlight
                noStroke();
                rect(width/4, yPos - 20, width/2, 40, 10);
            }
            
            // Color coding for top 3
            fill(i === 0 ? color(255, 215, 0) : // Gold for 1st
                 i === 1 ? color(192, 192, 192) : // Silver for 2nd
                 i === 2 ? color(205, 127, 50) : // Bronze for 3rd
                 color(80)); // Darker grey for others
            
            // Format the date
            const dateStr = score.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Format rank with padding for single digits
            const rankStr = `${i + 1}.`.padStart(3, ' ');
            // Format score with fixed decimal and padding
            const scoreStr = score.score.toFixed(1).padStart(5, ' ');
            
            // Draw the score entry with improved alignment
            textAlign(RIGHT, CENTER);
            text(rankStr, width/2 - 150, yPos);
            textAlign(LEFT, CENTER);
            text(score.name, width/2 - 130, yPos);
            textAlign(RIGHT, CENTER);
            text(`${scoreStr}s`, width/2 + 100, yPos);
            textSize(20);
            fill(120); // Grey for date
            text(dateStr, width/2 + 250, yPos);
            textSize(32); // Reset text size
        }
        
        // Play Again button with improved styling
        const buttonWidth = 220;
        const buttonHeight = 70;
        const buttonX = width/2 - buttonWidth/2;
        const buttonY = height - 120;
        
        // Check if mouse is over the button
        const isOverButton = mouseX > buttonX && 
                            mouseX < buttonX + buttonWidth && 
                            mouseY > buttonY && 
                            mouseY < buttonY + buttonHeight;
        
        // Draw button shadow
        noStroke();
        fill(100, 200, 100, 50);
        rect(buttonX + 4, buttonY + 4, buttonWidth, buttonHeight, 15);
        
        // Draw button
        fill(isOverButton ? color(100, 200, 100) : color(120, 220, 120));
        rect(buttonX, buttonY, buttonWidth, buttonHeight, 15);
        
        // Draw button text with shadow
        textSize(32);
        textAlign(CENTER, CENTER);
        
        // Text shadow
        fill(0, 0, 0, 30);
        text('PLAY AGAIN', width/2 + 2, buttonY + buttonHeight/2 + 2);
        
        // Main text
        fill(255);
        text('PLAY AGAIN', width/2, buttonY + buttonHeight/2);
        
        // Store button position for click detection
        playAgainButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    } else if (showLoginScreen) {
        drawLoginScreen();
    } else if (!gameStarted) {
        // Show instructions screen
        background(255);
        fill(0);
        textSize(40);
        textAlign(CENTER, CENTER);
        text("PROTECT THE BREASTS!", width/2, height/2 - 100);
        textSize(32);
        text("Avoid the groping hands!", width/2, height/2 - 20);
        if (isMobile) {
            text("TOUCH to move", width/2, height/2 + 40);
        } else {
            text("CLICK to move", width/2, height/2 + 40);
        }
        
        // Draw PLAY button with improved styling
        const buttonWidth = 220;
        const buttonHeight = 70;
        const buttonX = width/2 - buttonWidth/2;
        const buttonY = height/2 + 100;
        
        // Check if mouse is over the button
        const isOverButton = mouseX > buttonX && 
                            mouseX < buttonX + buttonWidth && 
                            mouseY > buttonY && 
                            mouseY < buttonY + buttonHeight;
        
        // Draw button with shadow and hover effect
        fill(200);
        noStroke();
        rect(buttonX + 4, buttonY + 4, buttonWidth, buttonHeight, 15); // Shadow
        fill(isOverButton ? color(100, 200, 100) : color(120, 220, 120));
        rect(buttonX, buttonY, buttonWidth, buttonHeight, 15); // Button
        
        // Button text with shadow
        fill(50);
        textSize(36);
        text('PLAY', width/2 + 1, buttonY + buttonHeight/2 + 1);
        fill(255);
        text('PLAY', width/2, buttonY + buttonHeight/2);
        
        // Store button position for click detection
        playButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    } else if (!gameOver && !enteringName) {
        // Main game screen
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
    } else if (enteringName) {
        // Draw name input screen
        drawLoginStatus(); // Add login status to name input screen
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("NEW TOP 3 SCORE!", width/2, height/3 - 50);
        text("Enter Your Name", width/2, height/3);
        
        // Draw name preview with validation feedback
        textSize(48);
        fill(nameValidationColor);
        text(playerName + (frameCount % 60 < 30 ? "_" : ""), width/2, height/3 + 50);
        
        // Show validation message if any
        if (nameValidationMessage) {
            textSize(24);
            text(nameValidationMessage, width/2, height/3 + 100);
        }
        
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
            
            fill(0, 200, 0);
            rect(submitButtonX, submitButtonY, submitButtonWidth, submitButtonHeight, 10);
            fill(255);
            textSize(28);
            text("SUBMIT", width/2, submitButtonY + submitButtonHeight/2);
            
            submitButton = {
                x: submitButtonX,
                y: submitButtonY,
                width: submitButtonWidth,
                height: submitButtonHeight
            };
        } else {
            textSize(24);
            fill(0);
            text("Press ENTER when done", width/2, height/2 + 50);
        }
    }
    
    // Draw login status last, so it's always on top
    drawLoginStatus();
}

function drawLoginScreen() {
    background(255);
    
    // Draw login form
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text(isRegistering ? "Create Account" : "Login", width/2, height/3 - 50);
    
    // Draw input boxes
    const inputWidth = min(300, width * 0.8);
    const inputHeight = 40;
    const inputX = width/2 - inputWidth/2;
    let inputY = height/3;
    
    // Email input
    fill(255);
    stroke(0);
    rect(inputX, inputY, inputWidth, inputHeight, 5);
    fill(0);
    noStroke();
    textSize(16);
    textAlign(LEFT, CENTER);
    text(loginEmail || "Email", inputX + 10, inputY + inputHeight/2);
    
    // Password input
    inputY += inputHeight + 20;
    fill(255);
    stroke(0);
    rect(inputX, inputY, inputWidth, inputHeight, 5);
    fill(0);
    noStroke();
    text("*".repeat(loginPassword.length) || "Password", inputX + 10, inputY + inputHeight/2);
    
    // Login/Register button
    inputY += inputHeight + 30;
    const buttonWidth = inputWidth;
    const buttonHeight = 40;
    fill(0, 155, 0);
    noStroke();
    rect(inputX, inputY, buttonWidth, buttonHeight, 5);
    fill(255);
    textAlign(CENTER, CENTER);
    text(isRegistering ? "Create Account" : "Login", width/2, inputY + buttonHeight/2);
    
    // Switch mode button
    inputY += buttonHeight + 20;
    fill(100);
    textSize(14);
    text(isRegistering ? "Already have an account? Login" : "Need an account? Register", width/2, inputY);
    
    // Show login message if any
    if (loginMessage) {
        fill(loginMessageColor);
        textSize(16);
        text(loginMessage, width/2, inputY + 30);
    }
}

async function handleLogin() {
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword
        });
        
        if (error) throw error;
        
        isLoggedIn = true;
        showLoginScreen = false;
        loginMessage = "Login successful!";
        loginMessageColor = color(0, 155, 0);
        
        // Load high scores after successful login
        loadHighScores();
    } catch (error) {
        loginMessage = error.message;
        loginMessageColor = color(255, 0, 0);
    }
}

async function handleRegister() {
    try {
        const { data, error } = await window.supabase.auth.signUp({
            email: loginEmail,
            password: loginPassword
        });
        
        if (error) throw error;
        
        loginMessage = "Registration successful! Please check your email to verify your account.";
        loginMessageColor = color(0, 155, 0);
        isRegistering = false;
    } catch (error) {
        loginMessage = error.message;
        loginMessageColor = color(255, 0, 0);
    }
}

function validateAndPreviewName(newName) {
    const validation = validatePlayerName(newName);
    if (!validation.valid) {
        nameValidationMessage = validation.reason;
        nameValidationColor = color(255, 0, 0); // Red for invalid
    } else {
        nameValidationMessage = 'Valid name!';
        nameValidationColor = color(0, 155, 0); // Green for valid
    }
    
    // Clear validation message after 2 seconds
    if (namePreviewTimeout) clearTimeout(namePreviewTimeout);
    namePreviewTimeout = setTimeout(() => {
        nameValidationMessage = '';
        nameValidationColor = color(0); // Back to black
    }, 2000);
    
    return validation.valid;
}

async function keyPressed() {
    if (enteringName && !isMobile) {
        if (keyCode === ENTER) {
            if (playerName.length > 0 && validateAndPreviewName(playerName)) {
                const result = await saveHighScore(playerName);
                if (result.success) {
                    console.log('High score saved!');
                    await loadHighScores(); // Reload the scores
                    enteringName = false;
                    showingLeaderboard = true; // Show leaderboard instead of resetting
                } else {
                    nameValidationMessage = result.reason;
                    nameValidationColor = color(255, 0, 0);
                }
            }
        } else if (keyCode === BACKSPACE) {
            playerName = playerName.slice(0, -1);
            if (playerName.length > 0) {
                validateAndPreviewName(playerName);
            } else {
                nameValidationMessage = '';
                nameValidationColor = color(0);
            }
        } else if (key.length === 1 && /[A-Za-z0-9 ]/.test(key) && playerName.length < maxNameLength) {
            const newName = playerName + key.toUpperCase();
            validateAndPreviewName(newName);
            playerName = newName;
        }
    }
}

function mousePressed() {
    if (showingLeaderboard) {
        // Check if play again button is clicked
        if (playAgainButton && 
            mouseX >= playAgainButton.x && 
            mouseX <= playAgainButton.x + playAgainButton.width &&
            mouseY >= playAgainButton.y && 
            mouseY <= playAgainButton.y + playAgainButton.height) {
            showingLeaderboard = false;
            resetGame();
        }
        return;
    }

    if (showLoginScreen) {
        const inputWidth = min(300, width * 0.8);
        const inputHeight = 40;
        const inputX = width/2 - inputWidth/2;
        let inputY = height/3;
        
        // Check email input box
        if (mouseX >= inputX && mouseX <= inputX + inputWidth &&
            mouseY >= inputY && mouseY <= inputY + inputHeight) {
            loginEmail = prompt("Enter email:") || loginEmail;
            return;
        }
        
        // Check password input box
        inputY += inputHeight + 20;
        if (mouseX >= inputX && mouseX <= inputX + inputWidth &&
            mouseY >= inputY && mouseY <= inputY + inputHeight) {
            loginPassword = prompt("Enter password:") || loginPassword;
            return;
        }
        
        // Check login/register button
        inputY += inputHeight + 30;
        if (mouseX >= inputX && mouseX <= inputX + inputWidth &&
            mouseY >= inputY && mouseY <= inputY + 40) {
            if (isRegistering) {
                handleRegister();
            } else {
                handleLogin();
            }
            return;
        }
        
        // Check switch mode button
        inputY += 40 + 20;
        const switchBtnWidth = 200;
        if (mouseX >= width/2 - switchBtnWidth/2 && mouseX <= width/2 + switchBtnWidth/2 &&
            mouseY >= inputY - 10 && mouseY <= inputY + 10) {
            isRegistering = !isRegistering;
            loginMessage = '';
            return;
        }
        
        return;
    } else if (!gameStarted) {
        // Check if play button is clicked
        if (playButton && 
            mouseX >= playButton.x && 
            mouseX <= playButton.x + playButton.width &&
            mouseY >= playButton.y && 
            mouseY <= playButton.y + playButton.height) {
            gameStarted = true;
            gameOver = false;
            enteringName = false;
            showingLeaderboard = false;
            resetGame();
        }
    } else if (!gameOver && !enteringName) {
        // Move breasts to mouse position during game
        targetX = mouseX;
        targetY = mouseY;
    }
}

function resetGame() {
    gameOver = false;
    enteringName = false;
    showingLeaderboard = false;
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

// Add new function to handle game over state
async function handleGameOver() {
    gameOver = true;
    const isHighScore = await checkHighScore(timeSurvived);
    if (isHighScore) {
        enteringName = true;
        playerName = '';
    } else {
        showingLeaderboard = true;
        await loadHighScores();
    }
}

// Function to update auth state consistently
function updateAuthState(session) {
    if (session) {
        isLoggedIn = true;
        showLoginScreen = false;
        loginEmail = session.user.email;
        console.log('Logged in as:', loginEmail);
    } else {
        isLoggedIn = false;
        showLoginScreen = true;
        loginEmail = '';
        console.log('Not logged in');
    }
}
