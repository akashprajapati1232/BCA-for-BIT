// Firebase Authentication Module
class FirebaseAuthManager {
    constructor() {
        this.auth = null;
        this.db = null;
        this.currentUser = null;
        this.authStateListeners = [];

        // Wait for Firebase to be initialized
        this.waitForFirebase();
    }

    async waitForFirebase() {
        // Wait for Firebase to be available
        while (!window.firebaseAuth || !window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.auth = window.firebaseAuth;
        this.db = window.firebaseDb;

        // Import Firebase Auth functions
        const {
            signInWithEmailAndPassword,
            createUserWithEmailAndPassword,
            updateProfile,
            signOut,
            onAuthStateChanged
        } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");

        this.signInWithEmailAndPassword = signInWithEmailAndPassword;
        this.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
        this.updateProfile = updateProfile;
        this.signOut = signOut;
        this.onAuthStateChanged = onAuthStateChanged;

        // Set up auth state listener
        this.setupAuthStateListener();

        // Initialize UI
        this.initializeAuthUI();
    }

    setupAuthStateListener() {
        this.onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;

            // Notify all listeners
            this.authStateListeners.forEach(listener => listener(user));

            // Update UI
            this.updateAuthUI();

            // Hide auth modal if user is authenticated, show if not
            if (user) {
                this.hideAuthModal();
            } else {
                this.showAuthModal();
            }
        });
    }

    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }



    async signOutUser() {
        try {
            await this.signOut(this.auth);
            console.log('User signed out');
        } catch (error) {
            console.error('Error signing out:', error);
            this.showAuthError('Failed to sign out. Please try again.');
            throw error;
        }
    }

    initializeAuthUI() {
        // Add auth section to sidebar footer (above the "Created by" text)
        const sidebarFooter = document.querySelector('.sidebar-footer');
        const footerText = sidebarFooter.querySelector('.footer-text');

        const authSection = document.createElement('div');
        authSection.className = 'auth-section';
        authSection.innerHTML = `
            <div class="auth-container" id="authContainer">
                <div class="user-mode" id="userMode" style="display: none;">
                    <div class="user-profile-dropdown">
                        <button class="user-profile-btn" id="userProfileBtn">
                            <div class="user-avatar-small">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <span class="user-name-display" id="userNameDisplay"></span>
                            <i class="fas fa-chevron-up dropdown-arrow" id="dropdownArrow"></i>
                        </button>
                        <div class="user-dropdown-menu" id="userDropdownMenu">
                            <button class="dropdown-item logout-btn" id="logoutBtn">
                                <i class="fas fa-sign-out-alt"></i>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert before the footer text
        sidebarFooter.insertBefore(authSection, footerText);

        // Add event listeners
        document.getElementById('logoutBtn').addEventListener('click', () => this.signOutUser());

        // Add dropdown toggle functionality
        document.getElementById('userProfileBtn').addEventListener('click', () => this.toggleUserDropdown());

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdownMenu');
            const profileBtn = document.getElementById('userProfileBtn');
            if (dropdown && profileBtn && !profileBtn.contains(e.target)) {
                dropdown.classList.remove('show');
                document.getElementById('dropdownArrow').classList.remove('rotated');
            }
        });
    }

    updateAuthUI() {
        const userMode = document.getElementById('userMode');
        const userNameDisplay = document.getElementById('userNameDisplay');

        if (this.currentUser) {
            userMode.style.display = 'block';
            // Update user info - show only the name
            userNameDisplay.textContent = this.currentUser.displayName || 'User';
        } else {
            userMode.style.display = 'none';
        }
    }

    toggleUserDropdown() {
        const dropdown = document.getElementById('userDropdownMenu');
        const arrow = document.getElementById('dropdownArrow');

        dropdown.classList.toggle('show');
        arrow.classList.toggle('rotated');
    }

    showAuthError(message) {
        // Create a simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
        `;
        
        document.body.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isUserAuthenticated() {
        return this.currentUser !== null;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    showAuthModal() {
        const modal = document.getElementById('authModalOverlay');
        if (modal) {
            modal.style.display = 'flex';

            // Show signup form by default
            this.showSignupForm();

            // Form switching event listeners
            document.getElementById('showLoginBtn').addEventListener('click', () => {
                this.showLoginForm();
            });

            document.getElementById('showSignupBtn').addEventListener('click', () => {
                this.showSignupForm();
            });

            // Form submission event listeners
            document.getElementById('createAccountBtn').addEventListener('click', () => {
                this.handleCreateAccount();
            });

            document.getElementById('emailLoginBtn').addEventListener('click', () => {
                this.handleEmailLogin();
            });
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('authModalOverlay');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showSignupForm() {
        document.getElementById('signupForm').style.display = 'flex';
        document.getElementById('loginForm').style.display = 'none';
    }

    showLoginForm() {
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'flex';
    }



    // Password validation function
    validatePassword(password) {
        const errors = [];

        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return errors;
    }

    async handleCreateAccount() {
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!name || !email || !password) {
            this.showAuthError('Please fill in all fields.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showAuthError('Please enter a valid email address.');
            return;
        }

        // Validate password strength
        const passwordErrors = this.validatePassword(password);
        if (passwordErrors.length > 0) {
            this.showAuthError('Password requirements:\n• ' + passwordErrors.join('\n• '));
            return;
        }

        try {
            const userCredential = await this.createUserWithEmailAndPassword(this.auth, email, password);

            // Update user profile with display name
            await this.updateProfile(userCredential.user, {
                displayName: name
            });

            console.log('Account created successfully:', userCredential.user);
            this.hideAuthModal();
        } catch (error) {
            console.error('Account creation failed:', error);
            this.showAuthError(this.getAuthErrorMessage(error.code));
        }
    }

    async handleEmailLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        console.log('=== LOGIN ATTEMPT ===');
        console.log('Email:', email);
        console.log('Password length:', password.length);
        console.log('Auth instance:', !!this.auth);

        if (!email || !password) {
            this.showAuthError('Please enter both email and password.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showAuthError('Please enter a valid email address.');
            return;
        }

        try {
            console.log('Attempting to sign in with Firebase...');
            const userCredential = await this.signInWithEmailAndPassword(this.auth, email, password);
            console.log('Login successful:', userCredential.user.uid);
            this.hideAuthModal();
        } catch (error) {
            console.error('Email login failed:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            // Show more specific error messages
            let errorMessage = this.getAuthErrorMessage(error.code);
            if (error.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            }

            this.showAuthError(errorMessage);
        }
    }



    showEmailLoginForm() {
        document.getElementById('loginOptions').style.display = 'none';
        document.getElementById('loginForm').style.display = 'flex';
    }

    showLoginOptions() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('loginOptions').style.display = 'flex';
        // Clear form
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }



    getAuthErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email. Please create an account first.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/invalid-credential':
                return 'Invalid email or password. Please check your credentials and try again.';
            case 'auth/user-disabled':
                return 'This account has been disabled. Please contact support.';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists. Please sign in instead.';
            case 'auth/weak-password':
                return 'Password is too weak. Please use at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection and try again.';
            case 'auth/operation-not-allowed':
                return 'Email/password sign-in is not enabled. Please contact support.';
            case 'auth/requires-recent-login':
                return 'Please log out and log in again to perform this action.';
            default:
                return `Authentication failed (${errorCode}). Please try again.`;
        }
    }
}

// Initialize Firebase Auth Manager
let firebaseAuthManager;
document.addEventListener('DOMContentLoaded', () => {
    firebaseAuthManager = new FirebaseAuthManager();
    window.firebaseAuthManager = firebaseAuthManager;
    console.log('Firebase Auth Manager made available globally');
});
