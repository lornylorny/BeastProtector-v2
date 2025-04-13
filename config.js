// Game configuration
const config = {
    minNameLength: 2,
    maxNameLength: 10,
    bannedWords: [
        'fuck', 'shit', 'ass', 'dick', 'cock', 'pussy', 'cunt',
        'whore', 'slut', 'bitch', 'bastard', 'damn'
    ]
};

// Name validation function
function validatePlayerName(name) {
    // Check minimum length
    if (name.length < config.minNameLength) {
        return { valid: false, reason: `Name must be at least ${config.minNameLength} characters long` };
    }
    
    // Check maximum length
    if (name.length > config.maxNameLength) {
        return { valid: false, reason: `Name must be no more than ${config.maxNameLength} characters long` };
    }
    
    // Check for valid characters (letters, numbers, and spaces only)
    if (!/^[A-Za-z0-9 ]+$/.test(name)) {
        return { valid: false, reason: 'Name can only contain letters, numbers, and spaces' };
    }
    
    // Check for banned words
    const lowerName = name.toLowerCase();
    for (const word of config.bannedWords) {
        if (lowerName.includes(word.toLowerCase())) {
            return { valid: false, reason: 'Name contains inappropriate language' };
        }
    }
    
    // All checks passed
    return { valid: true, reason: '' };
}

// Test Supabase connection
async function testSupabaseConnection() {
    console.log('🔍 Starting Supabase connection test...');
    
    // Wait for Supabase to be initialized
    let attempts = 0;
    while (!window.supabase && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase) {
        console.error('Failed to initialize Supabase');
        return false;
    }
    
    try {
        // Check if Supabase client is initialized
        console.log('✅ Supabase client initialized');
        
        // Check authentication
        const { data: { session }, error: authError } = await window.supabase.auth.getSession();
        if (authError) throw authError;
        
        if (session) {
            console.log('👤 Currently logged in as:', session.user.email);
        } else {
            console.log('👤 No user currently logged in');
        }
        
        // Check leaderboard table
        console.log('🏆 Checking leaderboard table structure...');
        const { data: columns, error: columnsError } = await window.supabase
            .from('leaderboard')
            .select()
            .limit(1);
            
        if (columnsError) throw columnsError;
        
        // Log column structure
        if (columns && columns.length > 0) {
            console.log('📝 Leaderboard columns:', Object.keys(columns[0]).map(key => ({
                name: key,
                type: typeof columns[0][key]
            })));
        }
        
        // Try a simple select
        console.log('🎮 Trying simple select from leaderboard...');
        const { data: sampleRow, error: selectError } = await window.supabase
            .from('leaderboard')
            .select('*')
            .limit(1)
            .single();
            
        if (selectError) throw selectError;
        
        if (sampleRow) {
            console.log('📊 Sample row structure:', sampleRow);
        } else {
            console.log('📊 No rows in leaderboard yet');
        }
        
        // All tests passed
        console.log('🎮 Game backend is ready!');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error.message);
        return false;
    }
}

// Wait for Supabase to be ready before running the test
setTimeout(async () => {
    const success = await testSupabaseConnection();
    if (success) {
        console.log('🎮 Game backend is ready!');
    } else {
        console.error('⚠️ Game backend connection failed - check your configuration');
    }
}, 500); // Give time for Supabase to initialize

// High Scores Functions using leaderboard table
async function getHighScores() {
    const { data, error } = await window.supabase
        .from('leaderboard')
        .select(`
            id,
            score,
            created_at,
            player_name,
            user_id,
            users (
                email
            )
        `)
        .order('score', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching high scores:', error.message);
        return [];
    }

    return data.map(entry => ({
        name: entry.player_name || 'Anonymous',
        emailInitials: entry.users?.email?.substring(0, 3).toUpperCase() || '???',
        time: entry.score
    })) || [];
}

// Update saveHighScore to include validation
async function saveHighScore(name, score) {
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session) {
        console.error('Must be logged in to save high score');
        return { success: false, reason: 'Must be logged in to save high score' };
    }

    // Validate name
    const validation = validatePlayerName(name);
    if (!validation.valid) {
        console.error('Invalid name:', validation.reason);
        return { success: false, reason: validation.reason };
    }

    const { data, error } = await window.supabase
        .from('leaderboard')
        .insert([
            {
                user_id: session.user.id,
                player_name: name.substring(0, 10), // Limit name to 10 characters
                score: score
            }
        ]);

    if (error) {
        console.error('Error saving high score:', error.message);
        return { success: false, reason: 'Failed to save score' };
    }

    return { success: true, reason: '' };
}

// Check if score qualifies for high scores
async function checkHighScore(score) {
    const { data, error } = await window.supabase
        .from('leaderboard')
        .select('score')
        .order('score', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error checking high score:', error.message);
        return false;
    }

    // If we have less than 5 scores, any score qualifies
    if (!data || data.length < 5) return true;

    // Otherwise, check if this score beats the lowest score
    return score > data[data.length - 1].score;
} 