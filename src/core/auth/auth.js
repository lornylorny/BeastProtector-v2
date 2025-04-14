import { supabase } from '/src/shared/config/config.js';

// Auth state
let currentUser = null;

// Update UI based on auth state
function updateAuthUI() {
    console.log('Updating auth UI...');
    const loginForm = document.getElementById('loginForm');
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');

    console.log('Found elements:', {
        loginForm: !!loginForm,
        userInfo: !!userInfo,
        userEmail: !!userEmail
    });

    if (currentUser) {
        console.log('User logged in:', currentUser.email);
        loginForm.style.display = 'none';
        userInfo.style.display = 'block';
        userEmail.textContent = currentUser.email;
    } else {
        console.log('No user logged in');
        loginForm.style.display = 'block';
        userInfo.style.display = 'none';
        userEmail.textContent = '';
    }
}

// Handle login
async function handleLogin() {
    console.log('Login attempt...');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        currentUser = data.user;
        updateAuthUI();
        console.log('Logged in successfully:', currentUser.email);
    } catch (error) {
        console.error('Error logging in:', error.message);
        alert('Failed to log in: ' + error.message);
    }
}

// Handle signup
async function handleSignup() {
    console.log('Signup attempt...');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) throw error;
        
        alert('Check your email for the confirmation link!');
    } catch (error) {
        console.error('Error signing up:', error.message);
        alert('Failed to sign up: ' + error.message);
    }
}

// Handle logout
async function handleLogout() {
    console.log('Logout attempt...');
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        updateAuthUI();
        console.log('Logged out successfully');
    } catch (error) {
        console.error('Error logging out:', error.message);
        alert('Failed to log out: ' + error.message);
    }
}

// Initialize auth
export function initAuth() {
    console.log('Initializing auth...');
    
    // Add event listeners to buttons
    const loginButton = document.getElementById('loginButton');
    const signupButton = document.getElementById('signupButton');
    const logoutButton = document.getElementById('logoutButton');

    console.log('Found buttons:', {
        loginButton: !!loginButton,
        signupButton: !!signupButton,
        logoutButton: !!logoutButton
    });

    if (loginButton) loginButton.addEventListener('click', handleLogin);
    if (signupButton) signupButton.addEventListener('click', handleSignup);
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
        currentUser = session?.user || null;
        updateAuthUI();
        console.log('Initial auth state:', currentUser ? 'logged in' : 'logged out');
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateAuthUI();
        console.log('Auth state changed:', event, currentUser ? 'logged in' : 'logged out');
    });
    
    console.log('Auth initialized');
}