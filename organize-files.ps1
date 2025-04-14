# Create backup directory
New-Item -ItemType Directory -Force -Path "port-8000-old"

# Move files to backup directory
Move-Item -Path "original" -Destination "port-8000-old/" -Force
Move-Item -Path "sketch.js" -Destination "port-8000-old/" -Force
Move-Item -Path "index-orig.html" -Destination "port-8000-old/" -Force
Move-Item -Path "Game.js" -Destination "port-8000-old/" -Force
Move-Item -Path "payments.js" -Destination "port-8000-old/" -Force
Move-Item -Path "highscores.php" -Destination "port-8000-old/" -Force

# Create a README in the backup directory
@"
This directory contains the original files from port 8000.
These files are kept for reference and can be restored if needed.

Contents:
- original/: Original game files
- sketch.js: Original game sketch
- index-orig.html: Original HTML file
- Game.js: Original game class
- payments.js: Original payments handling
- highscores.php: Original high scores handling

To restore these files, simply move them back to the root directory.
"@ | Out-File -FilePath "port-8000-old/README.md" -Encoding UTF8

Write-Host "Files have been organized. Port 8000 files are now in port-8000-old/" 