<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: text/plain');

$file = 'highscores.txt';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Save high scores
    $data = file_get_contents('php://input');
    file_put_contents($file, $data);
    echo 'High scores saved';
} else {
    // Get high scores
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo '[]';
    }
}
?> 