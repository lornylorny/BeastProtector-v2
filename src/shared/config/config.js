// Game configuration and shared utilities
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase for port 8001
const supabaseUrl = 'https://yzfvtzidzszdbsoxiduy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZnZ0emlkenN6ZGJzb3hpZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0Nzg0MjYsImV4cCI6MjA2MDA1NDQyNn0.FbgXJGlD40qcDnzfg18tuH4SJvPRufb4mdiNDa3dLLg';

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Make Supabase client globally available for backward compatibility
window.supabase = supabase;

export const gameConfig = {
    // Game IDs
    GAME_IDS: {
        BREAST_PROTECTOR: 'breast_protector',
        // Add more game IDs here
    },

    // List of banned words (case insensitive)
    BANNED_WORDS: [
        'badword1',
        'badword2',
        'badword3',
        // Add more banned words here
    ],

    // Validate player name
    validatePlayerName(name) {
        // Check for banned words
        const lowerName = name.toLowerCase();
        for (const word of this.BANNED_WORDS) {
            if (lowerName.includes(word.toLowerCase())) {
                return {
                    isValid: false,
                    message: 'Name contains inappropriate content'
                };
            }
        }

        // Check minimum length
        if (name.length < 2) {
            return {
                isValid: false,
                message: 'Name must be at least 2 characters long'
            };
        }

        // Check for valid characters (letters, numbers, and spaces only)
        if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
            return {
                isValid: false,
                message: 'Name can only contain letters, numbers, and spaces'
            };
        }

        return {
            isValid: true,
            message: 'Valid name!'
        };
    },

    // Save high score for a specific game
    async saveGameHighScore(gameId, playerName, score) {
        try {
            // Validate name first
            const validationResult = this.validatePlayerName(playerName);
            if (!validationResult.isValid) {
                return {
                    success: false,
                    message: validationResult.message
                };
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    success: false,
                    message: 'You must be logged in to save scores'
                };
            }

            // Save the score
            const { error } = await supabase
                .from('leaderboard')
                .insert({
                    user_id: user.id,
                    game_id: gameId,
                    high_score: score,
                    player_name: playerName
                });

            if (error) {
                console.error('Error saving high score:', error);
                return {
                    success: false,
                    message: 'Failed to save high score'
                };
            }

            return {
                success: true,
                message: 'High score saved!'
            };
        } catch (error) {
            console.error('Error in saveGameHighScore:', error);
            return {
                success: false,
                message: 'An error occurred while saving the score'
            };
        }
    },

    // Load high scores for a specific game
    async loadGameHighScores(gameId, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('*')
                .eq('game_id', gameId)
                .order('high_score', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Error loading high scores:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Error in loadGameHighScores:', error);
            return [];
        }
    }
};

// Make config globally available
window.gameConfig = gameConfig; 