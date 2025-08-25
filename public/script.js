// API Base URL
const API_BASE = '/api';

// Authentication state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM Elements
const addSongBtn = document.getElementById('add-song-btn');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const refreshBtn = document.getElementById('refresh-btn');
const mySongsBtn = document.getElementById('my-songs-btn');
const myPlaylistsBtn = document.getElementById('my-playlists-btn');
const allContentBtn = document.getElementById('all-content-btn');
const songsListEl = document.getElementById('songs-list');
const playlistsListEl = document.getElementById('playlists-list');
const serverStatusEl = document.getElementById('server-status');

// Radio Player Elements
const radioPlayer = document.getElementById('radio-player');
const playPauseBtn = document.getElementById('play-pause-btn');
const muteBtn = document.getElementById('mute-btn');
const volumeSlider = document.getElementById('volume-slider');
const radioStatus = document.getElementById('radio-status');

// Auth Elements
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfoEl = document.getElementById('user-info');
const authButtonsEl = document.getElementById('auth-buttons');
const userWelcomeEl = document.getElementById('user-welcome');

// Modals
const addSongModal = document.getElementById('add-song-modal');
const createPlaylistModal = document.getElementById('create-playlist-modal');
const loginModal = document.getElementById('login-modal');
const registerModal = document.getElementById('register-modal');

// Forms
const addSongForm = document.getElementById('add-song-form');
const createPlaylistForm = document.getElementById('create-playlist-form');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Modal switches
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');

// Close buttons for modals
const closeButtons = document.querySelectorAll('.close');

// Current view state
let currentView = 'all';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    initializeAuth();
    initializeRadioPlayer();
    setupEventListeners();
    loadSongs();
    loadPlaylists();
});

// Initialize authentication
async function initializeAuth() {
    if (authToken) {
        try {
            const profile = await makeAuthenticatedRequest('/api/auth/profile');
            setCurrentUser(profile);
        } catch (error) {
            // Token is invalid, clear it
            localStorage.removeItem('authToken');
            authToken = null;
            updateAuthUI();
        }
    } else {
        updateAuthUI();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Existing listeners
    addSongBtn.addEventListener('click', () => showModal(addSongModal));
    createPlaylistBtn.addEventListener('click', () => showModal(createPlaylistModal));
    refreshBtn.addEventListener('click', refreshData);
    
    // View filters
    if (mySongsBtn) mySongsBtn.addEventListener('click', () => switchView('my-songs'));
    if (myPlaylistsBtn) myPlaylistsBtn.addEventListener('click', () => switchView('my-playlists'));
    if (allContentBtn) allContentBtn.addEventListener('click', () => switchView('all'));
    
    // Auth listeners
    if (loginBtn) loginBtn.addEventListener('click', () => showModal(loginModal));
    if (registerBtn) registerBtn.addEventListener('click', () => showModal(registerModal));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Modal switches
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            hideModal(loginModal);
            showModal(registerModal);
        });
    }
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            hideModal(registerModal);
            showModal(loginModal);
        });
    }

    // Form listeners
    addSongForm.addEventListener('submit', handleAddSong);
    createPlaylistForm.addEventListener('submit', handleCreatePlaylist);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            hideModal(e.target.closest('.modal'));
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
}// Authentication functions
function setCurrentUser(user) {
    currentUser = user;
    updateAuthUI();
}

// Initialize Radio Player
function initializeRadioPlayer() {
    // Check if HLS is supported
    if (radioPlayer.canPlayType('application/vnd.apple.mpegurl') || radioPlayer.canPlayType('application/x-mpegurl')) {
        radioStatus.textContent = 'Ready to play';
    } else {
        // Try to load HLS.js for browsers that don't support HLS natively
        loadHLSLibrary();
    }
    
    // Set initial volume
    radioPlayer.volume = volumeSlider.value / 100;
    
    // Add event listeners
    setupRadioEventListeners();
}

// Load HLS.js library for broader browser support
function loadHLSLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.onload = () => {
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls();
            hls.loadSource('https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8');
            hls.attachMedia(radioPlayer);
            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                radioStatus.textContent = 'Ready to play (HLS.js)';
            });
            hls.on(window.Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    radioStatus.textContent = 'Stream error';
                    radioStatus.className = 'status error';
                }
            });
        } else {
            radioStatus.textContent = 'HLS not supported in this browser';
            radioStatus.className = 'status error';
            playPauseBtn.disabled = true;
        }
    };
    script.onerror = () => {
        radioStatus.textContent = 'Could not load HLS support';
        radioStatus.className = 'status error';
    };
    document.head.appendChild(script);
}

// Setup radio player event listeners
function setupRadioEventListeners() {
    // Play/Pause button
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    // Mute button
    muteBtn.addEventListener('click', toggleMute);
    
    // Volume slider
    volumeSlider.addEventListener('input', (e) => {
        radioPlayer.volume = e.target.value / 100;
        updateMuteButton();
    });
    
    // Radio player events
    radioPlayer.addEventListener('loadstart', () => {
        radioStatus.textContent = 'Loading stream...';
        radioStatus.className = 'status';
    });
    
    radioPlayer.addEventListener('canplay', () => {
        radioStatus.textContent = 'Ready to play';
        radioStatus.className = 'status';
    });
    
    radioPlayer.addEventListener('playing', () => {
        radioStatus.textContent = '🎵 Playing live stream';
        radioStatus.className = 'status playing';
        playPauseBtn.textContent = '⏸️ Pause';
    });
    
    radioPlayer.addEventListener('pause', () => {
        radioStatus.textContent = 'Paused';
        radioStatus.className = 'status';
        playPauseBtn.textContent = '▶️ Play';
    });
    
    radioPlayer.addEventListener('error', (e) => {
        radioStatus.textContent = 'Stream error - please try again';
        radioStatus.className = 'status error';
        playPauseBtn.textContent = '▶️ Play';
        console.error('Radio player error:', e);
    });
    
    radioPlayer.addEventListener('waiting', () => {
        radioStatus.textContent = 'Buffering...';
        radioStatus.className = 'status';
    });
}

// Toggle play/pause
function togglePlayPause() {
    try {
        if (radioPlayer.paused) {
            radioPlayer.play().catch(e => {
                console.error('Play failed:', e);
                radioStatus.textContent = 'Play failed - please try again';
                radioStatus.className = 'status error';
            });
        } else {
            radioPlayer.pause();
        }
    } catch (error) {
        console.error('Toggle play/pause error:', error);
        radioStatus.textContent = 'Control error';
        radioStatus.className = 'status error';
    }
}

// Toggle mute
function toggleMute() {
    radioPlayer.muted = !radioPlayer.muted;
    updateMuteButton();
}

// Update mute button text
function updateMuteButton() {
    if (radioPlayer.muted || radioPlayer.volume === 0) {
        muteBtn.textContent = '🔇';
    } else if (radioPlayer.volume < 0.5) {
        muteBtn.textContent = '🔉';
    } else {
        muteBtn.textContent = '🔊';
    }
}

function updateAuthUI() {
    if (currentUser) {
        userWelcomeEl.textContent = `Welcome, ${currentUser.username}!`;
        userInfoEl.style.display = 'flex';
        authButtonsEl.style.display = 'none';
        
        // Show user-specific buttons
        mySongsBtn.style.display = 'inline-block';
        myPlaylistsBtn.style.display = 'inline-block';
        allContentBtn.style.display = 'inline-block';
    } else {
        userInfoEl.style.display = 'none';
        authButtonsEl.style.display = 'flex';
        
        // Hide user-specific buttons
        mySongsBtn.style.display = 'none';
        myPlaylistsBtn.style.display = 'none';
        allContentBtn.style.display = 'none';
        
        currentView = 'all';
    }
}

// View switching
function switchView(view) {
    currentView = view;
    
    // Update button states
    mySongsBtn.classList.toggle('active', view === 'my-songs');
    myPlaylistsBtn.classList.toggle('active', view === 'my-playlists');
    allContentBtn.classList.toggle('active', view === 'all');
    
    // Reload data based on view
    loadSongs();
    loadPlaylists();
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const response = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        authToken = response.token;
        localStorage.setItem('authToken', authToken);
        setCurrentUser(response.user);
        
        hideModal(loginModal);
        showNotification('Login successful!', 'success');
        
        // Refresh data to show user-specific content
        loadSongs();
        loadPlaylists();
    } catch (error) {
        showNotification(error.message || 'Login failed', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const firstName = document.getElementById('register-first-name').value.trim();
    const lastName = document.getElementById('register-last-name').value.trim();
    
    if (!username || !email || !password) {
        showNotification('Please fill in required fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }
    
    try {
        const response = await makeRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                username,
                email,
                password,
                firstName: firstName || undefined,
                lastName: lastName || undefined
            })
        });
        
        authToken = response.token;
        localStorage.setItem('authToken', authToken);
        setCurrentUser(response.user);
        
        hideModal(registerModal);
        showNotification('Registration successful! Welcome!', 'success');
        
        // Refresh data to show user-specific content
        loadSongs();
        loadPlaylists();
    } catch (error) {
        showNotification(error.message || 'Registration failed', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    updateAuthUI();
    currentView = 'all';
    
    // Refresh data to show public content only
    loadSongs();
    loadPlaylists();
    
    showNotification('Logged out successfully', 'success');
}

// Modal functions
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
    // Reset forms
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// API Functions
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function makeAuthenticatedRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return makeRequest(url, {
        ...options,
        headers
    });
}
function showModal(modal) {
    modal.style.display = 'block';
}

function hideModal(modal) {
    modal.style.display = 'none';
    // Reset forms
    const form = modal.querySelector('form');
    if (form) form.reset();
}

// API Functions
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showNotification('Error: ' + error.message, 'error');
        throw error;
    }
}

// Check server status
async function checkServerStatus() {
    try {
        await makeRequest('/health');
        serverStatusEl.textContent = 'Online';
        serverStatusEl.className = 'status-online';
    } catch (error) {
        serverStatusEl.textContent = 'Offline';
        serverStatusEl.className = 'status-offline';
    }
}

// Load songs from API
async function loadSongs() {
    try {
        showLoading(songsListEl);
        
        let endpoint = `${API_BASE}/songs`;
        if (currentView === 'my-songs' && currentUser) {
            endpoint = `${API_BASE}/songs/my`;
        }
        
        const songs = currentUser ? 
            await makeAuthenticatedRequest(endpoint) : 
            await makeRequest(endpoint);
            
        renderSongs(songs);
    } catch (error) {
        songsListEl.innerHTML = '<div class="empty-state">Failed to load songs</div>';
    }
}

// Load playlists from API
async function loadPlaylists() {
    try {
        showLoading(playlistsListEl);
        
        let endpoint = `${API_BASE}/playlists`;
        if (currentView === 'my-playlists' && currentUser) {
            endpoint = `${API_BASE}/playlists/my`;
        }
        
        const playlists = currentUser ? 
            await makeAuthenticatedRequest(endpoint) : 
            await makeRequest(endpoint);
            
        renderPlaylists(playlists);
    } catch (error) {
        playlistsListEl.innerHTML = '<div class="empty-state">Failed to load playlists</div>';
    }
}

// Render songs
function renderSongs(songs) {
    if (songs.length === 0) {
        const message = currentView === 'my-songs' ? 
            'You haven\'t added any songs yet!' : 
            'No songs yet. Add your first song!';
        songsListEl.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }
    
    songsListEl.innerHTML = songs.map(song => {
        const ownerBadge = song.is_mine ? '<span class="owner-badge">Mine</span>' : '';
        return `
            <div class="list-item">
                <h4>
                    ${escapeHtml(song.title)}
                    ${ownerBadge}
                </h4>
                <p><strong>Artist:</strong> ${escapeHtml(song.artist)}</p>
                ${song.album ? `<p><strong>Album:</strong> ${escapeHtml(song.album)}</p>` : ''}
                ${song.duration ? `<p><strong>Duration:</strong> ${formatDuration(song.duration)}</p>` : ''}
                <p><small>Added: ${formatDate(song.created_at)}</small></p>
            </div>
        `;
    }).join('');
}

// Render playlists
function renderPlaylists(playlists) {
    if (playlists.length === 0) {
        const message = currentView === 'my-playlists' ? 
            'You haven\'t created any playlists yet!' : 
            'No playlists yet. Create your first playlist!';
        playlistsListEl.innerHTML = `<div class="empty-state">${message}</div>`;
        return;
    }
    
    playlistsListEl.innerHTML = playlists.map(playlist => {
        const ownerBadge = playlist.is_mine ? '<span class="owner-badge">Mine</span>' : '';
        return `
            <div class="list-item">
                <h4>
                    ${escapeHtml(playlist.name)}
                    ${ownerBadge}
                </h4>
                ${playlist.description ? `<p>${escapeHtml(playlist.description)}</p>` : ''}
                <p><small>Created: ${formatDate(playlist.created_at)}</small></p>
            </div>
        `;
    }).join('');
}// Handle add song form submission
async function handleAddSong(e) {
    e.preventDefault();

    const songData = {
        title: document.getElementById('song-title').value.trim(),
        artist: document.getElementById('song-artist').value.trim(),
        album: document.getElementById('song-album').value.trim() || null,
        duration: document.getElementById('song-duration').value ? parseInt(document.getElementById('song-duration').value) : null,
        file_path: document.getElementById('song-file-path').value.trim() || null
    };

    if (!songData.title || !songData.artist) {
        showNotification('Please fill in required fields', 'error');
        return;
    }

    try {
        const requestFunc = currentUser ? makeAuthenticatedRequest : makeRequest;
        await requestFunc(`${API_BASE}/songs`, {
            method: 'POST',
            body: JSON.stringify(songData)
        });

        showNotification('Song added successfully!', 'success');
        hideModal(addSongModal);
        loadSongs();
    } catch (error) {
        showNotification(error.message || 'Error adding song', 'error');
    }
}

// Handle create playlist form submission
async function handleCreatePlaylist(e) {
    e.preventDefault();

    const playlistData = {
        name: document.getElementById('playlist-name').value.trim(),
        description: document.getElementById('playlist-description').value.trim() || null
    };

    if (!playlistData.name) {
        showNotification('Please enter a playlist name', 'error');
        return;
    }

    try {
        const requestFunc = currentUser ? makeAuthenticatedRequest : makeRequest;
        await requestFunc(`${API_BASE}/playlists`, {
            method: 'POST',
            body: JSON.stringify(playlistData)
        });

        showNotification('Playlist created successfully!', 'success');
        hideModal(createPlaylistModal);
        loadPlaylists();
    } catch (error) {
        showNotification(error.message || 'Error creating playlist', 'error');
    }
}

// Refresh all data
function refreshData() {
    checkServerStatus();
    loadSongs();
    loadPlaylists();
    showNotification('Data refreshed!', 'success');
}

// Utility functions
function showLoading(element) {
    element.innerHTML = '<div class="empty-state"><div class="loading"></div> Loading...</div>';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
