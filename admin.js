// Admin Panel JavaScript
// Firebase Configuration (same as main app)
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

// Global Variables
let currentAdmin = null;
let currentSection = 'dashboard';
let currentPage = 1;
let itemsPerPage = 10;
let allUsers = [];
let allGames = [];
let allTasks = [];
let allTransactions = [];
let allPosts = [];
let appSettings = {
    appName: 'WinArena',
    appVersion: '1.0.0',
    maintenanceMode: false,
    tonToBtxRate: 500,
    minDeposit: 1,
    minWithdraw: 250,
    adReward: 0.1,
    referralReward: 10,
    referralCommission: 20,
    adminTonWallet: '',
    autoApproveWithdrawals: false,
    maxWithdrawalPerDay: 10000,
    firebaseApiKey: '',
    firebaseAuthDomain: '',
    firebaseDatabaseUrl: '',
    firebaseProjectId: '',
    firebaseStorageBucket: '',
    botToken: '8205391931:AAFs5FnMbr96RpZ8DLJEDyKpgZzCmHaqszw',
    notificationChannel: '@winarena_notifications',
    enableNotifications: true
};

// Charts
let userGrowthChart = null;
let revenueChart = null;
let userActivityChart = null;
let earningsChart = null;

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    await initializeAdminPanel();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const section = this.dataset.section;
            switchSection(section);
        });
    });

    // Settings tabs
    document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchSettingsTab(tab);
        });
    });

    // Transaction tabs
    document.querySelectorAll('.transactions-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTransactionTab(tab);
        });
    });

    // Search and filters
    document.getElementById('userSearch').addEventListener('input', function() {
        searchUsers(this.value);
    });

    document.getElementById('userFilter').addEventListener('change', function() {
        filterUsers(this.value);
    });

    document.getElementById('userSort').addEventListener('change', function() {
        sortUsers(this.value);
    });

    // Date range for statistics
    document.getElementById('startDate').addEventListener('change', updateStatistics);
    document.getElementById('endDate').addEventListener('change', updateStatistics);
}

// Initialize Admin Panel
async function initializeAdminPanel() {
    try {
        // Check if admin is authenticated
        await authenticateAdmin();
        
        // Load initial data
        await loadAdminData();
        await loadAppSettings();
        
        // Initialize dashboard
        await loadDashboardData();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
        
    } catch (error) {
        console.error('Admin panel initialization failed:', error);
        showNotification('Failed to initialize admin panel', 'error');
    }
}

// Authenticate Admin
async function authenticateAdmin() {
    // For demo purposes, we'll create a simple admin check
    // In production, implement proper authentication
    
    const adminEmail = localStorage.getItem('adminEmail');
    const adminPassword = localStorage.getItem('adminPassword');
    
    // Check if admin credentials exist in localStorage (demo)
    if (!adminEmail || !adminPassword) {
        // For demo, create admin with default credentials
        currentAdmin = {
            id: 'admin_001',
            email: 'admin@winarena.com',
            name: 'Admin User',
            role: 'admin',
            permissions: ['all']
        };
    } else {
        currentAdmin = {
            id: 'admin_001',
            email: adminEmail,
            name: 'Admin User',
            role: 'admin',
            permissions: ['all']
        };
    }
    
    // Update admin UI
    document.getElementById('adminName').textContent = currentAdmin.name;
    document.getElementById('adminAvatar').src = 'https://picsum.photos/seed/admin/40/40';
}

// Load Admin Data
async function loadAdminData() {
    try {
        // Load users
        const usersSnapshot = await database.ref('users').once('value');
        allUsers = Object.entries(usersSnapshot.val() || {}).map(([id, user]) => ({
            id,
            ...user
        }));
        
        // Load games
        const gamesSnapshot = await database.ref('games').once('value');
        allGames = Object.entries(gamesSnapshot.val() || {}).map(([id, game]) => ({
            id,
            ...game
        }));
        
        // Load tasks
        const tasksSnapshot = await database.ref('tasks').once('value');
        allTasks = Object.entries(tasksSnapshot.val() || {}).map(([id, task]) => ({
            id,
            ...task
        }));
        
        // Load transactions
        const depositsSnapshot = await database.ref('deposits').once('value');
        const withdrawalsSnapshot = await database.ref('withdrawals').once('value');
        const deposits = Object.entries(depositsSnapshot.val() || {}).map(([id, tx]) => ({
            id,
            type: 'deposit',
            ...tx
        }));
        const withdrawals = Object.entries(withdrawalsSnapshot.val() || {}).map(([id, tx]) => ({
            id,
            type: 'withdrawal',
            ...tx
        }));
        allTransactions = [...deposits, ...withdrawals];
        
        // Load posts
        const postsSnapshot = await database.ref('posts').once('value');
        allPosts = Object.entries(postsSnapshot.val() || {}).map(([id, post]) => ({
            id,
            ...post
        }));
        
    } catch (error) {
        console.error('Failed to load admin data:', error);
    }
}

// Load App Settings
async function loadAppSettings() {
    try {
        const settingsSnapshot = await database.ref('settings').once('value');
        const settings = settingsSnapshot.val() || {};
        appSettings = { ...appSettings, ...settings };
        
        // Update settings UI
        updateSettingsUI();
        
    } catch (error) {
        console.error('Failed to load app settings:', error);
    }
}

// Switch Section
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });
    
    currentSection = sectionName;
    
    // Load section-specific data
    loadSectionData(sectionName);
}

// Load Section Data
async function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'users':
            await loadUsersData();
            break;
        case 'games':
            await loadGamesData();
            break;
        case 'tasks':
            await loadTasksData();
            break;
        case 'transactions':
            await loadTransactionsData();
            break;
        case 'posts':
            await loadPostsData();
            break;
        case 'referrals':
            await loadReferralsData();
            break;
        case 'statistics':
            await loadStatisticsData();
            break;
        case 'settings':
            // Settings already loaded
            break;
        case 'notifications':
            await loadNotificationsData();
            break;
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Calculate statistics
        const totalUsers = allUsers.length;
        const totalBTX = allUsers.reduce((sum, user) => sum + (user.balance || 0), 0);
        const activeUsers = allUsers.filter(user => {
            const lastActive = user.lastActive;
            return lastActive && (Date.now() - lastActive) < 7 * 24 * 60 * 60 * 1000;
        }).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTransactions = allTransactions.filter(tx => {
            return tx.createdAt && tx.createdAt >= today.getTime();
        });
        const dailyRevenue = todayTransactions.reduce((sum, tx) => {
            return sum + (tx.type === 'deposit' ? (tx.btxAmount || 0) : 0);
        }, 0);
        
        // Update UI
        document.getElementById('totalUsers').textContent = totalUsers.toLocaleString();
        document.getElementById('totalBTX').textContent = totalBTX.toFixed(2);
        document.getElementById('activeUsers').textContent = activeUsers.toLocaleString();
        document.getElementById('dailyRevenue').textContent = dailyRevenue.toFixed(2);
        
        // Load charts
        await loadDashboardCharts();
        
        // Load recent activities
        loadRecentActivities();
        
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
    }
}

// Load Dashboard Charts
async function loadDashboardCharts() {
    try {
        // User Growth Chart
        const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
        const userGrowthData = calculateUserGrowth();
        
        if (userGrowthChart) userGrowthChart.destroy();
        userGrowthChart = new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: userGrowthData.labels,
                datasets: [{
                    label: 'New Users',
                    data: userGrowthData.data,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart').getContext('2d');
        const revenueData = calculateRevenueTrends();
        
        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: revenueData.labels,
                datasets: [{
                    label: 'Revenue (BTX)',
                    data: revenueData.data,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to load dashboard charts:', error);
    }
}

// Calculate User Growth
function calculateUserGrowth() {
    const days = 7;
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayUsers = allUsers.filter(user => {
            return user.createdAt && user.createdAt >= date.getTime() && user.createdAt < nextDate.getTime();
        }).length;
        
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
        data.push(dayUsers);
    }
    
    return { labels, data };
}

// Calculate Revenue Trends
function calculateRevenueTrends() {
    const days = 7;
    const labels = [];
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayRevenue = allTransactions.filter(tx => {
            return tx.type === 'deposit' && 
                   tx.createdAt && 
                   tx.createdAt >= date.getTime() && 
                   tx.createdAt < nextDate.getTime();
        }).reduce((sum, tx) => sum + (tx.btxAmount || 0), 0);
        
        labels.push(date.toLocaleDateString('en', { weekday: 'short' }));
        data.push(dayRevenue);
    }
    
    return { labels, data };
}

// Load Recent Activities
function loadRecentActivities() {
    const activities = [];
    
    // Get recent transactions
    const recentTransactions = allTransactions
        .filter(tx => tx.createdAt)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);
    
    recentTransactions.forEach(tx => {
        activities.push({
            type: tx.type,
            description: `${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${tx.btxAmount || tx.tonAmount} ${tx.type === 'deposit' ? 'BTX' : 'BTX'}`,
            time: tx.createdAt,
            icon: tx.type === 'deposit' ? 'fa-arrow-down' : 'fa-arrow-up',
            color: tx.type === 'deposit' ? '#10b981' : '#ef4444'
        });
    });
    
    // Get new users
    const recentUsers = allUsers
        .filter(user => user.createdAt)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3);
    
    recentUsers.forEach(user => {
        activities.push({
            type: 'user',
            description: `New user ${user.firstName || user.username} joined`,
            time: user.createdAt,
            icon: 'fa-user-plus',
            color: '#3b82f6'
        });
    });
    
    // Sort by time
    activities.sort((a, b) => b.time - a.time);
    
    // Display
    const activitiesContainer = document.getElementById('recentActivities');
    activitiesContainer.innerHTML = activities.slice(0, 8).map(activity => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${activity.color}">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-info">
                <p>${activity.description}</p>
                <span>${formatTimeAgo(activity.time)}</span>
            </div>
            <div class="activity-time">
                ${new Date(activity.time).toLocaleTimeString()}
            </div>
        </div>
    `).join('');
}

// Load Users Data
async function loadUsersData() {
    displayUsers(allUsers);
}

// Display Users
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }
    
    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedUsers.map(user => {
        const status = getUserStatus(user);
        const referrals = user.referrals?.referredUsers?.length || 0;
        
        return `
            <tr>
                <td>
                    <div class="user-info">
                        <img src="${user.photoUrl || 'https://picsum.photos/seed/user' + user.id + '/40/40'}" alt="${user.username}">
                        <div class="user-details">
                            <div class="user-name">${user.firstName || user.username}</div>
                            <div class="user-email">${user.username}@telegram</div>
                        </div>
                    </div>
                </td>
                <td>${(user.balance || 0).toFixed(2)} BTX</td>
                <td>${referrals}</td>
                <td><span class="status-badge ${status.class}">${status.label}</span></td>
                <td>${formatDate(user.createdAt)}</td>
                <td>${formatDate(user.lastActive)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewUserDetails('${user.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editUser('${user.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ban" onclick="toggleBanUser('${user.id}')" title="${status.class === 'banned' ? 'Unban' : 'Ban'}">
                            <i class="fas fa-${status.class === 'banned' ? 'unlock' : 'ban'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    updatePagination(users.length);
}

// Get User Status
function getUserStatus(user) {
    if (user.banned) {
        return { label: 'Banned', class: 'banned' };
    }
    
    const now = Date.now();
    const lastActive = user.lastActive || 0;
    const createdAt = user.createdAt || 0;
    
    // New user (less than 7 days)
    if (now - createdAt < 7 * 24 * 60 * 60 * 1000) {
        return { label: 'New', class: 'new' };
    }
    
    // Active user (last active within 7 days)
    if (now - lastActive < 7 * 24 * 60 * 60 * 1000) {
        return { label: 'Active', class: 'active' };
    }
    
    // VIP user (high balance or referrals)
    if ((user.balance || 0) >= 1000 || (user.referrals?.referredUsers?.length || 0) >= 10) {
        return { label: 'VIP', class: 'vip' };
    }
    
    return { label: 'Inactive', class: 'inactive' };
}

// Search Users
function searchUsers(query) {
    if (!query) {
        displayUsers(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(query.toLowerCase())) ||
        (user.username && user.username.toLowerCase().includes(query.toLowerCase())) ||
        user.id.toString().includes(query)
    );
    
    displayUsers(filteredUsers);
}

// Filter Users
function filterUsers(filter) {
    let filteredUsers = allUsers;
    
    switch (filter) {
        case 'active':
            filteredUsers = allUsers.filter(user => {
                const lastActive = user.lastActive || 0;
                return Date.now() - lastActive < 7 * 24 * 60 * 60 * 1000;
            });
            break;
        case 'banned':
            filteredUsers = allUsers.filter(user => user.banned);
            break;
        case 'new':
            filteredUsers = allUsers.filter(user => {
                const createdAt = user.createdAt || 0;
                return Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000;
            });
            break;
        case 'vip':
            filteredUsers = allUsers.filter(user => {
                return (user.balance || 0) >= 1000 || (user.referrals?.referredUsers?.length || 0) >= 10;
            });
            break;
    }
    
    displayUsers(filteredUsers);
}

// Sort Users
function sortUsers(sortBy) {
    let sortedUsers = [...allUsers];
    
    switch (sortBy) {
        case 'newest':
            sortedUsers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            break;
        case 'oldest':
            sortedUsers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            break;
        case 'balance':
            sortedUsers.sort((a, b) => (b.balance || 0) - (a.balance || 0));
            break;
        case 'referrals':
            sortedUsers.sort((a, b) => {
                const aReferrals = a.referrals?.referredUsers?.length || 0;
                const bReferrals = b.referrals?.referredUsers?.length || 0;
                return bReferrals - aReferrals;
            });
            break;
    }
    
    displayUsers(sortedUsers);
}

// Update Pagination
function updatePagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Previous Page
function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayUsers(allUsers);
    }
}

// Next Page
function nextPage() {
    const totalPages = Math.ceil(allUsers.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayUsers(allUsers);
    }
}

// View User Details
function viewUserDetails(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('userDetailsModal');
    const content = document.getElementById('userDetailsContent');
    
    content.innerHTML = `
        <div class="user-details-full">
            <div class="user-header">
                <img src="${user.photoUrl || 'https://picsum.photos/seed/user' + user.id + '/100/100'}" alt="${user.username}">
                <div>
                    <h3>${user.firstName || user.username}</h3>
                    <p>Telegram ID: ${user.id}</p>
                    <span class="status-badge ${getUserStatus(user).class}">${getUserStatus(user).label}</span>
                </div>
            </div>
            
            <div class="user-stats">
                <h4>Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span>Balance:</span>
                        <strong>${(user.balance || 0).toFixed(2)} BTX</strong>
                    </div>
                    <div class="stat-item">
                        <span>Total Earned:</span>
                        <strong>${(user.statistics?.totalEarned || 0).toFixed(2)} BTX</strong>
                    </div>
                    <div class="stat-item">
                        <span>Referrals:</span>
                        <strong>${user.referrals?.referredUsers?.length || 0}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Ads Watched:</span>
                        <strong>${user.statistics?.adsWatched || 0}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Tasks Completed:</span>
                        <strong>${user.statistics?.tasksCompleted || 0}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Joined:</span>
                        <strong>${formatDate(user.createdAt)}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Last Active:</span>
                        <strong>${formatDate(user.lastActive)}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Daily Streak:</span>
                        <strong>${user.dailyCheckIn?.streak || 0} days</strong>
                    </div>
                </div>
            </div>
            
            <div class="user-wallet">
                <h4>Wallet Information</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span>Connected:</span>
                        <strong>${user.wallet?.connected ? 'Yes' : 'No'}</strong>
                    </div>
                    <div class="stat-item">
                        <span>Address:</span>
                        <strong>${user.wallet?.address || 'Not connected'}</strong>
                    </div>
                </div>
            </div>
            
            <div class="user-actions">
                <button class="btn btn-primary" onclick="editUser('${user.id}')">
                    <i class="fas fa-edit"></i>
                    Edit User
                </button>
                <button class="btn btn-${user.banned ? 'success' : 'danger'}" onclick="toggleBanUser('${user.id}')">
                    <i class="fas fa-${user.banned ? 'unlock' : 'ban'}"></i>
                    ${user.banned ? 'Unban User' : 'Ban User'}
                </button>
                <button class="btn btn-info" onclick="sendUserMessage('${user.id}')">
                    <i class="fas fa-envelope"></i>
                    Send Message
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Edit User
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    // For demo, just show an alert
    showNotification('Edit user functionality would open here', 'info');
}

// Toggle Ban User
async function toggleBanUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const action = user.banned ? 'unban' : 'ban';
    const confirmText = `Are you sure you want to ${action} this user?`;
    
    if (!confirm(confirmText)) return;
    
    try {
        await database.ref('users/' + userId + '/banned').set(!user.banned);
        
        // Update local data
        user.banned = !user.banned;
        
        // Refresh display
        displayUsers(allUsers);
        
        showNotification(`User ${action}ned successfully`, 'success');
        
    } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        showNotification(`Failed to ${action} user`, 'error');
    }
}

// Send User Message
function sendUserMessage(userId) {
    // For demo, just show an alert
    showNotification('Send message functionality would open here', 'info');
}

// Load Games Data
async function loadGamesData() {
    displayGames(allGames);
}

// Display Games
function displayGames(games) {
    const container = document.getElementById('gamesGrid');
    
    if (!games || games.length === 0) {
        container.innerHTML = '<p class="text-center">No games found</p>';
        return;
    }
    
    container.innerHTML = games.map(game => `
        <div class="game-card">
            <img src="${game.imageUrl || 'https://picsum.photos/seed/game' + game.id + '/300/200'}" alt="${game.title}">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <p class="game-description">${game.description}</p>
                <div class="game-meta">
                    <span class="game-category">${game.category}</span>
                    <div class="game-stats">
                        <i class="fas fa-eye"></i>
                        <span>${game.views || 0}</span>
                    </div>
                </div>
                <div class="game-actions">
                    <button class="btn btn-primary" onclick="editGame('${game.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-${game.status === 'active' ? 'warning' : 'success'}" onclick="toggleGameStatus('${game.id}')">
                        <i class="fas fa-${game.status === 'active' ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteGame('${game.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Add Game
function addGame() {
    document.getElementById('gameModalTitle').textContent = 'Add Game';
    document.getElementById('gameModal').classList.add('active');
    
    // Clear form
    document.getElementById('gameTitle').value = '';
    document.getElementById('gameDescription').value = '';
    document.getElementById('gameCategory').value = 'action';
    document.getElementById('gameUrl').value = '';
    document.getElementById('gameImage').value = '';
    document.getElementById('gameSortOrder').value = '0';
    document.getElementById('gameStatus').value = 'active';
    
    // Remove any existing game ID
    document.getElementById('gameModal').removeAttribute('data-game-id');
}

// Edit Game
function editGame(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;
    
    document.getElementById('gameModalTitle').textContent = 'Edit Game';
    document.getElementById('gameModal').classList.add('active');
    
    // Fill form
    document.getElementById('gameTitle').value = game.title || '';
    document.getElementById('gameDescription').value = game.description || '';
    document.getElementById('gameCategory').value = game.category || 'action';
    document.getElementById('gameUrl').value = game.url || '';
    document.getElementById('gameSortOrder').value = game.sortOrder || 0;
    document.getElementById('gameStatus').value = game.status || 'active';
    
    // Store game ID
    document.getElementById('gameModal').setAttribute('data-game-id', gameId);
}

// Save Game
async function saveGame() {
    const gameId = document.getElementById('gameModal').getAttribute('data-game-id');
    const isEdit = gameId !== null;
    
    const gameData = {
        title: document.getElementById('gameTitle').value,
        description: document.getElementById('gameDescription').value,
        category: document.getElementById('gameCategory').value,
        url: document.getElementById('gameUrl').value,
        sortOrder: parseInt(document.getElementById('gameSortOrder').value),
        status: document.getElementById('gameStatus').value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (!gameData.title || !gameData.description) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        // Handle image upload
        const imageFile = document.getElementById('gameImage').files[0];
        if (imageFile) {
            const imageUrl = await uploadImage(imageFile, 'games');
            gameData.imageUrl = imageUrl;
        }
        
        if (isEdit) {
            // Update existing game
            await database.ref('games/' + gameId).update(gameData);
            showNotification('Game updated successfully', 'success');
        } else {
            // Add new game
            gameData.id = Date.now().toString();
            gameData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            gameData.views = 0;
            await database.ref('games/' + gameData.id).set(gameData);
            showNotification('Game added successfully', 'success');
        }
        
        closeModal('gameModal');
        await loadAdminData();
        displayGames(allGames);
        
    } catch (error) {
        console.error('Failed to save game:', error);
        showNotification('Failed to save game', 'error');
    }
}

// Toggle Game Status
async function toggleGameStatus(gameId) {
    const game = allGames.find(g => g.id === gameId);
    if (!game) return;
    
    const newStatus = game.status === 'active' ? 'inactive' : 'active';
    
    try {
        await database.ref('games/' + gameId + '/status').set(newStatus);
        
        // Update local data
        game.status = newStatus;
        
        // Refresh display
        displayGames(allGames);
        
        showNotification(`Game ${newStatus}d successfully`, 'success');
        
    } catch (error) {
        console.error('Failed to toggle game status:', error);
        showNotification('Failed to update game status', 'error');
    }
}

// Delete Game
async function deleteGame(gameId) {
    if (!confirm('Are you sure you want to delete this game?')) return;
    
    try {
        await database.ref('games/' + gameId).remove();
        
        // Update local data
        allGames = allGames.filter(g => g.id !== gameId);
        
        // Refresh display
        displayGames(allGames);
        
        showNotification('Game deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete game:', error);
        showNotification('Failed to delete game', 'error');
    }
}

// Load Tasks Data
async function loadTasksData() {
    displayTasks(allTasks);
}

// Display Tasks
function displayTasks(tasks) {
    const container = document.getElementById('tasksList');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p class="text-center">No tasks found</p>';
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card">
            <div class="task-header">
                <div class="task-info">
                    <h3>${task.title}</h3>
                    <div class="task-meta">
                        <span class="task-category">${task.category}</span>
                        <span class="task-reward">+${task.reward} BTX</span>
                    </div>
                </div>
            </div>
            <p class="task-description">${task.description}</p>
            <div class="task-actions">
                <button class="btn btn-primary" onclick="editTask('${task.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-${task.status === 'active' ? 'warning' : 'success'}" onclick="toggleTaskStatus('${task.id}')">
                    <i class="fas fa-${task.status === 'active' ? 'pause' : 'play'}"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Add Task
function addTask() {
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    document.getElementById('taskModal').classList.add('active');
    
    // Clear form
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskLink').value = '';
    document.getElementById('taskCategory').value = 'project';
    document.getElementById('taskReward').value = '';
    document.getElementById('taskImage').value = '';
    document.getElementById('taskSortOrder').value = '0';
    document.getElementById('taskStatus').value = 'active';
    
    // Remove any existing task ID
    document.getElementById('taskModal').removeAttribute('data-task-id');
}

// Edit Task
function editTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('taskModal').classList.add('active');
    
    // Fill form
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskLink').value = task.link || '';
    document.getElementById('taskCategory').value = task.category || 'project';
    document.getElementById('taskReward').value = task.reward || '';
    document.getElementById('taskSortOrder').value = task.sortOrder || 0;
    document.getElementById('taskStatus').value = task.status || 'active';
    
    // Store task ID
    document.getElementById('taskModal').setAttribute('data-task-id', taskId);
}

// Save Task
async function saveTask() {
    const taskId = document.getElementById('taskModal').getAttribute('data-task-id');
    const isEdit = taskId !== null;
    
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        link: document.getElementById('taskLink').value,
        category: document.getElementById('taskCategory').value,
        reward: parseFloat(document.getElementById('taskReward').value),
        sortOrder: parseInt(document.getElementById('taskSortOrder').value),
        status: document.getElementById('taskStatus').value,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    
    if (!taskData.title || !taskData.description || !taskData.reward) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    
    try {
        // Handle image upload
        const imageFile = document.getElementById('taskImage').files[0];
        if (imageFile) {
            const imageUrl = await uploadImage(imageFile, 'tasks');
            taskData.imageUrl = imageUrl;
        }
        
        if (isEdit) {
            // Update existing task
            await database.ref('tasks/' + taskId).update(taskData);
            showNotification('Task updated successfully', 'success');
        } else {
            // Add new task
            taskData.id = Date.now().toString();
            taskData.createdAt = firebase.database.ServerValue.TIMESTAMP;
            await database.ref('tasks/' + taskData.id).set(taskData);
            showNotification('Task added successfully', 'success');
        }
        
        closeModal('taskModal');
        await loadAdminData();
        displayTasks(allTasks);
        
    } catch (error) {
        console.error('Failed to save task:', error);
        showNotification('Failed to save task', 'error');
    }
}

// Toggle Task Status
async function toggleTaskStatus(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'active' ? 'inactive' : 'active';
    
    try {
        await database.ref('tasks/' + taskId + '/status').set(newStatus);
        
        // Update local data
        task.status = newStatus;
        
        // Refresh display
        displayTasks(allTasks);
        
        showNotification(`Task ${newStatus}d successfully`, 'success');
        
    } catch (error) {
        console.error('Failed to toggle task status:', error);
        showNotification('Failed to update task status', 'error');
    }
}

// Delete Task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await database.ref('tasks/' + taskId).remove();
        
        // Update local data
        allTasks = allTasks.filter(t => t.id !== taskId);
        
        // Refresh display
        displayTasks(allTasks);
        
        showNotification('Task deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// Load Transactions Data
async function loadTransactionsData() {
    displayTransactions('pending');
}

// Display Transactions
function displayTransactions(status) {
    const container = document.getElementById('transactionsList');
    const filteredTransactions = allTransactions.filter(tx => tx.status === status);
    
    if (filteredTransactions.length === 0) {
        container.innerHTML = '<p class="text-center">No transactions found</p>';
        return;
    }
    
    container.innerHTML = filteredTransactions.map(tx => {
        const user = allUsers.find(u => u.id === tx.userId);
        const userName = user ? (user.firstName || user.username) : 'Unknown User';
        
        return `
            <div class="transaction-card">
                <div class="transaction-header">
                    <div class="transaction-info">
                        <h4>${tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</h4>
                        <p>User: ${userName} (ID: ${tx.userId})</p>
                    </div>
                    <div class="transaction-amount">
                        <div class="amount ${tx.type}">${tx.type === 'deposit' ? '+' : '-'}${tx.btxAmount || tx.tonAmount} BTX</div>
                        <span class="status-badge ${tx.status}">${tx.status}</span>
                    </div>
                </div>
                
                <div class="transaction-details">
                    <div class="transaction-detail">
                        <span>Date:</span>
                        <strong>${formatDate(tx.createdAt)}</strong>
                    </div>
                    <div class="transaction-detail">
                        <span>TON Amount:</span>
                        <strong>${tx.tonAmount || 'N/A'} TON</strong>
                    </div>
                    <div class="transaction-detail">
                        <span>BTX Amount:</span>
                        <strong>${tx.btxAmount || 'N/A'} BTX</strong>
                    </div>
                    <div class="transaction-detail">
                        <span>Wallet:</span>
                        <strong>${tx.walletAddress || 'N/A'}</strong>
                    </div>
                </div>
                
                ${tx.status === 'pending' && tx.type === 'withdrawal' ? `
                    <div class="transaction-actions">
                        <button class="btn btn-success" onclick="approveWithdrawal('${tx.id}')">
                            <i class="fas fa-check"></i>
                            Approve
                        </button>
                        <button class="btn btn-danger" onclick="rejectWithdrawal('${tx.id}')">
                            <i class="fas fa-times"></i>
                            Reject
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Switch Transaction Tab
function switchTransactionTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.transactions-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Display transactions
    displayTransactions(tab);
}

// Approve Withdrawal
async function approveWithdrawal(transactionId) {
    if (!confirm('Are you sure you want to approve this withdrawal?')) return;
    
    try {
        const transaction = allTransactions.find(tx => tx.id === transactionId);
        if (!transaction) return;
        
        // Update transaction status
        await database.ref('withdrawals/' + transactionId + '/status').set('approved');
        await database.ref('withdrawals/' + transactionId + '/approvedAt').set(firebase.database.ServerValue.TIMESTAMP);
        
        // In a real implementation, this would send TON to the user's wallet
        // For demo, we'll just update the status
        
        // Send notification to user
        await sendUserNotification(transaction.userId, 'Your withdrawal has been approved!', 'success');
        
        // Send bot notification
        await sendBotNotification('withdrawal_approved', transaction);
        
        showNotification('Withdrawal approved successfully', 'success');
        
        // Reload transactions
        await loadAdminData();
        displayTransactions('pending');
        
    } catch (error) {
        console.error('Failed to approve withdrawal:', error);
        showNotification('Failed to approve withdrawal', 'error');
    }
}

// Reject Withdrawal
async function rejectWithdrawal(transactionId) {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;
    
    try {
        const transaction = allTransactions.find(tx => tx.id === transactionId);
        if (!transaction) return;
        
        // Update transaction status
        await database.ref('withdrawals/' + transactionId + '/status').set('rejected');
        await database.ref('withdrawals/' + transactionId + '/rejectedAt').set(firebase.database.ServerValue.TIMESTAMP);
        await database.ref('withdrawals/' + transactionId + '/rejectionReason').set(reason);
        
        // Refund balance to user
        await database.ref('users/' + transaction.userId + '/balance').transaction(balance => {
            return (balance || 0) + transaction.btxAmount;
        });
        
        // Send notification to user
        await sendUserNotification(transaction.userId, `Your withdrawal was rejected: ${reason}`, 'error');
        
        // Send bot notification
        await sendBotNotification('withdrawal_rejected', transaction);
        
        showNotification('Withdrawal rejected successfully', 'success');
        
        // Reload transactions
        await loadAdminData();
        displayTransactions('pending');
        
    } catch (error) {
        console.error('Failed to reject withdrawal:', error);
        showNotification('Failed to reject withdrawal', 'error');
    }
}

// Load Posts Data
async function loadPostsData() {
    displayPosts(allPosts);
}

// Display Posts
function displayPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (!posts || posts.length === 0) {
        container.innerHTML = '<p class="text-center">No posts found</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => {
        const user = allUsers.find(u => u.id === post.authorId);
        const userName = user ? (user.firstName || user.username) : 'Unknown User';
        
        return `
            <div class="post-card">
                <div class="post-header">
                    <div class="post-author">
                        <img src="${post.authorPhoto || 'https://picsum.photos/seed/user' + post.authorId + '/40/40'}" alt="${userName}">
                        <div class="post-author-info">
                            <h4>${userName}</h4>
                            <span>${formatTimeAgo(post.createdAt)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="post-stats">
                    <span><i class="fas fa-heart"></i> ${post.likes || 0} likes</span>
                    <span><i class="fas fa-comment"></i> ${Object.keys(post.comments || {}).length} comments</span>
                </div>
                
                ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
                
                <div class="post-actions">
                    <button class="btn btn-danger" onclick="deletePost('${post.id}')">
                        <i class="fas fa-trash"></i>
                        Delete Post
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Delete Post
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
        await database.ref('posts/' + postId).remove();
        
        // Update local data
        allPosts = allPosts.filter(p => p.id !== postId);
        
        // Refresh display
        displayPosts(allPosts);
        
        showNotification('Post deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete post:', error);
        showNotification('Failed to delete post', 'error');
    }
}

// Delete All Posts
async function deleteAllPosts() {
    if (!confirm('Are you sure you want to delete all posts? This action cannot be undone.')) return;
    
    if (!confirm('This will permanently delete all user posts. Are you absolutely sure?')) return;
    
    try {
        await database.ref('posts').remove();
        
        // Update local data
        allPosts = [];
        
        // Refresh display
        displayPosts(allPosts);
        
        showNotification('All posts deleted successfully', 'success');
        
    } catch (error) {
        console.error('Failed to delete all posts:', error);
        showNotification('Failed to delete all posts', 'error');
    }
}

// Load Referrals Data
async function loadReferralsData() {
    try {
        // Calculate referral statistics
        let totalReferrals = 0;
        let commissionPaid = 0;
        let activeReferrers = 0;
        
        const referralLeaderboard = [];
        
        allUsers.forEach(user => {
            const referrals = user.referrals?.referredUsers || [];
            if (referrals.length > 0) {
                totalReferrals += referrals.length;
                
                // Calculate commission for this referrer
                let userCommission = 0;
                referrals.forEach(refId => {
                    const refUser = allUsers.find(u => u.id === refId);
                    if (refUser && refUser.statistics) {
                        userCommission += (refUser.statistics.totalEarned || 0) * (appSettings.referralCommission / 100);
                    }
                });
                commissionPaid += userCommission;
                
                // Check if active referrer (has recent referrals)
                const hasRecentReferrals = referrals.some(refId => {
                    const refUser = allUsers.find(u => u.id === refId);
                    return refUser && refUser.createdAt && 
                           (Date.now() - refUser.createdAt) < 30 * 24 * 60 * 60 * 1000;
                });
                
                if (hasRecentReferrals) {
                    activeReferrers++;
                }
                
                // Add to leaderboard
                referralLeaderboard.push({
                    userId: user.id,
                    name: user.firstName || user.username,
                    photoUrl: user.photoUrl,
                    referralCount: referrals.length,
                    earnings: userCommission
                });
            }
        });
        
        // Sort leaderboard by referral count
        referralLeaderboard.sort((a, b) => b.referralCount - a.referralCount);
        
        // Update UI
        document.getElementById('totalReferrals').textContent = totalReferrals.toLocaleString();
        document.getElementById('commissionPaid').textContent = commissionPaid.toFixed(2) + ' BTX';
        document.getElementById('activeReferrers').textContent = activeReferrers.toLocaleString();
        
        // Display leaderboard
        const tbody = document.getElementById('referralLeaderboardBody');
        tbody.innerHTML = referralLeaderboard.slice(0, 20).map((referrer, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="user-info">
                        <img src="${referrer.photoUrl || 'https://picsum.photos/seed/user' + referrer.userId + '/40/40'}" alt="${referrer.name}">
                        <div class="user-details">
                            <div class="user-name">${referrer.name}</div>
                        </div>
                    </div>
                </td>
                <td>${referrer.referralCount}</td>
                <td>${referrer.earnings.toFixed(2)} BTX</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load referrals data:', error);
    }
}

// Export Referrals
function exportReferrals() {
    try {
        const referralData = allUsers.filter(user => 
            user.referrals && user.referrals.referredUsers && user.referrals.referredUsers.length > 0
        ).map(user => ({
            userId: user.id,
            name: user.firstName || user.username,
            referralCount: user.referrals.referredUsers.length,
            referredUsers: user.referrals.referredUsers.join(', ')
        }));
        
        const csv = convertToCSV(referralData);
        downloadCSV(csv, 'referrals_export.csv');
        
        showNotification('Referrals data exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export referrals:', error);
        showNotification('Failed to export referrals', 'error');
    }
}

// Export Users
function exportUsers() {
    try {
        const exportData = allUsers.map(user => ({
            id: user.id,
            name: user.firstName || user.username,
            balance: user.balance || 0,
            referrals: user.referrals?.referredUsers?.length || 0,
            status: getUserStatus(user).label,
            joined: formatDate(user.createdAt),
            lastActive: formatDate(user.lastActive),
            totalEarned: user.statistics?.totalEarned || 0,
            adsWatched: user.statistics?.adsWatched || 0,
            tasksCompleted: user.statistics?.tasksCompleted || 0
        }));
        
        const csv = convertToCSV(exportData);
        downloadCSV(csv, 'users_export.csv');
        
        showNotification('Users data exported successfully', 'success');
        
    } catch (error) {
        console.error('Failed to export users:', error);
        showNotification('Failed to export users', 'error');
    }
}

// Load Statistics Data
async function loadStatisticsData() {
    try {
        // Set default date range (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        
        await updateStatistics();
        await loadStatisticsCharts();
        
    } catch (error) {
        console.error('Failed to load statistics data:', error);
    }
}

// Update Statistics
async function updateStatistics() {
    try {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        endDate.setHours(23, 59, 59, 999);
        
        // Filter data by date range
        const filteredUsers = allUsers.filter(user => 
            user.createdAt && user.createdAt >= startDate.getTime() && user.createdAt <= endDate.getTime()
        );
        
        const filteredTransactions = allTransactions.filter(tx => 
            tx.createdAt && tx.createdAt >= startDate.getTime() && tx.createdAt <= endDate.getTime()
        );
        
        // Calculate statistics
        const now = new Date();
        
        // Daily stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayUsers = allUsers.filter(user => user.createdAt >= today.getTime());
        const todayTransactions = allTransactions.filter(tx => tx.createdAt >= today.getTime());
        const todayRevenue = todayTransactions
            .filter(tx => tx.type === 'deposit')
            .reduce((sum, tx) => sum + (tx.btxAmount || 0), 0);
        const todayDeposits = todayTransactions.filter(tx => tx.type === 'deposit').length;
        const todayWithdrawals = todayTransactions.filter(tx => tx.type === 'withdrawal').length;
        
        // Weekly stats
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekUsers = allUsers.filter(user => user.createdAt >= weekAgo.getTime());
        const weekTransactions = allTransactions.filter(tx => tx.createdAt >= weekAgo.getTime());
        const weekRevenue = weekTransactions
            .filter(tx => tx.type === 'deposit')
            .reduce((sum, tx) => sum + (tx.btxAmount || 0), 0);
        const weekDeposits = weekTransactions.filter(tx => tx.type === 'deposit').length;
        const weekWithdrawals = weekTransactions.filter(tx => tx.type === 'withdrawal').length;
        
        // Monthly stats
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const monthUsers = allUsers.filter(user => user.createdAt >= monthAgo.getTime());
        const monthTransactions = allTransactions.filter(tx => tx.createdAt >= monthAgo.getTime());
        const monthRevenue = monthTransactions
            .filter(tx => tx.type === 'deposit')
            .reduce((sum, tx) => sum + (tx.btxAmount || 0), 0);
        const monthDeposits = monthTransactions.filter(tx => tx.type === 'deposit').length;
        const monthWithdrawals = monthTransactions.filter(tx => tx.type === 'withdrawal').length;
        
        // Update UI
        document.getElementById('dailyNewUsers').textContent = todayUsers.length.toLocaleString();
        document.getElementById('dailyRevenue').textContent = todayRevenue.toFixed(2) + ' BTX';
        document.getElementById('dailyDeposits').textContent = todayDeposits.toLocaleString();
        document.getElementById('dailyWithdrawals').textContent = todayWithdrawals.toLocaleString();
        
        document.getElementById('weeklyNewUsers').textContent = weekUsers.length.toLocaleString();
        document.getElementById('weeklyRevenue').textContent = weekRevenue.toFixed(2) + ' BTX';
        document.getElementById('weeklyDeposits').textContent = weekDeposits.toLocaleString();
        document.getElementById('weeklyWithdrawals').textContent = weekWithdrawals.toLocaleString();
        
        document.getElementById('monthlyNewUsers').textContent = monthUsers.length.toLocaleString();
        document.getElementById('monthlyRevenue').textContent = monthRevenue.toFixed(2) + ' BTX';
        document.getElementById('monthlyDeposits').textContent = monthDeposits.toLocaleString();
        document.getElementById('monthlyWithdrawals').textContent = monthWithdrawals.toLocaleString();
        
    } catch (error) {
        console.error('Failed to update statistics:', error);
    }
}

// Load Statistics Charts
async function loadStatisticsCharts() {
    try {
        // User Activity Chart
        const userActivityCtx = document.getElementById('userActivityChart').getContext('2d');
        const userActivityData = calculateUserActivity();
        
        if (userActivityChart) userActivityChart.destroy();
        userActivityChart = new Chart(userActivityCtx, {
            type: 'line',
            data: {
                labels: userActivityData.labels,
                datasets: [
                    {
                        label: 'New Users',
                        data: userActivityData.newUsers,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Active Users',
                        data: userActivityData.activeUsers,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        
        // Earnings Chart
        const earningsCtx = document.getElementById('earningsChart').getContext('2d');
        const earningsData = calculateEarningsBreakdown();
        
        if (earningsChart) earningsChart.destroy();
        earningsChart = new Chart(earningsCtx, {
            type: 'doughnut',
            data: {
                labels: earningsData.labels,
                datasets: [{
                    data: earningsData.data,
                    backgroundColor: [
                        '#4f46e5',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to load statistics charts:', error);
    }
}

// Calculate User Activity
function calculateUserActivity() {
    const days = 30;
    const labels = [];
    const newUsers = [];
    const activeUsers = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayNewUsers = allUsers.filter(user => {
            return user.createdAt && user.createdAt >= date.getTime() && user.createdAt < nextDate.getTime();
        }).length;
        
        const dayActiveUsers = allUsers.filter(user => {
            return user.lastActive && user.lastActive >= date.getTime() && user.lastActive < nextDate.getTime();
        }).length;
        
        labels.push(date.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
        newUsers.push(dayNewUsers);
        activeUsers.push(dayActiveUsers);
    }
    
    return { labels, newUsers, activeUsers };
}

// Calculate Earnings Breakdown
function calculateEarningsBreakdown() {
    const adsRevenue = allUsers.reduce((sum, user) => {
        return sum + ((user.statistics?.adsWatched || 0) * appSettings.adReward);
    }, 0);
    
    const tasksRevenue = allTasks.reduce((sum, task) => {
        const completions = allUsers.filter(user => 
            user.completedTasks && user.completedTasks.includes(task.id)
        ).length;
        return sum + (completions * task.reward);
    }, 0);
    
    const referralCommission = allUsers.reduce((sum, user) => {
        const userCommission = (user.referrals?.referredUsers || []).reduce((commission, refId) => {
            const refUser = allUsers.find(u => u.id === refId);
            return commission + ((refUser?.statistics?.totalEarned || 0) * (appSettings.referralCommission / 100));
        }, 0);
        return sum + userCommission;
    }, 0);
    
    const depositRevenue = allTransactions
        .filter(tx => tx.type === 'deposit')
        .reduce((sum, tx) => sum + (tx.btxAmount || 0), 0);
    
    const dailyCheckInRevenue = allUsers.reduce((sum, user) => {
        const streak = user.dailyCheckIn?.streak || 0;
        return sum + (streak * (streak + 1) / 2); // Sum of 1+2+3+...+streak
    }, 0);
    
    return {
        labels: ['Ads', 'Tasks', 'Referrals', 'Deposits', 'Check-in'],
        data: [adsRevenue, tasksRevenue, referralCommission, depositRevenue, dailyCheckInRevenue]
    };
}

// Switch Settings Tab
function switchSettingsTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.settings-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    
    // Show corresponding panel
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(tab + 'Settings').classList.add('active');
}

// Update Settings UI
function updateSettingsUI() {
    // General settings
    document.getElementById('appName').value = appSettings.appName;
    document.getElementById('appVersion').value = appSettings.appVersion;
    document.getElementById('maintenanceMode').checked = appSettings.maintenanceMode;
    document.getElementById('tonToBtxRate').value = appSettings.tonToBtxRate;
    document.getElementById('minDeposit').value = appSettings.minDeposit;
    document.getElementById('minWithdraw').value = appSettings.minWithdraw;
    document.getElementById('adReward').value = appSettings.adReward;
    document.getElementById('referralReward').value = appSettings.referralReward;
    document.getElementById('referralCommission').value = appSettings.referralCommission;
    
    // Wallet settings
    document.getElementById('adminTonWallet').value = appSettings.adminTonWallet || '';
    document.getElementById('autoApproveWithdrawals').checked = appSettings.autoApproveWithdrawals;
    document.getElementById('maxWithdrawalPerDay').value = appSettings.maxWithdrawalPerDay;
    
    // Firebase settings
    document.getElementById('firebaseApiKey').value = appSettings.firebaseApiKey || '';
    document.getElementById('firebaseAuthDomain').value = appSettings.firebaseAuthDomain || '';
    document.getElementById('firebaseDatabaseUrl').value = appSettings.firebaseDatabaseUrl || '';
    document.getElementById('firebaseProjectId').value = appSettings.firebaseProjectId || '';
    document.getElementById('firebaseStorageBucket').value = appSettings.firebaseStorageBucket || '';
    
    // Bot settings
    document.getElementById('botToken').value = appSettings.botToken || '';
    document.getElementById('notificationChannel').value = appSettings.notificationChannel || '';
    document.getElementById('enableNotifications').checked = appSettings.enableNotifications;
}

// Save Settings
async function saveSettings() {
    try {
        // Collect all settings
        const updatedSettings = {
            appName: document.getElementById('appName').value,
            appVersion: document.getElementById('appVersion').value,
            maintenanceMode: document.getElementById('maintenanceMode').checked,
            tonToBtxRate: parseFloat(document.getElementById('tonToBtxRate').value),
            minDeposit: parseFloat(document.getElementById('minDeposit').value),
            minWithdraw: parseFloat(document.getElementById('minWithdraw').value),
            adReward: parseFloat(document.getElementById('adReward').value),
            referralReward: parseFloat(document.getElementById('referralReward').value),
            referralCommission: parseFloat(document.getElementById('referralCommission').value),
            adminTonWallet: document.getElementById('adminTonWallet').value,
            autoApproveWithdrawals: document.getElementById('autoApproveWithdrawals').checked,
            maxWithdrawalPerDay: parseInt(document.getElementById('maxWithdrawalPerDay').value),
            firebaseApiKey: document.getElementById('firebaseApiKey').value,
            firebaseAuthDomain: document.getElementById('firebaseAuthDomain').value,
            firebaseDatabaseUrl: document.getElementById('firebaseDatabaseUrl').value,
            firebaseProjectId: document.getElementById('firebaseProjectId').value,
            firebaseStorageBucket: document.getElementById('firebaseStorageBucket').value,
            botToken: document.getElementById('botToken').value,
            notificationChannel: document.getElementById('notificationChannel').value,
            enableNotifications: document.getElementById('enableNotifications').checked,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Validate settings
        if (updatedSettings.tonToBtxRate <= 0 || 
            updatedSettings.minDeposit <= 0 || 
            updatedSettings.minWithdraw <= 0 ||
            updatedSettings.adReward < 0 ||
            updatedSettings.referralReward < 0 ||
            updatedSettings.referralCommission < 0 ||
            updatedSettings.referralCommission > 100) {
            showNotification('Please enter valid values for all numeric fields', 'warning');
            return;
        }
        
        // Save to Firebase
        await database.ref('settings').set(updatedSettings);
        
        // Update local settings
        appSettings = { ...appSettings, ...updatedSettings };
        
        showNotification('Settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showNotification('Failed to save settings', 'error');
    }
}

// Load Notifications Data
async function loadNotificationsData() {
    // Load broadcast history
    const broadcastsRef = database.ref('broadcasts');
    broadcastsRef.orderByChild('createdAt').limitToLast(20).on('value', (snapshot) => {
        const broadcasts = snapshot.val() || {};
        displayBroadcasts(Object.values(broadcasts).reverse());
    });
}

// Display Broadcasts
function displayBroadcasts(broadcasts) {
    const container = document.getElementById('broadcastList');
    
    if (!broadcasts || broadcasts.length === 0) {
        container.innerHTML = '<p class="text-center">No broadcasts sent yet</p>';
        return;
    }
    
    container.innerHTML = broadcasts.map(broadcast => `
        <div class="broadcast-item">
            <div class="broadcast-header">
                <span class="broadcast-type ${broadcast.type}">${broadcast.type}</span>
                <span class="broadcast-time">${formatTimeAgo(broadcast.createdAt)}</span>
            </div>
            <div class="broadcast-message">${broadcast.message}</div>
            <div class="broadcast-stats">
                <span><i class="fas fa-users"></i> ${broadcast.sentTo || 0} users</span>
                <span><i class="fas fa-check"></i> ${broadcast.delivered || 0} delivered</span>
            </div>
        </div>
    `).join('');
}

// Send Broadcast
async function sendBroadcast() {
    const message = document.getElementById('broadcastMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    const targetUsers = document.getElementById('targetUsers').value;
    const imageFile = document.getElementById('notificationImage').files[0];
    
    if (!message) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    try {
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'broadcasts');
        }
        
        // Determine target users
        let targetUserIds = [];
        switch (targetUsers) {
            case 'all':
                targetUserIds = allUsers.map(user => user.id);
                break;
            case 'active':
                targetUserIds = allUsers.filter(user => {
                    const lastActive = user.lastActive || 0;
                    return Date.now() - lastActive < 7 * 24 * 60 * 60 * 1000;
                }).map(user => user.id);
                break;
            case 'vip':
                targetUserIds = allUsers.filter(user => {
                    return (user.balance || 0) >= 1000 || (user.referrals?.referredUsers?.length || 0) >= 10;
                }).map(user => user.id);
                break;
            case 'custom':
                // For demo, send to all users
                targetUserIds = allUsers.map(user => user.id);
                break;
        }
        
        // Create broadcast record
        const broadcast = {
            id: Date.now().toString(),
            message: message,
            type: type,
            imageUrl: imageUrl,
            targetUsers: targetUsers,
            sentTo: targetUserIds.length,
            delivered: 0,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentAdmin.id
        };
        
        // Save broadcast
        await database.ref('broadcasts/' + broadcast.id).set(broadcast);
        
        // Send notifications to target users
        let deliveredCount = 0;
        for (const userId of targetUserIds) {
            await sendUserNotification(userId, message, type);
            deliveredCount++;
        }
        
        // Update delivered count
        await database.ref('broadcasts/' + broadcast.id + '/delivered').set(deliveredCount);
        
        // Clear form
        document.getElementById('broadcastMessage').value = '';
        document.getElementById('notificationImage').value = '';
        
        showNotification(`Broadcast sent to ${deliveredCount} users`, 'success');
        
    } catch (error) {
        console.error('Failed to send broadcast:', error);
        showNotification('Failed to send broadcast', 'error');
    }
}

// Send User Notification
async function sendUserNotification(userId, message, type = 'info') {
    try {
        await database.ref('users/' + userId + '/notifications').push({
            message: message,
            type: type,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Failed to send user notification:', error);
    }
}

// Send Bot Notification
async function sendBotNotification(type, data) {
    try {
        if (!appSettings.enableNotifications || !appSettings.botToken) {
            return;
        }
        
        let message = '';
        switch (type) {
            case 'withdrawal_approved':
                message = `✅ Withdrawal Approved\n\nAmount: ${data.btxAmount} BTX\nUser: ${data.userId}\nWallet: ${data.walletAddress}`;
                break;
            case 'withdrawal_rejected':
                message = `❌ Withdrawal Rejected\n\nAmount: ${data.btxAmount} BTX\nUser: ${data.userId}\nReason: ${data.rejectionReason}`;
                break;
            default:
                message = `📢 ${type}: ${JSON.stringify(data)}`;
        }
        
        const url = `https://api.telegram.org/bot${appSettings.botToken}/sendMessage`;
        const payload = {
            chat_id: appSettings.notificationChannel,
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

// Upload Image
async function uploadImage(file, folder) {
    return new Promise((resolve, reject) => {
        const storageRef = storage.ref(`${folder}/${Date.now()}_${file.name}`);
        const uploadTask = storageRef.put(file);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Progress tracking
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload progress:', progress + '%');
            },
            (error) => {
                reject(error);
            },
            async () => {
                try {
                    const downloadUrl = await storageRef.getDownloadURL();
                    resolve(downloadUrl);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
}

// Setup Realtime Listeners
function setupRealtimeListeners() {
    // Listen for new users
    database.ref('users').on('child_added', (snapshot) => {
        const user = { id: snapshot.key, ...snapshot.val() };
        allUsers.push(user);
        
        // Update dashboard if active
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
    });
    
    // Listen for new transactions
    database.ref('deposits').on('child_added', (snapshot) => {
        const transaction = { id: snapshot.key, type: 'deposit', ...snapshot.val() };
        allTransactions.push(transaction);
        
        // Update relevant sections
        if (currentSection === 'dashboard' || currentSection === 'transactions') {
            loadSectionData(currentSection);
        }
    });
    
    database.ref('withdrawals').on('child_added', (snapshot) => {
        const transaction = { id: snapshot.key, type: 'withdrawal', ...snapshot.val() };
        allTransactions.push(transaction);
        
        // Update relevant sections
        if (currentSection === 'dashboard' || currentSection === 'transactions') {
            loadSectionData(currentSection);
        }
    });
    
    // Listen for settings changes
    database.ref('settings').on('value', (snapshot) => {
        const settings = snapshot.val() || {};
        appSettings = { ...appSettings, ...settings };
        updateSettingsUI();
    });
}

// Utility Functions
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Never';
    
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return new Date(timestamp).toLocaleDateString();
}

function formatDate(timestamp) {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('adminNotification');
    const messageElement = document.getElementById('adminNotificationMessage');
    
    messageElement.textContent = message;
    notification.className = 'notification show ' + type;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && value.includes(',') 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Logout Admin
function logoutAdmin() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminPassword');
        window.location.href = 'admin.html';
    }
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Admin panel error:', event.error);
    showNotification('An error occurred. Please try again.', 'error');
});

// Keyboard shortcuts
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 's':
                event.preventDefault();
                if (currentSection === 'settings') {
                    saveSettings();
                }
                break;
            case 'e':
                event.preventDefault();
                if (currentSection === 'users') {
                    exportUsers();
                }
                break;
        }
    }
});
