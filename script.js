// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDemoKey-ReplaceWithActualFirebaseKey",
    authDomain: "winarena-game.firebaseapp.com",
    databaseURL: "https://winarena-game-default-rtdb.firebaseio.com",
    projectId: "winarena-game",
    storageBucket: "winarena-game.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// TON Connect Configuration
let tonConnectUI = null;
let connectedWallet = null;

// Telegram Web App
let tg = null;
let user = null;

// Global Variables
let currentUser = null;
let userBalance = 0;
let appData = {
    games: [],
    tasks: [],
    posts: [],
    categories: ['Action', 'Puzzle', 'Strategy', 'Casual'],
    settings: {
        tonToBtxRate: 500,
        minDeposit: 1,
        minWithdraw: 250,
        adReward: 0.1,
        referralReward: 10,
        referralCommission: 0.2
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    initializeTelegramWebApp();
    initializeTONConnect();
    setupEventListeners();
    await initializeApp();
    
    // Show daily check-in if needed
    await checkDailyCheckIn();
    
    // Hide loading overlay
    document.getElementById('loadingOverlay').style.display = 'none';
});

// Initialize Telegram Web App
function initializeTelegramWebApp() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('Telegram user:', user);
        }
    }
}

// Initialize TON Connect
function initializeTONConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: 'https://your-domain.com/tonconnect-manifest.json',
            buttonRootId: null
        });
        
        tonConnectUI.onStatusChange(wallet => {
            connectedWallet = wallet;
            updateWalletUI();
        });
    } catch (error) {
        console.error('TON Connect initialization failed:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const screen = this.dataset.screen;
            switchScreen(screen);
        });
    });

    // Category Filters
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterGames(this.dataset.category);
        });
    });

    // Sort Games
    document.getElementById('sortGames').addEventListener('change', function() {
        sortGames(this.value);
    });

    // Search Games
    document.getElementById('gameSearch').addEventListener('input', function() {
        searchGames(this.value);
    });

    // Deposit Amount
    document.getElementById('depositAmount').addEventListener('input', function() {
        updateConversionInfo(this.value);
    });

    // Sound Toggle
    document.getElementById('soundToggle').addEventListener('change', function() {
        toggleSound(this.checked);
    });

    // Dark Mode Toggle
    document.getElementById('darkModeToggle').addEventListener('change', function() {
        toggleDarkMode(this.checked);
    });

    // History Filter
    document.getElementById('historyFilter').addEventListener('change', function() {
        filterHistory(this.value);
    });

    // Post Content
    document.getElementById('postContent').addEventListener('input', function() {
        validatePostContent(this.value);
    });
}

// Initialize App
async function initializeApp() {
    try {
        // Authenticate user
        await authenticateUser();
        
        // Load user data
        await loadUserData();
        
        // Load app data
        await loadAppData();
        
        // Initialize screens
        initializeHomeScreen();
        initializeDiscoverScreen();
        initializeWalletScreen();
        initializeEarnScreen();
        initializeReferralScreen();
        initializeProfileScreen();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        // Update UI
        updateUI();
        
    } catch (error) {
        console.error('App initialization failed:', error);
        showNotification('Failed to initialize app', 'error');
    }
}

// Authenticate User
async function authenticateUser() {
    if (user && user.id) {
        // Create or get user from Firebase
        const userRef = database.ref('users/' + user.id);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
            // Create new user
            const newUser = {
                telegramId: user.id,
                username: user.username || 'User' + user.id,
                firstName: user.first_name || '',
                lastName: user.last_name || '',
                photoUrl: user.photo_url || '',
                balance: 0,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastActive: firebase.database.ServerValue.TIMESTAMP,
                dailyCheckIn: {
                    streak: 0,
                    lastClaimed: null
                },
                statistics: {
                    adsWatched: 0,
                    tasksCompleted: 0,
                    referrals: 0,
                    totalEarned: 0
                },
                settings: {
                    soundEnabled: true,
                    darkMode: false,
                    notificationsEnabled: true
                },
                wallet: {
                    connected: false,
                    address: null
                },
                referrals: {
                    referredBy: null,
                    referredUsers: []
                }
            };
            
            // Check if user was referred
            const urlParams = new URLSearchParams(window.location.search);
            const referrerId = urlParams.get('referrer');
            if (referrerId && referrerId !== user.id.toString()) {
                newUser.referrals.referredBy = referrerId;
            }
            
            await userRef.set(newUser);
            currentUser = newUser;
        } else {
            currentUser = snapshot.val();
            // Update last active
            await userRef.update({
                lastActive: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Process referral if exists
        if (currentUser.referrals.referredBy) {
            await processReferral(currentUser.referrals.referredBy);
        }
    }
}

// Load User Data
async function loadUserData() {
    if (!currentUser) return;
    
    // Load additional user data
    const balanceRef = database.ref('users/' + currentUser.telegramId + '/balance');
    balanceRef.on('value', (snapshot) => {
        userBalance = snapshot.val() || 0;
        updateBalanceDisplay();
    });
    
    // Load wallet info
    const walletRef = database.ref('users/' + currentUser.telegramId + '/wallet');
    walletRef.on('value', (snapshot) => {
        const walletData = snapshot.val() || {};
        currentUser.wallet = walletData;
        updateWalletUI();
    });
}

// Load App Data
async function loadAppData() {
    try {
        // Load games
        const gamesRef = database.ref('games');
        gamesRef.on('value', (snapshot) => {
            appData.games = snapshot.val() || [];
            displayGames(appData.games);
        });
        
        // Load tasks
        const tasksRef = database.ref('tasks');
        tasksRef.on('value', (snapshot) => {
            appData.tasks = snapshot.val() || [];
            displayTasks(appData.tasks);
        });
        
        // Load posts
        const postsRef = database.ref('posts');
        postsRef.orderByChild('createdAt').limitToLast(50).on('value', (snapshot) => {
            const posts = snapshot.val() || {};
            appData.posts = Object.values(posts).reverse();
            displayPosts(appData.posts);
        });
        
        // Load settings
        const settingsRef = database.ref('settings');
        settingsRef.on('value', (snapshot) => {
            appData.settings = { ...appData.settings, ...snapshot.val() };
        });
        
    } catch (error) {
        console.error('Failed to load app data:', error);
    }
}

// Switch Screen
function switchScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show selected screen
    document.getElementById(screenName + 'Screen').classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenName) {
            item.classList.add('active');
        }
    });
    
    // Play sound effect
    if (currentUser.settings.soundEnabled) {
        playSound('switch');
    }
}

// Initialize Home Screen
function initializeHomeScreen() {
    displayGames(appData.games);
}

// Display Games
function displayGames(games) {
    const gamesList = document.getElementById('gamesList');
    
    if (!games || games.length === 0) {
        gamesList.innerHTML = '<p class="text-center">No games available</p>';
        return;
    }
    
    gamesList.innerHTML = games.map(game => `
        <div class="game-card" onclick="playGame('${game.id}')">
            <img src="${game.imageUrl || 'https://picsum.photos/seed/game' + game.id + '/160/120'}" alt="${game.title}">
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-description">${game.description}</div>
                <button class="play-btn">Play Now</button>
            </div>
            <div class="game-stats">
                <i class="fas fa-eye"></i>
                <span>${game.views || 0}</span>
            </div>
        </div>
    `).join('');
}

// Filter Games
function filterGames(category) {
    let filteredGames = appData.games;
    
    if (category !== 'all') {
        filteredGames = appData.games.filter(game => game.category === category);
    }
    
    displayGames(filteredGames);
}

// Sort Games
function sortGames(sortBy) {
    let sortedGames = [...appData.games];
    
    switch (sortBy) {
        case 'top':
            sortedGames.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'new':
            sortedGames.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'trending':
            sortedGames.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
    }
    
    displayGames(sortedGames);
}

// Search Games
function searchGames(query) {
    if (!query) {
        displayGames(appData.games);
        return;
    }
    
    const filteredGames = appData.games.filter(game => 
        game.title.toLowerCase().includes(query.toLowerCase()) ||
        game.description.toLowerCase().includes(query.toLowerCase())
    );
    
    displayGames(filteredGames);
}

// Play Game
async function playGame(gameId) {
    const game = appData.games.find(g => g.id === gameId);
    if (!game) return;
    
    // Increment view count
    const gameRef = database.ref('games/' + gameId);
    await gameRef.update({
        views: (game.views || 0) + 1
    });
    
    // Open game
    if (game.url) {
        if (tg && tg.openLink) {
            tg.openLink(game.url);
        } else {
            window.open(game.url, '_blank');
        }
    }
    
    showNotification(`Playing ${game.title}`, 'success');
}

// Initialize Discover Screen
function initializeDiscoverScreen() {
    displayPosts(appData.posts);
}

// Display Posts
function displayPosts(posts) {
    const postsContainer = document.getElementById('postsContainer');
    
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = '<p class="text-center">No posts yet. Be the first to post!</p>';
        return;
    }
    
    postsContainer.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <img src="${post.authorPhoto || 'https://picsum.photos/seed/user' + post.authorId + '/40/40'}" alt="${post.authorName}" class="post-avatar">
                <div class="post-info">
                    <h4>${post.authorName}</h4>
                    <div class="post-time">${formatTimeAgo(post.createdAt)}</div>
                </div>
                ${isAdmin() ? `
                    <button class="post-action-btn" onclick="deletePost('${post.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
            ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
            <div class="post-actions">
                <button class="post-action-btn ${post.likedBy?.includes(currentUser.telegramId) ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${post.likes || 0}</span>
                </button>
                <button class="post-action-btn" onclick="toggleComments('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>${Object.keys(post.comments || {}).length}</span>
                </button>
                <button class="post-action-btn" onclick="sharePost('${post.id}')">
                    <i class="fas fa-share"></i>
                </button>
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                ${Object.entries(post.comments || {}).map(([commentId, comment]) => `
                    <div class="comment">
                        <img src="${comment.authorPhoto || 'https://picsum.photos/seed/user' + comment.authorId + '/32/32'}" alt="${comment.authorName}" class="comment-avatar">
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.authorName}</span>
                                <span class="comment-time">${formatTimeAgo(comment.createdAt)}</span>
                            </div>
                            <div class="comment-text">${comment.content}</div>
                        </div>
                        ${isAdmin() || comment.authorId === currentUser.telegramId ? `
                            <button onclick="deleteComment('${post.id}', '${commentId}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
                <div class="comment-input-group">
                    <input type="text" class="comment-input" placeholder="Add a comment..." id="comment-input-${post.id}">
                    <button class="comment-submit" onclick="addComment('${post.id}')">Post</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Show Create Post Modal
function showCreatePost() {
    document.getElementById('createPostModal').classList.add('active');
    document.getElementById('postContent').value = '';
    document.getElementById('imagePreview').innerHTML = '';
}

// Close Create Post Modal
function closeCreatePost() {
    document.getElementById('createPostModal').classList.remove('active');
}

// Attach Image
function attachImage() {
    document.getElementById('imageUpload').click();
}

// Handle Image Upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Compress and upload image
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Submit Post
async function submitPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('imageUpload').files[0];
    
    if (!content && !imageFile) {
        showNotification('Please add content or image', 'warning');
        return;
    }
    
    if (containsLink(content)) {
        showNotification('Links are not allowed in posts', 'error');
        return;
    }
    
    try {
        let imageUrl = null;
        
        // Upload image if exists
        if (imageFile) {
            const compressedImage = await compressImage(imageFile);
            const storageRef = storage.ref('posts/' + Date.now() + '_' + imageFile.name);
            await storageRef.put(compressedImage);
            imageUrl = await storageRef.getDownloadURL();
        }
        
        // Create post
        const post = {
            id: Date.now().toString(),
            authorId: currentUser.telegramId,
            authorName: currentUser.firstName || currentUser.username,
            authorPhoto: currentUser.photoUrl,
            content: content,
            imageUrl: imageUrl,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            likes: 0,
            likedBy: [],
            comments: {}
        };
        
        await database.ref('posts/' + post.id).set(post);
        
        closeCreatePost();
        showNotification('Post created successfully', 'success');
        
    } catch (error) {
        console.error('Failed to create post:', error);
        showNotification('Failed to create post', 'error');
    }
}

// Validate Post Content
function validatePostContent(content) {
    if (containsLink(content)) {
        showNotification('Links are not allowed', 'warning');
    }
}

// Contains Link Check
function containsLink(text) {
    const linkPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    return linkPattern.test(text);
}

// Toggle Like
async function toggleLike(postId) {
    const postRef = database.ref('posts/' + postId);
    const snapshot = await postRef.once('value');
    const post = snapshot.val();
    
    if (!post) return;
    
    const likedBy = post.likedBy || [];
    const userIndex = likedBy.indexOf(currentUser.telegramId);
    
    if (userIndex === -1) {
        // Add like
        likedBy.push(currentUser.telegramId);
        await postRef.update({
            likedBy: likedBy,
            likes: (post.likes || 0) + 1
        });
    } else {
        // Remove like
        likedBy.splice(userIndex, 1);
        await postRef.update({
            likedBy: likedBy,
            likes: Math.max(0, (post.likes || 0) - 1)
        });
    }
}

// Toggle Comments
function toggleComments(postId) {
    const commentsSection = document.getElementById('comments-' + postId);
    commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
}

// Add Comment
async function addComment(postId) {
    const input = document.getElementById('comment-input-' + postId);
    const content = input.value.trim();
    
    if (!content) return;
    
    if (containsLink(content)) {
        showNotification('Links are not allowed in comments', 'error');
        return;
    }
    
    const comment = {
        id: Date.now().toString(),
        authorId: currentUser.telegramId,
        authorName: currentUser.firstName || currentUser.username,
        authorPhoto: currentUser.photoUrl,
        content: content,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    await database.ref('posts/' + postId + '/comments/' + comment.id).set(comment);
    input.value = '';
    
    showNotification('Comment added', 'success');
}

// Delete Post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    await database.ref('posts/' + postId).remove();
    showNotification('Post deleted', 'success');
}

// Delete Comment
async function deleteComment(postId, commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    await database.ref('posts/' + postId + '/comments/' + commentId).remove();
    showNotification('Comment deleted', 'success');
}

// Share Post
async function sharePost(postId) {
    const shareUrl = window.location.origin + '?post=' + postId;
    
    if (navigator.share) {
        await navigator.share({
            title: 'Check out this post on WinArena',
            text: 'Check out this interesting post!',
            url: shareUrl
        });
    } else {
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        showNotification('Link copied to clipboard', 'success');
    }
}

// Initialize Wallet Screen
function initializeWalletScreen() {
    updateWalletUI();
}

// Update Wallet UI
function updateWalletUI() {
    const balanceElement = document.getElementById('walletBalance');
    if (balanceElement) {
        balanceElement.textContent = userBalance.toFixed(2);
    }
    
    const connectBtn = document.getElementById('connectWalletBtn');
    const disconnectBtn = document.getElementById('disconnectWalletBtn');
    const walletStatus = document.getElementById('walletStatus');
    
    if (connectedWallet && connectedWallet.account) {
        // Wallet connected
        if (connectBtn) connectBtn.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
        if (walletStatus) {
            walletStatus.innerHTML = `
                <p>Connected: ${connectedWallet.account.address.slice(0, 6)}...${connectedWallet.account.address.slice(-4)}</p>
                <button onclick="copyWalletAddress()">Copy Address</button>
            `;
        }
    } else {
        // Wallet not connected
        if (connectBtn) connectBtn.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
        if (walletStatus) {
            walletStatus.innerHTML = '<p>Connect TON wallet first</p>';
        }
    }
}

// Show Deposit
function showDeposit() {
    document.getElementById('depositSection').classList.remove('hidden');
    document.getElementById('withdrawSection').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
}

// Show Withdraw
function showWithdraw() {
    document.getElementById('depositSection').classList.add('hidden');
    document.getElementById('withdrawSection').classList.remove('hidden');
    document.getElementById('historySection').classList.add('hidden');
    
    // Check if wallet is connected
    if (!connectedWallet || !connectedWallet.account) {
        showNotification('Please connect your TON wallet first', 'warning');
    }
}

// Show History
function showHistory() {
    document.getElementById('depositSection').classList.add('hidden');
    document.getElementById('withdrawSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');
    
    loadTransactionHistory();
}

// Update Conversion Info
function updateConversionInfo(tonAmount) {
    const btxAmount = (tonAmount * appData.settings.tonToBtxRate).toFixed(2);
    document.getElementById('btxReceive').textContent = btxAmount + ' BTX';
}

// Confirm Deposit
async function confirmDeposit() {
    const tonAmount = parseFloat(document.getElementById('depositAmount').value);
    
    if (!tonAmount || tonAmount < appData.settings.minDeposit) {
        showNotification(`Minimum deposit is ${appData.settings.minDeposit} TON`, 'warning');
        return;
    }
    
    try {
        // Create deposit record
        const deposit = {
            id: Date.now().toString(),
            userId: currentUser.telegramId,
            tonAmount: tonAmount,
            btxAmount: tonAmount * appData.settings.tonToBtxRate,
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            walletAddress: connectedWallet?.account?.address
        };
        
        await database.ref('deposits/' + deposit.id).set(deposit);
        
        // Open TON wallet for payment
        if (tonConnectUI) {
            // This would integrate with TON Connect to initiate payment
            showNotification('Opening TON wallet for payment...', 'success');
            // Actual payment logic would go here
        } else {
            showNotification('Please connect TON wallet first', 'warning');
        }
        
    } catch (error) {
        console.error('Deposit failed:', error);
        showNotification('Deposit failed', 'error');
    }
}

// Confirm Withdraw
async function confirmWithdraw() {
    const btxAmount = parseFloat(document.getElementById('withdrawAmount').value);
    
    if (!btxAmount || btxAmount < appData.settings.minWithdraw) {
        showNotification(`Minimum withdrawal is ${appData.settings.minWithdraw} BTX`, 'warning');
        return;
    }
    
    if (btxAmount > userBalance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    if (!connectedWallet || !connectedWallet.account) {
        showNotification('Please connect your TON wallet first', 'warning');
        return;
    }
    
    try {
        // Create withdrawal record
        const withdrawal = {
            id: Date.now().toString(),
            userId: currentUser.telegramId,
            btxAmount: btxAmount,
            tonAmount: btxAmount / appData.settings.tonToBtxRate,
            status: 'pending',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            walletAddress: connectedWallet.account.address
        };
        
        await database.ref('withdrawals/' + withdrawal.id).set(withdrawal);
        
        // Deduct from balance
        await database.ref('users/' + currentUser.telegramId + '/balance')
            .set(userBalance - btxAmount);
        
        // Send notification to admin bot
        sendBotNotification('withdrawal_request', withdrawal);
        
        showNotification('Withdrawal request submitted', 'success');
        
        // Reset form
        document.getElementById('withdrawAmount').value = '';
        
    } catch (error) {
        console.error('Withdrawal failed:', error);
        showNotification('Withdrawal failed', 'error');
    }
}

// Load Transaction History
async function loadTransactionHistory() {
    try {
        // Load deposits
        const depositsRef = database.ref('deposits')
            .orderByChild('userId')
            .equalTo(currentUser.telegramId);
        
        // Load withdrawals
        const withdrawalsRef = database.ref('withdrawals')
            .orderByChild('userId')
            .equalTo(currentUser.telegramId);
        
        const [depositsSnapshot, withdrawalsSnapshot] = await Promise.all([
            depositsRef.once('value'),
            withdrawalsRef.once('value')
        ]);
        
        const deposits = Object.values(depositsSnapshot.val() || {});
        const withdrawals = Object.values(withdrawalsSnapshot.val() || {});
        
        const transactions = [...deposits, ...withdrawals]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        displayTransactionHistory(transactions);
        
    } catch (error) {
        console.error('Failed to load transaction history:', error);
    }
}

// Display Transaction History
function displayTransactionHistory(transactions) {
    const historyList = document.getElementById('historyList');
    
    if (!transactions || transactions.length === 0) {
        historyList.innerHTML = '<p class="text-center">No transactions yet</p>';
        return;
    }
    
    historyList.innerHTML = transactions.map(tx => `
        <div class="history-item">
            <div class="history-info">
                <div class="history-type">${tx.btxAmount ? 'Deposit' : 'Withdrawal'}</div>
                <div class="history-date">${formatDate(tx.createdAt)}</div>
            </div>
            <div class="history-amount">
                <div class="amount-value ${tx.btxAmount ? 'deposit' : 'withdraw'}">
                    ${tx.btxAmount ? '+' : '-'}${tx.btxAmount || tx.btxAmount} BTX
                </div>
                <div class="status-badge ${tx.status}">
                    ${tx.status}
                </div>
            </div>
        </div>
    `).join('');
}

// Filter History
function filterHistory(filter) {
    // Implementation for filtering transaction history
    loadTransactionHistory();
}

// Initialize Earn Screen
function initializeEarnScreen() {
    updateEarnStats();
}

// Update Earn Stats
async function updateEarnStats() {
    try {
        const statsRef = database.ref('users/' + currentUser.telegramId + '/statistics');
        const snapshot = await statsRef.once('value');
        const stats = snapshot.val() || {};
        
        document.getElementById('todayWatched').textContent = stats.adsWatchedToday || 0;
        document.getElementById('weekWatched').textContent = stats.adsWatchedWeek || 0;
        document.getElementById('lifetimeWatched').textContent = stats.adsWatched || 0;
        
    } catch (error) {
        console.error('Failed to update earn stats:', error);
    }
}

// Watch Ad
async function watchAd() {
    try {
        // Load Monetag ads
        const adsContainer = document.getElementById('adsContainer');
        adsContainer.innerHTML = `
            <script src='//libtl.com/sdk.js' data-zone='10168820' data-sdk='show_10168820'></script>
        `;
        
        // Simulate ad completion
        setTimeout(async () => {
            await completeAdWatch();
        }, 30000); // 30 seconds for ad
        
        showNotification('Ad loaded. Watch to earn!', 'success');
        
    } catch (error) {
        console.error('Failed to load ad:', error);
        showNotification('Failed to load ad', 'error');
    }
}

// Complete Ad Watch
async function completeAdWatch() {
    try {
        // Update user balance
        const newBalance = userBalance + appData.settings.adReward;
        await database.ref('users/' + currentUser.telegramId + '/balance').set(newBalance);
        
        // Update statistics
        const statsRef = database.ref('users/' + currentUser.telegramId + '/statistics');
        const snapshot = await statsRef.once('value');
        const stats = snapshot.val() || {};
        
        await statsRef.update({
            adsWatched: (stats.adsWatched || 0) + 1,
            adsWatchedToday: (stats.adsWatchedToday || 0) + 1,
            adsWatchedWeek: (stats.adsWatchedWeek || 0) + 1,
            totalEarned: (stats.totalEarned || 0) + appData.settings.adReward
        });
        
        // Update referral earnings if user has referrals
        await updateReferralEarnings(appData.settings.adReward);
        
        updateEarnStats();
        showNotification('Earned 0.10 BTX!', 'success');
        
    } catch (error) {
        console.error('Failed to complete ad watch:', error);
    }
}

// Display Tasks
function displayTasks(tasks) {
    const tasksContainer = document.getElementById('tasksContainer');
    
    if (!tasks || tasks.length === 0) {
        tasksContainer.innerHTML = '<p class="text-center">No tasks available</p>';
        return;
    }
    
    tasksContainer.innerHTML = tasks.map(task => {
        const isCompleted = currentUser.completedTasks?.includes(task.id);
        const isActive = task.status === 'active';
        
        return `
            <div class="task-card">
                <div class="task-header">
                    <img src="${task.imageUrl || 'https://picsum.photos/seed/task' + task.id + '/60/60'}" alt="${task.title}" class="task-image">
                    <div class="task-info">
                        <div class="task-title">${task.title}</div>
                        <div class="task-category">${task.category}</div>
                    </div>
                    <div class="task-reward">+${task.reward} BTX</div>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-actions">
                    <button class="task-btn ${isCompleted ? 'completed' : ''} ${!isActive ? 'disabled' : ''}" 
                            onclick="startTask('${task.id}')"
                            ${isCompleted || !isActive ? 'disabled' : ''}>
                        ${isCompleted ? 'Completed' : isActive ? 'Start Task' : 'Inactive'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Start Task
async function startTask(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        // Mark task as started
        await database.ref('users/' + currentUser.telegramId + '/activeTasks/' + taskId).set({
            startedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Open task link
        if (task.link) {
            if (tg && tg.openLink) {
                tg.openLink(task.link);
            } else {
                window.open(task.link, '_blank');
            }
        }
        
        // Wait 10 seconds then complete
        setTimeout(async () => {
            await completeTask(taskId);
        }, 10000);
        
        showNotification('Task started! Complete in 10 seconds', 'success');
        
    } catch (error) {
        console.error('Failed to start task:', error);
        showNotification('Failed to start task', 'error');
    }
}

// Complete Task
async function completeTask(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
        // Check if already completed
        if (currentUser.completedTasks?.includes(taskId)) {
            return;
        }
        
        // Add to completed tasks
        const completedTasks = [...(currentUser.completedTasks || []), taskId];
        await database.ref('users/' + currentUser.telegramId + '/completedTasks').set(completedTasks);
        
        // Update balance
        const newBalance = userBalance + task.reward;
        await database.ref('users/' + currentUser.telegramId + '/balance').set(newBalance);
        
        // Update statistics
        const statsRef = database.ref('users/' + currentUser.telegramId + '/statistics');
        const snapshot = await statsRef.once('value');
        const stats = snapshot.val() || {};
        
        await statsRef.update({
            tasksCompleted: (stats.tasksCompleted || 0) + 1,
            totalEarned: (stats.totalEarned || 0) + task.reward
        });
        
        // Update referral earnings
        await updateReferralEarnings(task.reward);
        
        // Clear active task
        await database.ref('users/' + currentUser.telegramId + '/activeTasks/' + taskId).remove();
        
        showNotification(`Task completed! Earned ${task.reward} BTX`, 'success');
        
    } catch (error) {
        console.error('Failed to complete task:', error);
    }
}

// Initialize Referral Screen
function initializeReferralScreen() {
    setupReferralLink();
    loadReferralData();
    loadLeaderboard();
}

// Setup Referral Link
function setupReferralLink() {
    const referralLink = `t.me/WinArenaGame_bot/open?start=${currentUser.telegramId}`;
    document.getElementById('referralLink').value = referralLink;
}

// Copy Referral Link
function copyReferralLink() {
    const referralLink = document.getElementById('referralLink').value;
    navigator.clipboard.writeText(referralLink);
    showNotification('Referral link copied!', 'success');
}

// Load Referral Data
async function loadReferralData() {
    try {
        const referralRef = database.ref('users/' + currentUser.telegramId + '/referrals');
        const snapshot = await referralRef.once('value');
        const referralData = snapshot.val() || {};
        
        const referredUsers = referralData.referredUsers || [];
        
        // Calculate stats
        let totalCommission = 0;
        let activeReferrals = 0;
        
        for (const userId of referredUsers) {
            const userSnapshot = await database.ref('users/' + userId).once('value');
            const user = userSnapshot.val();
            
            if (user && user.statistics) {
                totalCommission += (user.statistics.totalEarned || 0) * appData.settings.referralCommission;
                if (user.lastActive && (Date.now() - user.lastActive) < 7 * 24 * 60 * 60 * 1000) {
                    activeReferrals++;
                }
            }
        }
        
        document.getElementById('totalReferred').textContent = referredUsers.length;
        document.getElementById('commissionEarned').textContent = totalCommission.toFixed(2) + ' BTX';
        document.getElementById('activeReferrals').textContent = activeReferrals;
        
        // Load referral list
        loadReferralList(referredUsers);
        
    } catch (error) {
        console.error('Failed to load referral data:', error);
    }
}

// Load Referral List
async function loadReferralList(userIds) {
    const referralList = document.getElementById('referralList');
    
    if (userIds.length === 0) {
        referralList.innerHTML = '<p class="text-center">No referrals yet</p>';
        return;
    }
    
    const referralData = await Promise.all(userIds.map(async userId => {
        const snapshot = await database.ref('users/' + userId).once('value');
        return { id: userId, ...snapshot.val() };
    }));
    
    referralList.innerHTML = referralData.map(referral => {
        const isActive = referral.lastActive && (Date.now() - referral.lastActive) < 7 * 24 * 60 * 60 * 1000;
        
        return `
            <div class="referral-item">
                <img src="${referral.photoUrl || 'https://picsum.photos/seed/user' + referral.id + '/40/40'}" alt="${referral.username}" class="referral-avatar">
                <div class="referral-info-item">
                    <div class="referral-name">${referral.firstName || referral.username}</div>
                    <div class="referral-status">${isActive ? 'Active' : 'Inactive'}</div>
                </div>
                <div class="referral-earnings">
                    <div class="earnings-amount">+${((referral.statistics?.totalEarned || 0) * appData.settings.referralCommission).toFixed(2)} BTX</div>
                </div>
            </div>
        `;
    }).join('');
}

// Load Leaderboard
async function loadLeaderboard() {
    try {
        // Get top referrers in last 24 hours
        const usersRef = database.ref('users');
        const snapshot = await usersRef.once('value');
        const users = snapshot.val() || {};
        
        const leaderboardData = [];
        
        Object.entries(users).forEach(([userId, user]) => {
            if (user.referrals && user.referrals.referredUsers) {
                const recentReferrals = user.referrals.referredUsers.filter(refId => {
                    const refUser = users[refId];
                    return refUser && refUser.createdAt && 
                           (Date.now() - refUser.createdAt) < 24 * 60 * 60 * 1000;
                });
                
                if (recentReferrals.length > 0) {
                    leaderboardData.push({
                        userId: userId,
                        name: user.firstName || user.username,
                        photoUrl: user.photoUrl,
                        count: recentReferrals.length
                    });
                }
            }
        });
        
        // Sort by referral count and take top 10
        leaderboardData.sort((a, b) => b.count - a.count);
        const topReferrers = leaderboardData.slice(0, 10);
        
        displayLeaderboard(topReferrers);
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

// Display Leaderboard
function displayLeaderboard(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboardList');
    
    if (leaderboardData.length === 0) {
        leaderboardList.innerHTML = '<p class="text-center">No data available</p>';
        return;
    }
    
    leaderboardList.innerHTML = leaderboardData.map((item, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'gold';
        else if (index === 1) rankClass = 'silver';
        else if (index === 2) rankClass = 'bronze';
        
        return `
            <div class="leaderboard-item">
                <div class="rank-badge ${rankClass}">${index + 1}</div>
                <img src="${item.photoUrl || 'https://picsum.photos/seed/user' + item.userId + '/40/40'}" alt="${item.name}" class="leaderboard-avatar">
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${item.name}</div>
                    <div class="leaderboard-count">${item.count} referrals</div>
                </div>
            </div>
        `;
    }).join('');
}

// Process Referral
async function processReferral(referrerId) {
    try {
        // Check if referral was already processed
        if (currentUser.referrals.processed) return;
        
        // Add user to referrer's referred users
        const referrerRef = database.ref('users/' + referrerId + '/referrals/referredUsers');
        const snapshot = await referrerRef.once('value');
        const referredUsers = snapshot.val() || [];
        
        if (!referredUsers.includes(currentUser.telegramId)) {
            referredUsers.push(currentUser.telegramId);
            await referrerRef.set(referredUsers);
            
            // Give referral reward to referrer
            await database.ref('users/' + referrerId + '/balance').transaction(balance => {
                return (balance || 0) + appData.settings.referralReward;
            });
            
            // Mark referral as processed
            await database.ref('users/' + currentUser.telegramId + '/referrals/processed').set(true);
            
            showNotification('Welcome! Your referrer earned 10 BTX', 'success');
        }
        
    } catch (error) {
        console.error('Failed to process referral:', error);
    }
}

// Update Referral Earnings
async function updateReferralEarnings(amount) {
    if (!currentUser.referrals.referredBy) return;
    
    try {
        const commission = amount * appData.settings.referralCommission;
        const referrerId = currentUser.referrals.referredBy;
        
        await database.ref('users/' + referrerId + '/balance').transaction(balance => {
            return (balance || 0) + commission;
        });
        
    } catch (error) {
        console.error('Failed to update referral earnings:', error);
    }
}

// Initialize Profile Screen
function initializeProfileScreen() {
    updateProfileUI();
}

// Update Profile UI
function updateProfileUI() {
    // Update user info
    document.getElementById('profileAvatar').src = currentUser.photoUrl || 'https://picsum.photos/seed/user' + currentUser.telegramId + '/100/100';
    document.getElementById('profileName').textContent = currentUser.firstName || currentUser.username;
    document.getElementById('userId').textContent = currentUser.telegramId;
    
    // Update settings
    document.getElementById('soundToggle').checked = currentUser.settings.soundEnabled;
    document.getElementById('darkModeToggle').checked = currentUser.settings.darkMode;
    
    // Update badges
    updateBadges();
}

// Copy User ID
function copyUserId() {
    navigator.clipboard.writeText(currentUser.telegramId);
    showNotification('User ID copied!', 'success');
}

// Toggle Sound
async function toggleSound(enabled) {
    await database.ref('users/' + currentUser.telegramId + '/settings/soundEnabled').set(enabled);
}

// Toggle Dark Mode
async function toggleDarkMode(enabled) {
    document.body.classList.toggle('dark-mode', enabled);
    await database.ref('users/' + currentUser.telegramId + '/settings/darkMode').set(enabled);
}

// Connect TON Wallet
async function connectTONWallet() {
    try {
        if (tonConnectUI) {
            await tonConnectUI.connectWallet();
            
            // Save wallet info to Firebase
            if (connectedWallet && connectedWallet.account) {
                await database.ref('users/' + currentUser.telegramId + '/wallet').set({
                    connected: true,
                    address: connectedWallet.account.address,
                    connectedAt: firebase.database.ServerValue.TIMESTAMP
                });
            }
        }
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        showNotification('Failed to connect wallet', 'error');
    }
}

// Disconnect TON Wallet
async function disconnectTONWallet() {
    try {
        if (tonConnectUI) {
            await tonConnectUI.disconnect();
            
            // Update Firebase
            await database.ref('users/' + currentUser.telegramId + '/wallet').set({
                connected: false,
                address: null
            });
        }
    } catch (error) {
        console.error('Failed to disconnect wallet:', error);
    }
}

// Copy Wallet Address
function copyWalletAddress() {
    if (connectedWallet && connectedWallet.account) {
        navigator.clipboard.writeText(connectedWallet.account.address);
        showNotification('Wallet address copied!', 'success');
    }
}

// Update Badges
function updateBadges() {
    const badges = document.querySelectorAll('.badge');
    
    // New badge - all users have it
    document.querySelector('[data-badge="new"]').classList.add('active');
    
    // Active badge - active in last 7 days
    if (currentUser.lastActive && (Date.now() - currentUser.lastActive) < 7 * 24 * 60 * 60 * 1000) {
        document.querySelector('[data-badge="active"]').classList.add('active');
    }
    
    // Pro badge - earned 100+ BTX
    if (userBalance >= 100) {
        document.querySelector('[data-badge="pro"]').classList.add('active');
    }
    
    // Influencer badge - 10+ referrals
    if (currentUser.referrals.referredUsers && currentUser.referrals.referredUsers.length >= 10) {
        document.querySelector('[data-badge="influencer"]').classList.add('active');
    }
}

// Delete Account
async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return;
    
    try {
        // Delete user data from Firebase
        await database.ref('users/' + currentUser.telegramId).remove();
        
        // Delete user's posts
        const postsRef = database.ref('posts');
        const postsSnapshot = await postsRef.once('value');
        const posts = postsSnapshot.val() || {};
        
        for (const [postId, post] of Object.entries(posts)) {
            if (post.authorId === currentUser.telegramId) {
                await postsRef.child(postId).remove();
            }
        }
        
        showNotification('Account deleted successfully', 'success');
        
        // Close the app
        if (tg) {
            tg.close();
        } else {
            window.close();
        }
        
    } catch (error) {
        console.error('Failed to delete account:', error);
        showNotification('Failed to delete account', 'error');
    }
}

// Check Daily Check-in
async function checkDailyCheckIn() {
    try {
        const lastClaimed = currentUser.dailyCheckIn?.lastClaimed;
        const now = new Date();
        const lastClaimedDate = lastClaimed ? new Date(lastClaimed) : null;
        
        // Check if it's a new day
        const isSameDay = lastClaimedDate && 
            lastClaimedDate.getDate() === now.getDate() &&
            lastClaimedDate.getMonth() === now.getMonth() &&
            lastClaimedDate.getFullYear() === now.getFullYear();
        
        if (!isSameDay) {
            // Check if streak is broken
            let streak = 0;
            if (lastClaimedDate) {
                const daysDiff = Math.floor((now - lastClaimedDate) / (1000 * 60 * 60 * 24));
                if (daysDiff === 1) {
                    streak = Math.min((currentUser.dailyCheckIn?.streak || 0) + 1, 7);
                }
            }
            
            // Show daily check-in modal
            showDailyCheckIn(streak);
        }
        
    } catch (error) {
        console.error('Failed to check daily check-in:', error);
    }
}

// Show Daily Check-in
function showDailyCheckIn(streak) {
    const modal = document.getElementById('dailyCheckInModal');
    modal.classList.add('active');
    
    // Update day indicators
    const days = document.querySelectorAll('.day');
    days.forEach((day, index) => {
        day.classList.remove('completed', 'current');
        if (index < streak) {
            day.classList.add('completed');
        } else if (index === streak) {
            day.classList.add('current');
        }
    });
    
    // Update reward text
    const reward = streak + 1;
    document.getElementById('checkinReward').textContent = `Today's Reward: ${reward} BTX`;
}

// Close Daily Check-in
function closeDailyCheckIn() {
    document.getElementById('dailyCheckInModal').classList.remove('active');
}

// Claim Daily Reward
async function claimDailyReward() {
    try {
        const streak = document.querySelectorAll('.day.completed').length;
        const reward = streak + 1;
        
        // Update balance
        const newBalance = userBalance + reward;
        await database.ref('users/' + currentUser.telegramId + '/balance').set(newBalance);
        
        // Update daily check-in info
        await database.ref('users/' + currentUser.telegramId + '/dailyCheckIn').set({
            streak: streak,
            lastClaimed: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Update statistics
        await database.ref('users/' + currentUser.telegramId + '/statistics/totalEarned')
            .transaction(total => (total || 0) + reward);
        
        showNotification(`Claimed ${reward} BTX!`, 'success');
        closeDailyCheckIn();
        
    } catch (error) {
        console.error('Failed to claim daily reward:', error);
        showNotification('Failed to claim reward', 'error');
    }
}

// Setup Realtime Listeners
function setupRealtimeListeners() {
    // Listen for balance changes
    database.ref('users/' + currentUser.telegramId + '/balance').on('value', (snapshot) => {
        userBalance = snapshot.val() || 0;
        updateBalanceDisplay();
    });
    
    // Listen for new messages/notifications
    database.ref('users/' + currentUser.telegramId + '/notifications').on('child_added', (snapshot) => {
        const notification = snapshot.val();
        showNotification(notification.message, notification.type);
        // Remove notification after showing
        snapshot.ref.remove();
    });
}

// Update Balance Display
function updateBalanceDisplay() {
    const balanceElements = document.querySelectorAll('[id*="Balance"], [id*="balance"]');
    balanceElements.forEach(element => {
        element.textContent = userBalance.toFixed(2);
    });
}

// Send Bot Notification
async function sendBotNotification(type, data) {
    try {
        // This would send notification to Telegram bot
        const botToken = '8205391931:AAFs5FnMbr96RpZ8DLJEDyKpgZzCmHaqszw';
        
        let message = '';
        switch (type) {
            case 'deposit_success':
                message = `User ${data.userId} deposited ${data.tonAmount} TON`;
                break;
            case 'withdrawal_request':
                message = `Withdrawal request: ${data.btxAmount} BTX to ${data.walletAddress}`;
                break;
            case 'withdrawal_approved':
                message = `Withdrawal approved: ${data.btxAmount} BTX sent`;
                break;
        }
        
        // Send to bot API
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const payload = {
            chat_id: '@winarena_notifications', // Admin channel
            text: message,
            parse_mode: 'HTML'
        };
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
    } catch (error) {
        console.error('Failed to send bot notification:', error);
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    
    messageElement.textContent = message;
    notification.className = 'notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString();
}

function isAdmin() {
    // Check if current user is admin
    return currentUser && currentUser.role === 'admin';
}

function compressImage(file) {
    // Simple image compression (in production, use a proper compression library)
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Resize to max 800px width
                const maxWidth = 800;
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', 0.8);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function playSound(type) {
    // Play sound effects (in production, add actual sound files)
    console.log('Playing sound:', type);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('App error:', event.error);
    showNotification('An error occurred. Please try again.', 'error');
});

// Network status
window.addEventListener('online', () => {
    showNotification('Connection restored', 'success');
});

window.addEventListener('offline', () => {
    showNotification('Connection lost', 'warning');
});

// Prevent zoom on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);
