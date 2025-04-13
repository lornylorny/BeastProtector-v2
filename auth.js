// Initialize Supabase client
const supabaseUrl = 'https://yzfvtzidzszdbsoxiduy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6ZnZ0emlkenN6ZGJzb3hpZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0Nzg0MjYsImV4cCI6MjA2MDA1NDQyNn0.FbgXJGlD40qcDnzfg18tuH4SJvPRufb4mdiNDa3dLLg';

// Create Supabase client
if (typeof supabase !== 'undefined') {
    window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
} else {
    console.error('Supabase library not loaded!');
}

// Wait for Supabase to be ready
async function initializeSupabase() {
    // Wait for the Supabase library to be available
    let attempts = 0;
    while (!window.supabase && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (typeof supabase !== 'undefined') {
            window.supabase = supabase.createClient(supabaseUrl, supabaseKey);
        }
        attempts++;
    }

    if (!window.supabase) {
        console.error('Failed to initialize Supabase after multiple attempts');
        return false;
    }

    // Initialize auth state
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        console.log('Initial auth state:', session ? 'Logged in' : 'Not logged in');
        
        // Set up auth state change listener
        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);
        });
        
        return true;
    } catch (error) {
        console.error('Error initializing auth:', error);
        return false;
    }
}

// Handle login
async function handleLogin() {
    if (!window.supabase) {
        console.error('Supabase not initialized');
        return;
    }

    const { data, error } = await window.supabase.auth.signInWithPassword({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });
    
    if (error) {
        console.error('Error logging in:', error.message);
        return;
    }
    
    console.log('Logged in successfully:', data);
}

// Handle signup
async function handleSignup() {
    if (!window.supabase) {
        console.error('Supabase not initialized');
        return;
    }

    const { data, error } = await window.supabase.auth.signUp({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    });
    
    if (error) {
        console.error('Error signing up:', error.message);
        return;
    }
    
    console.log('Signed up successfully:', data);
}

// Handle logout
async function handleLogout() {
    if (!window.supabase) {
        console.error('Supabase not initialized');
        return;
    }

    const { error } = await window.supabase.auth.signOut();
    
    if (error) {
        console.error('Error logging out:', error.message);
        return;
    }
    
    console.log('Logged out successfully');
}

// Check if user is logged in
async function checkAuth() {
    if (!window.supabase) {
        console.error('Supabase not initialized');
        return false;
    }

    const { data: { session } } = await window.supabase.auth.getSession();
    return session !== null;
}

// Initialize Supabase when the script loads
initializeSupabase().then(success => {
    if (success) {
        console.log('✅ Supabase initialized successfully');
    } else {
        console.error('❌ Failed to initialize Supabase');
    }
});