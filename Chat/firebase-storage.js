// Firebase Storage Module for Chat Data
class FirebaseStorageManager {
    constructor() {
        this.db = null;
        this.currentUserId = null;
        this.isInitialized = false;
        
        // Wait for Firebase to be initialized
        this.waitForFirebase();
    }

    async waitForFirebase() {
        // Wait for Firebase to be available
        while (!window.firebaseDb) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.db = window.firebaseDb;
        
        // Import Firestore functions
        const { 
            collection, 
            doc, 
            addDoc, 
            updateDoc, 
            deleteDoc, 
            getDocs, 
            getDoc,
            query, 
            orderBy, 
            where,
            serverTimestamp 
        } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        this.collection = collection;
        this.doc = doc;
        this.addDoc = addDoc;
        this.updateDoc = updateDoc;
        this.deleteDoc = deleteDoc;
        this.getDocs = getDocs;
        this.getDoc = getDoc;
        this.query = query;
        this.orderBy = orderBy;
        this.where = where;
        this.serverTimestamp = serverTimestamp;
        
        this.isInitialized = true;
        console.log('Firebase Storage Manager initialized successfully');
    }

    // Debug function to check current state
    getDebugInfo() {
        return {
            isInitialized: this.isInitialized,
            currentUserId: this.currentUserId,
            hasDb: !!this.db,
            hasAuth: !!window.firebaseAuth,
            dbInstance: this.db
        };
    }

    setCurrentUser(userId) {
        this.currentUserId = userId;
        console.log('Firebase Storage Manager: Current user set to:', userId);
    }

    // Test Firebase connection and permissions
    async testConnection() {
        if (!this.isInitialized) {
            console.error('Firebase not initialized');
            return false;
        }

        if (!this.currentUserId) {
            console.error('No current user ID set');
            return false;
        }

        try {
            console.log('Testing Firebase connection and permissions...');
            console.log('Current user ID:', this.currentUserId);
            console.log('Database instance:', this.db);

            // Test writing to user's collection
            const testRef = this.collection(this.db, 'users', this.currentUserId, 'test');
            const testDoc = {
                test: true,
                timestamp: this.serverTimestamp(),
                userId: this.currentUserId
            };

            console.log('Attempting to write test document...');
            const docRef = await this.addDoc(testRef, testDoc);
            console.log('Test document written successfully with ID:', docRef.id);

            // Test reading the document back
            console.log('Attempting to read test documents...');
            const querySnapshot = await this.getDocs(testRef);
            console.log('Test documents read successfully. Count:', querySnapshot.size);

            // Clean up test document
            await this.deleteDoc(this.doc(this.db, 'users', this.currentUserId, 'test', docRef.id));
            console.log('Test document cleaned up');

            console.log('Firebase connection and permissions test successful');
            return true;
        } catch (error) {
            console.error('Firebase connection/permissions test failed:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            return false;
        }
    }

    // Save a chat to Firestore
    async saveChat(chatData) {
        if (!this.isInitialized || !this.currentUserId) {
            console.error('Cannot save chat: Firebase not initialized or user not authenticated');
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            console.log('Saving chat to Firestore:', chatData.id);

            const chatToSave = {
                id: chatData.id,
                title: chatData.title,
                messages: chatData.messages || [],
                timestamp: chatData.timestamp || Date.now(),
                userId: this.currentUserId,
                updatedAt: this.serverTimestamp()
            };

            // Only set createdAt for new documents
            if (!chatData.firestoreId) {
                chatToSave.createdAt = this.serverTimestamp();
            }

            if (chatData.firestoreId) {
                // Update existing chat
                console.log('Updating existing chat with Firestore ID:', chatData.firestoreId);
                const docRef = this.doc(this.db, 'users', this.currentUserId, 'chats', chatData.firestoreId);
                await this.updateDoc(docRef, chatToSave);
                console.log('Chat updated successfully');
                return chatData.firestoreId;
            } else {
                // Create new chat
                console.log('Creating new chat in Firestore');
                const chatRef = this.collection(this.db, 'users', this.currentUserId, 'chats');
                const docRef = await this.addDoc(chatRef, chatToSave);
                console.log('New chat created with ID:', docRef.id);
                return docRef.id;
            }
        } catch (error) {
            console.error('Error saving chat to Firestore:', error);
            console.error('Chat data:', chatData);
            console.error('Current user ID:', this.currentUserId);
            throw error;
        }
    }

    // Load all chats for the current user
    async loadChats() {
        if (!this.isInitialized || !this.currentUserId) {
            console.log('Cannot load chats: Firebase not initialized or user not authenticated');
            return {};
        }

        try {
            console.log('Loading chats from Firestore for user:', this.currentUserId);
            const chatsRef = this.collection(this.db, 'users', this.currentUserId, 'chats');
            const q = this.query(chatsRef, this.orderBy('updatedAt', 'desc'));
            const querySnapshot = await this.getDocs(q);

            const chats = {};
            querySnapshot.forEach((doc) => {
                const chatData = doc.data();
                console.log('Loaded chat:', chatData.id, chatData.title);
                chats[chatData.id] = {
                    ...chatData,
                    firestoreId: doc.id
                };
            });

            console.log('Total chats loaded:', Object.keys(chats).length);
            return chats;
        } catch (error) {
            console.error('Error loading chats from Firestore:', error);
            return {};
        }
    }

    // Delete a chat from Firestore
    async deleteChat(firestoreId) {
        console.log('=== FIREBASE DELETE CHAT ===');
        console.log('Firestore ID:', firestoreId);
        console.log('Is Initialized:', this.isInitialized);
        console.log('Current User ID:', this.currentUserId);
        console.log('Database instance:', !!this.db);

        if (!this.isInitialized) {
            const error = 'Firebase not initialized';
            console.error(error);
            throw new Error(error);
        }

        if (!this.currentUserId) {
            const error = 'User not authenticated';
            console.error(error);
            throw new Error(error);
        }

        if (!firestoreId) {
            const error = 'Missing Firestore ID';
            console.error(error);
            throw new Error(error);
        }

        try {
            console.log('Creating document reference...');
            const docRef = this.doc(this.db, 'users', this.currentUserId, 'chats', firestoreId);
            console.log('Document path:', `users/${this.currentUserId}/chats/${firestoreId}`);

            console.log('Attempting to delete document...');
            await this.deleteDoc(docRef);
            console.log('Chat deleted successfully from Firestore');
            console.log('=== FIREBASE DELETE COMPLETE ===');
        } catch (error) {
            console.error('Error deleting chat from Firestore:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('=== FIREBASE DELETE FAILED ===');
            throw error;
        }
    }



    // Save user preferences
    async saveUserPreferences(preferences) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const userRef = this.doc(this.db, 'users', this.currentUserId);
            await this.updateDoc(userRef, {
                preferences: preferences,
                updatedAt: this.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving user preferences:', error);
            throw error;
        }
    }

    // Load user preferences
    async loadUserPreferences() {
        if (!this.isInitialized || !this.currentUserId) {
            return null;
        }

        try {
            const userRef = this.doc(this.db, 'users', this.currentUserId);
            const docSnap = await this.getDoc(userRef);
            
            if (docSnap.exists()) {
                const userData = docSnap.data();
                return userData.preferences || null;
            }
            
            return null;
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return null;
        }
    }

    // Create user document if it doesn't exist
    async initializeUserDocument(userInfo) {
        if (!this.isInitialized || !this.currentUserId) {
            throw new Error('Firebase not initialized or user not authenticated');
        }

        try {
            const userRef = this.doc(this.db, 'users', this.currentUserId);
            const docSnap = await this.getDoc(userRef);
            
            if (!docSnap.exists()) {
                await this.updateDoc(userRef, {
                    email: userInfo.email,
                    displayName: userInfo.displayName,
                    photoURL: userInfo.photoURL,
                    createdAt: this.serverTimestamp(),
                    updatedAt: this.serverTimestamp(),
                    preferences: {}
                });
            }
        } catch (error) {
            // If document doesn't exist, create it using setDoc
            const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const userRef = this.doc(this.db, 'users', this.currentUserId);
            await setDoc(userRef, {
                email: userInfo.email,
                displayName: userInfo.displayName,
                photoURL: userInfo.photoURL,
                createdAt: this.serverTimestamp(),
                updatedAt: this.serverTimestamp(),
                preferences: {}
            });
        }
    }
}

// Initialize Firebase Storage Manager
let firebaseStorageManager;
document.addEventListener('DOMContentLoaded', () => {
    firebaseStorageManager = new FirebaseStorageManager();
    window.firebaseStorageManager = firebaseStorageManager;
    console.log('Firebase Storage Manager made available globally');
});
