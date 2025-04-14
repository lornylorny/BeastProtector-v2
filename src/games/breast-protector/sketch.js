import { BreastProtector } from './BreastProtector.js';

let game;

function setup() {
    createCanvas(windowWidth, windowHeight);
    game = new BreastProtector({
        width: windowWidth,
        height: windowHeight
    });
}

function draw() {
    game.update();
    game.draw();
}

function mousePressed() {
    game.mousePressed();
}

function mouseMoved() {
    game.mouseMoved();
}

function keyPressed() {
    game.keyPressed();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    game.width = windowWidth;
    game.height = windowHeight;
}

// Make the game instance available globally for debugging
window.game = game; 