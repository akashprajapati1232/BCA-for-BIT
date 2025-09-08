// Chat System JavaScript
class ChatSystem {
    constructor() {
        this.currentChatId = null;
        this.chats = {};
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.welcomeScreen = document.getElementById('welcomeScreen');
        this.chatList = document.getElementById('chatList');
        this.isAuthenticated = false;
        this.currentUser = null;

        this.initializeEventListeners();
        this.autoResizeTextarea();
        this.waitForFirebaseAuth();
    }

    async waitForFirebaseAuth() {
        // Wait for Firebase Auth Manager to be available
        console.log('Waiting for Firebase services...');
        while (!window.firebaseAuthManager || !window.firebaseStorageManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('Firebase services available');

        // Set up auth state listener
        firebaseAuthManager.addAuthStateListener((user) => {
            this.handleAuthStateChange(user);
        });

        // Load initial chats
        await this.loadInitialChats();
    }

    async handleAuthStateChange(user) {
        console.log('=== AUTH STATE CHANGE ===');
        console.log('User:', user ? user.uid : 'null');
        console.log('User email:', user ? user.email : 'null');
        console.log('Firebase Storage Manager available:', !!window.firebaseStorageManager);

        this.isAuthenticated = !!user;
        this.currentUser = user;

        if (this.isAuthenticated && user) {
            // User logged in
            console.log('User authenticated, setting up Firebase storage for user:', user.uid);

            if (!window.firebaseStorageManager) {
                console.error('Firebase Storage Manager not available!');
                return;
            }

            firebaseStorageManager.setCurrentUser(user.uid);

            // Test Firebase connection
            try {
                const connectionTest = await firebaseStorageManager.testConnection();
                if (!connectionTest) {
                    console.error('Firebase connection test failed');
                } else {
                    console.log('Firebase connection test passed');
                }
            } catch (error) {
                console.error('Error testing Firebase connection:', error);
            }

            try {
                await firebaseStorageManager.initializeUserDocument({
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                });
                console.log('User document initialized');
            } catch (error) {
                console.error('Error initializing user document:', error);
            }

            // Load chats from Firebase
            console.log('Loading chats from Firebase...');
            try {
                this.chats = await firebaseStorageManager.loadChats();
                console.log('Chats loaded from Firebase:', Object.keys(this.chats).length);
            } catch (error) {
                console.error('Error loading chats from Firebase:', error);
                this.chats = {};
            }
        } else {
            // User logged out
            console.log('User not authenticated, clearing data');
            if (window.firebaseStorageManager) {
                firebaseStorageManager.setCurrentUser(null);
            }
            this.chats = {};
        }

        console.log('Final auth state - Is Authenticated:', this.isAuthenticated);
        console.log('Final auth state - Current User:', this.currentUser ? this.currentUser.uid : 'null');
        console.log('=== END AUTH STATE CHANGE ===');

        this.renderChatHistory();
    }

    // Debug function to check current state
    debugState() {
        console.log('=== CHAT SYSTEM DEBUG INFO ===');
        console.log('Is Authenticated:', this.isAuthenticated);
        console.log('Current User:', this.currentUser);
        console.log('Current User UID:', this.currentUser ? this.currentUser.uid : 'null');
        console.log('Total Chats:', Object.keys(this.chats).length);
        console.log('Chats:', this.chats);

        console.log('Firebase Auth Manager:', !!window.firebaseAuthManager);
        console.log('Firebase Storage Manager:', !!window.firebaseStorageManager);

        if (window.firebaseStorageManager) {
            console.log('Firebase Storage Manager Debug:', firebaseStorageManager.getDebugInfo());
        } else {
            console.log('Firebase Storage Manager not available');
        }

        if (window.firebaseAuthManager) {
            console.log('Firebase Auth Manager - Current User:', firebaseAuthManager.getCurrentUser());
            console.log('Firebase Auth Manager - Is Authenticated:', firebaseAuthManager.isUserAuthenticated());
        }

        console.log('=== END DEBUG INFO ===');
    }

    async loadInitialChats() {
        // Load chats based on current auth state
        if (this.isAuthenticated && this.currentUser) {
            this.chats = await firebaseStorageManager.loadChats();
        } else {
            this.chats = {};
        }
        this.renderChatHistory();
    }

    initializeEventListeners() {
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Input validation
        this.messageInput.addEventListener('input', () => {
            const hasText = this.messageInput.value.trim().length > 0;
            this.sendButton.disabled = !hasText;
        });

        // New chat button
        document.getElementById('newChatBtn').addEventListener('click', () => this.createNewChat());
        document.getElementById('mobileNewChat').addEventListener('click', () => this.createNewChat());

        // Sample questions
        document.querySelectorAll('.question-card').forEach(card => {
            card.addEventListener('click', () => {
                const question = card.dataset.question;
                this.messageInput.value = question;
                this.sendButton.disabled = false;
                this.sendMessage();
            });
        });

        // Mobile sidebar
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('sidebarOverlay').addEventListener('click', () => this.closeSidebar());
    }

    autoResizeTextarea() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    createNewChat() {
        this.currentChatId = null;
        this.showWelcomeScreen();
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.updateActiveChat();
        this.closeSidebar();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Create new chat if none exists
        if (!this.currentChatId) {
            this.currentChatId = this.generateChatId();
            this.chats[this.currentChatId] = {
                id: this.currentChatId,
                title: this.generateChatTitle(message),
                messages: [],
                timestamp: Date.now()
            };
        }

        // Add user message
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.messageInput.style.height = 'auto';

        // Show chat area if hidden
        this.showChatArea();

        // Show typing indicator
        this.showTypingIndicator();

        // Simulate AI response
        setTimeout(() => {
            this.hideTypingIndicator();
            const response = this.generateAIResponse(message);
            this.addMessage('assistant', response);
        }, 1500 + Math.random() * 1000);

        // Save and update UI
        await this.saveChats();
        this.renderChatHistory();
        this.updateActiveChat();
    }

    addMessage(role, content) {
        const message = {
            id: Date.now(),
            role: role,
            content: content,
            timestamp: Date.now()
        };

        this.chats[this.currentChatId].messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    renderMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-${message.role === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(message.content)}</div>
            </div>
        `;
        this.chatMessages.appendChild(messageDiv);
    }

    formatMessage(content) {
        // Simple formatting for AI responses
        if (content.includes('**')) {
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        }
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        // Format lists
        if (content.includes('•')) {
            const lines = content.split('<br>');
            let formatted = '';
            let inList = false;
            
            for (let line of lines) {
                if (line.trim().startsWith('•')) {
                    if (!inList) {
                        formatted += '<ul>';
                        inList = true;
                    }
                    formatted += `<li>${line.replace('•', '').trim()}</li>`;
                } else {
                    if (inList) {
                        formatted += '</ul>';
                        inList = false;
                    }
                    formatted += line + '<br>';
                }
            }
            
            if (inList) {
                formatted += '</ul>';
            }
            
            content = formatted;
        }
        
        return content;
    }

    generateAIResponse(userMessage) {
        const responses = {
            'dbms': `**DBMS Normalization** is a database design technique that reduces data redundancy and eliminates undesirable characteristics like Insertion, Update, and Deletion Anomalies.

**Key Normal Forms:**
• **1NF (First Normal Form):** Eliminates repeating groups
• **2NF (Second Normal Form):** Eliminates partial dependencies  
• **3NF (Third Normal Form):** Eliminates transitive dependencies
• **BCNF (Boyce-Codd Normal Form):** A stricter version of 3NF

**Benefits:**
• Reduces storage space
• Maintains data integrity
• Makes database maintenance easier
• Prevents data anomalies`,

            'oop': `**Object-Oriented Programming (OOP)** is a programming paradigm based on the concept of "objects" which contain data and code.

**Core OOP Concepts:**
• **Encapsulation:** Bundling data and methods together
• **Inheritance:** Creating new classes based on existing ones
• **Polymorphism:** Objects taking multiple forms
• **Abstraction:** Hiding complex implementation details

**Benefits:**
• Code reusability
• Modularity and organization
• Easier maintenance
• Real-world modeling`,

            'data structures': `**Data Structures** are ways of organizing and storing data in a computer so that it can be accessed and modified efficiently.

**Common Data Structures:**
• **Arrays:** Fixed-size sequential collection
• **Linked Lists:** Dynamic linear data structure
• **Stacks:** Last In, First Out (LIFO) structure
• **Queues:** First In, First Out (FIFO) structure
• **Trees:** Hierarchical data structure
• **Graphs:** Network of connected nodes

**Applications:**
• Algorithm implementation
• Database systems
• Operating systems
• Web development`,

            'networking': `**Computer Networking** is the practice of connecting computers and other devices to share resources and communicate.

**Key Concepts:**
• **Protocols:** Rules for communication (TCP/IP, HTTP, FTP)
• **OSI Model:** 7-layer networking framework
• **IP Addressing:** Unique identifiers for devices
• **Routing:** Path determination for data packets

**Network Types:**
• **LAN:** Local Area Network
• **WAN:** Wide Area Network
• **MAN:** Metropolitan Area Network
• **Internet:** Global network of networks

**Applications:**
• File sharing
• Email communication
• Web browsing
• Remote access`
        };

        // Find matching response
        const lowerMessage = userMessage.toLowerCase();
        for (let key in responses) {
            if (lowerMessage.includes(key)) {
                return responses[key];
            }
        }

        // Default response
        return `Thank you for your question about "${userMessage}". 

I'm here to help with BCA subjects including:
• Database Management Systems (DBMS)
• Object-Oriented Programming (OOP)
• Data Structures and Algorithms
• Computer Networks
• Software Engineering
• Web Development
• Java Programming
• And many more!

Could you please be more specific about what you'd like to learn?`;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant typing';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span>GPT for BCA is typing</span>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showWelcomeScreen() {
        this.welcomeScreen.style.display = 'flex';
        this.chatMessages.style.display = 'none';
        this.chatMessages.innerHTML = '';
    }

    showChatArea() {
        this.welcomeScreen.style.display = 'none';
        this.chatMessages.style.display = 'flex';
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }

    generateChatTitle(firstMessage) {
        return firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    }

    renderChatHistory() {
        this.chatList.innerHTML = '';
        
        const sortedChats = Object.values(this.chats).sort((a, b) => b.timestamp - a.timestamp);
        
        if (sortedChats.length === 0) {
            this.chatList.innerHTML = '<p style="color: #8e8ea0; font-size: 0.8rem; text-align: center; padding: 1rem;">No chats yet</p>';
            return;
        }

        sortedChats.forEach(chat => {
            const chatItem = document.createElement('button');
            chatItem.className = 'chat-item';
            chatItem.innerHTML = `
                <span class="chat-item-content">${chat.title}</span>
                <button class="chat-item-delete" onclick="chatSystem.deleteChat('${chat.id}', event)">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatList.appendChild(chatItem);
        });
    }

    loadChat(chatId) {
        this.currentChatId = chatId;
        const chat = this.chats[chatId];
        
        this.showChatArea();
        this.chatMessages.innerHTML = '';
        
        chat.messages.forEach(message => {
            this.renderMessage(message);
        });
        
        this.updateActiveChat();
        this.closeSidebar();
        this.scrollToBottom();
    }

    async deleteChat(chatId, event) {
        event.stopPropagation();

        if (confirm('Are you sure you want to delete this chat?')) {
            console.log('=== DELETING CHAT ===');
            console.log('Chat ID:', chatId);

            const chat = this.chats[chatId];
            console.log('Chat data:', chat);
            console.log('Has Firestore ID:', !!chat?.firestoreId);
            console.log('Firestore ID:', chat?.firestoreId);
            console.log('Is Authenticated:', this.isAuthenticated);
            console.log('Current User:', this.currentUser?.uid);

            // Delete from Firebase if user is authenticated and chat has Firestore ID
            if (this.isAuthenticated && chat && chat.firestoreId) {
                try {
                    console.log('Attempting to delete from Firebase...');
                    await firebaseStorageManager.deleteChat(chat.firestoreId);
                    console.log('Successfully deleted from Firebase');
                } catch (error) {
                    console.error('Error deleting chat from Firebase:', error);
                    console.error('Error details:', error.message);
                    // Show user-friendly error message
                    alert('Failed to delete chat from database. Please try again.');
                    return; // Don't proceed with local deletion if Firebase deletion failed
                }
            } else {
                console.log('Skipping Firebase deletion:');
                console.log('- Is Authenticated:', this.isAuthenticated);
                console.log('- Chat exists:', !!chat);
                console.log('- Has Firestore ID:', !!chat?.firestoreId);
            }

            // Delete from local memory
            console.log('Deleting from local memory...');
            delete this.chats[chatId];

            // If this was the current chat, create a new one
            if (this.currentChatId === chatId) {
                console.log('Deleted chat was current chat, creating new chat...');
                this.createNewChat();
            }

            // Re-render the chat history
            console.log('Re-rendering chat history...');
            this.renderChatHistory();
            console.log('=== CHAT DELETION COMPLETE ===');
        }
    }

    updateActiveChat() {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        if (this.currentChatId) {
            const activeItem = Array.from(document.querySelectorAll('.chat-item')).find(item => {
                return item.querySelector('.chat-item-content').textContent === this.chats[this.currentChatId].title;
            });
            
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }



    async saveChats() {
        if (this.isAuthenticated && this.currentUser) {
            // Save to Firebase for authenticated users
            console.log('Saving chats to Firebase. Total chats:', Object.keys(this.chats).length);
            try {
                for (const [chatId, chatData] of Object.entries(this.chats)) {
                    console.log('Processing chat:', chatId, 'Has Firestore ID:', !!chatData.firestoreId);
                    if (!chatData.firestoreId) {
                        // New chat, save to Firebase
                        console.log('Saving new chat to Firebase:', chatId);
                        const firestoreId = await firebaseStorageManager.saveChat(chatData);
                        this.chats[chatId].firestoreId = firestoreId;
                        console.log('New chat saved with Firestore ID:', firestoreId);
                    } else {
                        // Update existing chat in Firebase
                        console.log('Updating existing chat in Firebase:', chatId);
                        await firebaseStorageManager.saveChat(chatData);
                        console.log('Chat updated successfully');
                    }
                }
                console.log('All chats saved successfully');
            } catch (error) {
                console.error('Error saving chats to Firebase:', error);
                console.error('Error details:', error.message);
                console.error('Error stack:', error.stack);
            }
        } else {
            console.log('Cannot save chats: User not authenticated');
        }
    }


}

// Initialize chat system when page loads
let chatSystem;
document.addEventListener('DOMContentLoaded', () => {
    chatSystem = new ChatSystem();
    window.chatSystem = chatSystem;

    // Make debug functions available globally
    window.debugChat = () => chatSystem.debugState();
    window.testFirebase = async () => {
        if (window.firebaseStorageManager) {
            return await window.firebaseStorageManager.testConnection();
        } else {
            console.error('Firebase Storage Manager not available');
            return false;
        }
    };
    window.forceAuthCheck = () => {
        if (window.firebaseAuthManager && window.firebaseAuthManager.auth) {
            const user = window.firebaseAuthManager.auth.currentUser;
            console.log('Force auth check - Current user:', user);
            if (user) {
                chatSystem.handleAuthStateChange(user);
            }
        }
    };
    window.forceSaveChats = async () => {
        console.log('Force saving chats...');
        await chatSystem.saveChats();
    };
    window.testDelete = async (chatId) => {
        console.log('Testing delete for chat ID:', chatId);
        const chat = chatSystem.chats[chatId];
        if (chat && chat.firestoreId) {
            console.log('Chat found with Firestore ID:', chat.firestoreId);
            try {
                await firebaseStorageManager.deleteChat(chat.firestoreId);
                console.log('Delete test successful');
            } catch (error) {
                console.error('Delete test failed:', error);
            }
        } else {
            console.log('Chat not found or no Firestore ID');
        }
    };
});
