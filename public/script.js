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

// Metadata Widget Elements
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const currentAlbum = document.getElementById('current-album');
const currentDuration = document.getElementById('current-duration');
const currentBitrate = document.getElementById('current-bitrate');
const currentQuality = document.getElementById('current-quality');
const currentStreamType = document.getElementById('current-stream-type');
const recentTracksList = document.getElementById('recent-tracks');

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

// Metadata tracking
let currentMetadata = {
    title: null,
    artist: null,
    album: null,
    duration: null,
    bitrate: null,
    timestamp: null
};
let metadataUpdateInterval = null;

// Recently played tracks (max 5)
let recentlyPlayed = [];
const MAX_RECENT_TRACKS = 5;

// Metadata storage
let metadataHistory = [];
let persistedMetadata = JSON.parse(localStorage.getItem('radioMetadata')) || [];
const MAX_METADATA_HISTORY = 100;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    initializeAuth();
    initializeRadioPlayer();
    initializeMetadataWidget();
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
    if (volumeSlider) {
        radioPlayer.volume = volumeSlider.value / 100;
    } else {
        // Default volume when no volume slider is present
        radioPlayer.volume = 0.7;
    }

    // Add event listeners
    setupRadioEventListeners();
}

// Load HLS.js library for broader browser support
function loadHLSLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
    script.onload = () => {
        if (window.Hls && window.Hls.isSupported()) {
            const hls = new window.Hls({
                debug: false,
                enableWorker: true
            });

            // Store HLS instance globally for metadata access
            window.hlsInstance = hls;

            hls.loadSource('https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8');
            hls.attachMedia(radioPlayer);

            hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
                radioStatus.textContent = 'Ready to play (HLS.js)';
                console.log('🎵 HLS manifest parsed');
                extractHLSMetadata(hls);
            });

            hls.on(window.Hls.Events.LEVEL_SWITCHING, (event, data) => {
                console.log(`🎵 HLS level switching to: ${data.level} (bitrate: ${hls.levels[data.level]?.bitrate})`);
                extractHLSMetadata(hls);
            });

            hls.on(window.Hls.Events.LEVEL_SWITCHED, (event, data) => {
                console.log(`🎵 HLS level switched to: ${data.level} (bitrate: ${hls.levels[data.level]?.bitrate})`);
                extractHLSMetadata(hls);
            });

            hls.on(window.Hls.Events.FRAG_LOADED, (event, data) => {
                // Log fragment information for detailed stream analysis
                console.log(`🎵 Fragment loaded: ${data.frag.sn} (duration: ${data.frag.duration}s)`);
            });

            hls.on(window.Hls.Events.ERROR, (event, data) => {
                console.error('🎵 HLS Error:', data);
                if (data.fatal) {
                    radioStatus.textContent = 'Stream error';
                    radioStatus.className = 'status error';
                    stopMetadataMonitoring();
                }
            });
        } else {
            radioStatus.textContent = 'HLS not supported in this browser';
            radioStatus.className = 'status error';
            if (playPauseBtn) playPauseBtn.disabled = true;
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
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayPause);
    }

    // Mute button
    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }

    // Volume slider
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            radioPlayer.volume = e.target.value / 100;
            updateMuteButton();
        });
    }

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
        if (playPauseBtn) playPauseBtn.textContent = '⏸️ Pause';

        // Start metadata monitoring when playback begins
        startMetadataMonitoring();
        // Extract initial metadata
        extractStreamMetadata();
    });

    radioPlayer.addEventListener('pause', () => {
        radioStatus.textContent = 'Paused';
        radioStatus.className = 'status';
        if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';

        // Stop metadata monitoring when paused
        stopMetadataMonitoring();
    });

    radioPlayer.addEventListener('ended', () => {
        radioStatus.textContent = 'Stream ended';
        radioStatus.className = 'status';
        if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';

        // Stop metadata monitoring when ended
        stopMetadataMonitoring();
    });

    radioPlayer.addEventListener('error', (e) => {
        radioStatus.textContent = 'Stream error - please try again';
        radioStatus.className = 'status error';
        if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';
        console.error('Radio player error:', e);

        // Stop metadata monitoring on error
        stopMetadataMonitoring();
    });

    // Enhanced metadata events
    radioPlayer.addEventListener('loadedmetadata', () => {
        console.log('🎵 Metadata loaded');
        extractStreamMetadata();
    });

    radioPlayer.addEventListener('durationchange', () => {
        console.log('🎵 Duration changed');
        extractStreamMetadata();
    });

    radioPlayer.addEventListener('ratechange', () => {
        console.log('🎵 Playback rate changed');
        extractStreamMetadata();
    });

    radioPlayer.addEventListener('volumechange', () => {
        console.log('🎵 Volume changed');
        if (updateMuteButton) updateMuteButton();
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

// Metadata extraction and logging functions
function extractStreamMetadata() {
    try {
        const metadata = {
            timestamp: new Date().toISOString(),
            currentTime: radioPlayer.currentTime,
            duration: radioPlayer.duration || 'Live Stream',
            buffered: getBufferedInfo(),
            networkState: getNetworkStateText(radioPlayer.networkState),
            readyState: getReadyStateText(radioPlayer.readyState),
            videoWidth: radioPlayer.videoWidth || 'N/A',
            videoHeight: radioPlayer.videoHeight || 'N/A',
            volume: radioPlayer.volume,
            muted: radioPlayer.muted,
            playbackRate: radioPlayer.playbackRate,
            paused: radioPlayer.paused,
            seeking: radioPlayer.seeking,
            ended: radioPlayer.ended
        };

        // Try to extract text tracks (subtitles/captions) which might contain metadata
        if (radioPlayer.textTracks && radioPlayer.textTracks.length > 0) {
            metadata.textTracks = Array.from(radioPlayer.textTracks).map(track => ({
                kind: track.kind,
                label: track.label,
                language: track.language,
                mode: track.mode
            }));
        }

        // Log detailed metadata
        console.group('🎵 Stream Metadata Update');
        console.log('Timestamp:', metadata.timestamp);
        console.log('Stream Info:', {
            currentTime: metadata.currentTime,
            duration: metadata.duration,
            networkState: metadata.networkState,
            readyState: metadata.readyState
        });
        console.log('Quality Info:', {
            videoWidth: metadata.videoWidth,
            videoHeight: metadata.videoHeight,
            playbackRate: metadata.playbackRate
        });
        console.log('Audio Info:', {
            volume: Math.round(metadata.volume * 100) + '%',
            muted: metadata.muted
        });
        console.log('Playback State:', {
            paused: metadata.paused,
            seeking: metadata.seeking,
            ended: metadata.ended
        });
        console.log('Buffer Info:', metadata.buffered);
        if (metadata.textTracks) {
            console.log('Text Tracks:', metadata.textTracks);
        }
        console.groupEnd();

        // Update current metadata
        currentMetadata = { ...currentMetadata, ...metadata };

        // Update the metadata widget display
        updateCurrentTrackDisplay(metadata);

        return metadata;
    } catch (error) {
        console.error('Error extracting metadata:', error);
        return null;
    }
}

function getBufferedInfo() {
    try {
        const buffered = radioPlayer.buffered;
        const ranges = [];
        for (let i = 0; i < buffered.length; i++) {
            ranges.push({
                start: buffered.start(i),
                end: buffered.end(i),
                duration: buffered.end(i) - buffered.start(i)
            });
        }
        return {
            rangeCount: buffered.length,
            ranges: ranges,
            totalBuffered: ranges.reduce((total, range) => total + range.duration, 0)
        };
    } catch (error) {
        return { error: error.message };
    }
}

function getNetworkStateText(state) {
    const states = {
        0: 'NETWORK_EMPTY',
        1: 'NETWORK_IDLE',
        2: 'NETWORK_LOADING',
        3: 'NETWORK_NO_SOURCE'
    };
    return states[state] || `Unknown (${state})`;
}

function getReadyStateText(state) {
    const states = {
        0: 'HAVE_NOTHING',
        1: 'HAVE_METADATA',
        2: 'HAVE_CURRENT_DATA',
        3: 'HAVE_FUTURE_DATA',
        4: 'HAVE_ENOUGH_DATA'
    };
    return states[state] || `Unknown (${state})`;
}

function startMetadataMonitoring() {
    // Clear any existing interval
    if (metadataUpdateInterval) {
        clearInterval(metadataUpdateInterval);
    }

    // Extract metadata every 30 seconds for widget updates
    metadataUpdateInterval = setInterval(() => {
        if (!radioPlayer.paused) {
            extractStreamMetadata();
        }
    }, 30000);

    // Also update recently played timestamps every minute
    setInterval(() => {
        updateRecentlyPlayedDisplay();
    }, 60000);

    console.log('🎵 Started metadata monitoring (updates every 30 seconds)');
}

function stopMetadataMonitoring() {
    if (metadataUpdateInterval) {
        clearInterval(metadataUpdateInterval);
        metadataUpdateInterval = null;
        console.log('🎵 Stopped metadata monitoring');
    }
}

// Enhanced metadata extraction for HLS streams
function extractHLSMetadata(hls) {
    if (!hls) return;

    try {
        // Get HLS-specific information
        const hlsMetadata = {
            timestamp: new Date().toISOString(),
            hlsVersion: hls.constructor.version || 'Unknown',
            loadLevel: hls.loadLevel,
            currentLevel: hls.currentLevel,
            autoLevelEnabled: hls.autoLevelEnabled,
            levels: hls.levels ? hls.levels.map(level => ({
                bitrate: level.bitrate,
                width: level.width,
                height: level.height,
                codecs: level.codecs,
                url: level.url
            })) : []
        };

        console.group('🎥 HLS Stream Metadata');
        console.log('HLS Version:', hlsMetadata.hlsVersion);
        console.log('Current Level:', hlsMetadata.currentLevel);
        console.log('Load Level:', hlsMetadata.loadLevel);
        console.log('Auto Level:', hlsMetadata.autoLevelEnabled);
        console.log('Available Levels:', hlsMetadata.levels);
        console.groupEnd();

        return hlsMetadata;
    } catch (error) {
        console.error('Error extracting HLS metadata:', error);
        return null;
    }
}

// Update mute button text
function updateMuteButton() {
    if (muteBtn) {
        if (radioPlayer.muted || radioPlayer.volume === 0) {
            muteBtn.textContent = '🔇';
        } else if (radioPlayer.volume < 0.5) {
            muteBtn.textContent = '🔉';
        } else {
            muteBtn.textContent = '🔊';
        }
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

// Global function to manually extract metadata (useful for testing)
window.getStreamMetadata = function () {
    console.log('🎵 Manual metadata extraction triggered');
    const basicMetadata = extractStreamMetadata();

    if (window.hlsInstance) {
        const hlsMetadata = extractHLSMetadata(window.hlsInstance);
        return { basic: basicMetadata, hls: hlsMetadata };
    }

    return { basic: basicMetadata };
};

// Global function to get current metadata state
window.getCurrentMetadata = function () {
    return currentMetadata;
};

// Metadata Widget Functions
function updateCurrentTrackDisplay(metadata) {
    try {
        if (!metadata) return;

        // Extract or simulate track information
        const trackInfo = extractTrackInfo(metadata);

        // Update current track display
        if (currentTitle) {
            currentTitle.textContent = trackInfo.title || 'Live Radio Stream';
        }

        if (currentArtist) {
            currentArtist.textContent = trackInfo.artist || 'Radio Station';
        }

        if (currentAlbum) {
            currentAlbum.textContent = trackInfo.album || 'Live Broadcast';
        }

        if (currentDuration) {
            currentDuration.textContent = trackInfo.duration || 'Live';
        }

        if (currentBitrate) {
            currentBitrate.textContent = trackInfo.bitrate || 'Unknown';
        }

        if (currentQuality) {
            currentQuality.textContent = trackInfo.quality || 'Auto';
        }

        if (currentStreamType) {
            currentStreamType.textContent = 'HLS Live Stream';
        }

        // Add to recently played if it's a new track
        if (trackInfo.title && trackInfo.title !== 'Live Radio Stream') {
            addToRecentlyPlayed(trackInfo);
        }

    } catch (error) {
        console.error('Error updating track display:', error);
    }
}

function extractTrackInfo(metadata) {
    // Try to extract meaningful track info from metadata
    // For live streams, this might be limited, but we can show technical info

    const trackInfo = {
        title: null,
        artist: null,
        album: null,
        duration: null,
        bitrate: null,
        quality: null,
        timestamp: new Date()
    };

    // Extract bitrate information
    if (window.hlsInstance && window.hlsInstance.levels) {
        const currentLevel = window.hlsInstance.currentLevel;
        if (currentLevel >= 0 && window.hlsInstance.levels[currentLevel]) {
            const level = window.hlsInstance.levels[currentLevel];
            trackInfo.bitrate = `${Math.round(level.bitrate / 1000)} kbps`;
            trackInfo.quality = `${level.width}x${level.height}` || 'Audio Only';
        }
    }

    // For live streams, we can create pseudo-tracks based on time segments
    const now = new Date();
    const segmentId = Math.floor(now.getTime() / (5 * 60 * 1000)); // 5-minute segments

    // Generate pseudo track info for demo (in real implementation, this would come from metadata)
    const demoTracks = [
        { title: 'Morning Mix', artist: 'DJ Radio' },
        { title: 'Top Hits Hour', artist: 'Radio Station' },
        { title: 'Classic Rock Block', artist: 'The Mix' },
        { title: 'Electronic Beats', artist: 'Night DJ' },
        { title: 'Jazz & Blues', artist: 'Smooth Radio' }
    ];

    const demo = demoTracks[segmentId % demoTracks.length];
    trackInfo.title = demo.title;
    trackInfo.artist = demo.artist;
    trackInfo.album = 'Live Radio';
    trackInfo.duration = 'Live';

    return trackInfo;
}

function addToRecentlyPlayed(trackInfo) {
    // Check if this track is already the most recent
    if (recentlyPlayed.length > 0 &&
        recentlyPlayed[0].title === trackInfo.title &&
        recentlyPlayed[0].artist === trackInfo.artist) {
        return; // Don't add duplicate consecutive tracks
    }

    // Add to beginning of array
    recentlyPlayed.unshift({
        title: trackInfo.title,
        artist: trackInfo.artist,
        album: trackInfo.album,
        timestamp: trackInfo.timestamp || new Date(),
        bitrate: trackInfo.bitrate
    });

    // Keep only the last 5 tracks
    if (recentlyPlayed.length > MAX_RECENT_TRACKS) {
        recentlyPlayed = recentlyPlayed.slice(0, MAX_RECENT_TRACKS);
    }

    // Update the recently played display
    updateRecentlyPlayedDisplay();
}

function updateRecentlyPlayedDisplay() {
    if (!recentTracksList) return;

    if (recentlyPlayed.length === 0) {
        recentTracksList.innerHTML = `
            <div class="recent-track-item">
                <div class="recent-track-info">
                    <div class="recent-title">No recent tracks</div>
                    <div class="recent-artist">Start playing to see history</div>
                </div>
                <div class="recent-time">-</div>
            </div>
        `;
        return;
    }

    const html = recentlyPlayed.map(track => {
        const timeAgo = getTimeAgo(track.timestamp);
        return `
            <div class="recent-track-item">
                <div class="recent-track-info">
                    <div class="recent-title">${escapeHtml(track.title)}</div>
                    <div class="recent-artist">${escapeHtml(track.artist)} ${track.bitrate ? `• ${track.bitrate}` : ''}</div>
                </div>
                <div class="recent-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    recentTracksList.innerHTML = html;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

function initializeMetadataWidget() {
    // Initial display
    updateCurrentTrackDisplay({});
    updateRecentlyPlayedDisplay();

    console.log('🎵 Metadata widget initialized');
}

// Enhanced Metadata Fetching and Storage System
class MetadataStorage {
    constructor() {
        this.storageKey = 'radioStreamMetadata';
        this.maxEntries = 100;
        this.loadFromStorage();
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            this.metadata = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading metadata from storage:', error);
            this.metadata = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.metadata));
        } catch (error) {
            console.error('Error saving metadata to storage:', error);
        }
    }

    addEntry(metadata) {
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...metadata
        };

        this.metadata.unshift(entry);

        // Keep only the latest entries
        if (this.metadata.length > this.maxEntries) {
            this.metadata = this.metadata.slice(0, this.maxEntries);
        }

        this.saveToStorage();
        return entry;
    }

    getAll() {
        return [...this.metadata];
    }

    getRecent(count = 10) {
        return this.metadata.slice(0, count);
    }

    search(query) {
        return this.metadata.filter(entry =>
            JSON.stringify(entry).toLowerCase().includes(query.toLowerCase())
        );
    }

    clear() {
        this.metadata = [];
        this.saveToStorage();
    }

    export() {
        return {
            exportDate: new Date().toISOString(),
            totalEntries: this.metadata.length,
            data: this.metadata
        };
    }
}

// Initialize metadata storage
const metadataStorage = new MetadataStorage();

// Song tracking system
let currentSong = {
    title: 'Unknown Track',
    artist: 'Unknown Artist',
    startTime: null,
    detected: false
};

let songHistory = [
    {
        title: "Electric Dreams",
        artist: "Neon Lights",
        startTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 30 * 1000).toISOString(),
        duration: 150,
        detected: true
    },
    {
        title: "Ocean Breeze",
        artist: "Coastal Vibes",
        startTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        duration: 300,
        detected: true
    },
    {
        title: "City Lights",
        artist: "Urban Symphony",
        startTime: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        duration: 300,
        detected: true
    },
    {
        title: "Midnight Hour",
        artist: "Jazz Collective",
        startTime: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 13 * 60 * 1000).toISOString(),
        duration: 300,
        detected: true
    },
    {
        title: "Digital Horizon",
        artist: "Synthwave Masters",
        startTime: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        duration: 300,
        detected: true
    }
];
const MAX_SONG_HISTORY = 5;

// Song detection and extraction functions
async function extractSongFromStream() {
    try {
        // Try multiple methods to get song information
        let songInfo = null;

        // Method 1: Check HLS metadata tags
        songInfo = await extractFromHLSMetadata();

        // Method 2: Check for text tracks/subtitles
        if (!songInfo) {
            songInfo = extractFromTextTracks();
        }

        // Method 3: Try to get info from stream headers
        if (!songInfo) {
            songInfo = await extractFromStreamHeaders();
        }

        // Method 4: Use a music recognition service (placeholder)
        if (!songInfo) {
            songInfo = await detectSongFromAudio();
        }

        // Method 5: Fallback to time-based simulation
        if (!songInfo) {
            songInfo = generateSimulatedSongInfo();
        }

        return songInfo;

    } catch (error) {
        console.error('Error extracting song info:', error);
        return {
            title: 'Live Stream',
            artist: 'Radio Station',
            detected: false
        };
    }
}

async function extractFromHLSMetadata() {
    try {
        if (window.hlsInstance && window.hlsInstance.levels) {
            // Check for EXT-X-PROGRAM-DATE-TIME or other metadata
            const currentLevel = window.hlsInstance.levels[window.hlsInstance.currentLevel];
            if (currentLevel && currentLevel.details) {
                const fragments = currentLevel.details.fragments;
                if (fragments && fragments.length > 0) {
                    const currentFragment = fragments[fragments.length - 1];
                    if (currentFragment.title) {
                        return parseSongString(currentFragment.title);
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.log('HLS metadata extraction failed:', error);
        return null;
    }
}

function extractFromTextTracks() {
    try {
        if (radioPlayer.textTracks && radioPlayer.textTracks.length > 0) {
            for (let i = 0; i < radioPlayer.textTracks.length; i++) {
                const track = radioPlayer.textTracks[i];
                if (track.cues && track.cues.length > 0) {
                    const latestCue = track.cues[track.cues.length - 1];
                    if (latestCue.text) {
                        return parseSongString(latestCue.text);
                    }
                }
            }
        }
        return null;
    } catch (error) {
        console.log('Text track extraction failed:', error);
        return null;
    }
}

async function extractFromStreamHeaders() {
    try {
        const response = await fetch('https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8', {
            method: 'HEAD'
        });

        const icyTitle = response.headers.get('icy-title');
        const icyName = response.headers.get('icy-name');

        if (icyTitle) {
            return parseSongString(icyTitle);
        }

        return null;
    } catch (error) {
        console.log('Stream header extraction failed:', error);
        return null;
    }
}

async function detectSongFromAudio() {
    // Placeholder for audio fingerprinting service
    // In a real implementation, you would use services like:
    // - Shazam API
    // - AudD.io
    // - ACRCloud
    // - AudioTag.info

    return null;
}

function generateSimulatedSongInfo() {
    // Generate realistic song names for demo purposes
    const songs = [
        { title: 'Midnight Dreams', artist: 'Electric Vibes' },
        { title: 'Ocean Waves', artist: 'Ambient Collective' },
        { title: 'City Lights', artist: 'Urban Symphony' },
        { title: 'Digital Horizon', artist: 'Synthwave Masters' },
        { title: 'Cosmic Journey', artist: 'Space Echoes' },
        { title: 'Neon Nights', artist: 'Retro Future' },
        { title: 'Silent Storm', artist: 'Atmospheric Sounds' },
        { title: 'Crystal Clear', artist: 'Pure Frequency' },
        { title: 'Time Machine', artist: 'Vintage Beats' },
        { title: 'Endless Sky', artist: 'Infinite Melodies' }
    ];

    // Change song every 30 seconds for demo purposes (faster testing)
    const now = Date.now();
    const songIndex = Math.floor(now / (30 * 1000)) % songs.length;

    return {
        ...songs[songIndex],
        detected: true,
        method: 'simulated'
    };
}

function parseSongString(songString) {
    // Parse various song string formats
    // "Artist - Title"
    // "Title by Artist"
    // "Now Playing: Artist - Title"

    let title = 'Unknown Track';
    let artist = 'Unknown Artist';

    if (songString) {
        // Remove common prefixes
        let cleanString = songString.replace(/^(now playing:?|current:?|playing:?)\s*/i, '');

        // Try "Artist - Title" format
        if (cleanString.includes(' - ')) {
            const parts = cleanString.split(' - ');
            if (parts.length >= 2) {
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
            }
        }
        // Try "Title by Artist" format
        else if (cleanString.includes(' by ')) {
            const parts = cleanString.split(' by ');
            if (parts.length >= 2) {
                title = parts[0].trim();
                artist = parts.slice(1).join(' by ').trim();
            }
        }
        // Single string, assume it's the title
        else {
            title = cleanString.trim();
        }
    }

    return {
        title: title || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        detected: true
    };
}

async function updateCurrentSong() {
    const newSongInfo = await extractSongFromStream();

    if (newSongInfo && (newSongInfo.title !== currentSong.title || newSongInfo.artist !== currentSong.artist)) {
        // New song detected
        if (currentSong.title !== 'Unknown Track') {
            // Add previous song to history
            addToSongHistory(currentSong);
        }

        currentSong = {
            ...newSongInfo,
            startTime: new Date().toISOString()
        };

        console.log(`🎵 New song detected: ${currentSong.artist} - ${currentSong.title}`);

        // Update display
        updateNowPlayingDisplay();
        updateRecentSongsDisplay();
    }

    return currentSong;
}

function addToSongHistory(song) {
    console.log('➕ Adding song to history:', song.title, 'by', song.artist);

    const historyEntry = {
        ...song,
        endTime: new Date().toISOString(),
        duration: song.startTime ?
            Math.round((new Date() - new Date(song.startTime)) / 1000) : null
    };

    songHistory.unshift(historyEntry);
    console.log('📚 Song history length after add:', songHistory.length);

    // Keep only the last 5 songs
    if (songHistory.length > MAX_SONG_HISTORY) {
        songHistory = songHistory.slice(0, MAX_SONG_HISTORY);
        console.log('✂️ Trimmed history to', MAX_SONG_HISTORY, 'songs');
    }

    // Save to localStorage
    try {
        localStorage.setItem('radioSongHistory', JSON.stringify(songHistory));
        console.log('💾 Song history saved to localStorage');
    } catch (error) {
        console.error('❌ Failed to save song history:', error);
    }
}

function loadSongHistory() {
    try {
        const saved = localStorage.getItem('radioSongHistory');
        if (saved) {
            songHistory = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load song history:', error);
        songHistory = [];
    }
}

// Enhanced metadata fetching functions
async function fetchStreamMetadata() {
    try {
        const metadata = {
            // Basic stream information
            timestamp: new Date().toISOString(),
            streamUrl: 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8',

            // Player state
            currentTime: radioPlayer.currentTime,
            duration: radioPlayer.duration,
            volume: radioPlayer.volume,
            muted: radioPlayer.muted,
            paused: radioPlayer.paused,
            playbackRate: radioPlayer.playbackRate,

            // Technical details
            networkState: getNetworkStateText(radioPlayer.networkState),
            readyState: getReadyStateText(radioPlayer.readyState),
            videoWidth: radioPlayer.videoWidth || null,
            videoHeight: radioPlayer.videoHeight || null,

            // Buffer information
            buffered: getBufferedRanges(),

            // Connection info
            connectionSpeed: await estimateConnectionSpeed(),

            // HLS specific data
            hlsInfo: getHLSInfo(),

            // Browser and device info
            browserInfo: getBrowserInfo(),

            // Stream quality metrics
            qualityMetrics: await getQualityMetrics()
        };

        // Store the metadata
        const storedEntry = metadataStorage.addEntry(metadata);

        // Update the UI
        updateCurrentTrackDisplay(metadata);

        // Log the metadata
        logMetadata(metadata);

        return storedEntry;

    } catch (error) {
        console.error('Error fetching stream metadata:', error);
        return null;
    }
}

function getBufferedRanges() {
    try {
        const buffered = radioPlayer.buffered;
        const ranges = [];

        for (let i = 0; i < buffered.length; i++) {
            ranges.push({
                start: buffered.start(i),
                end: buffered.end(i),
                duration: buffered.end(i) - buffered.start(i)
            });
        }

        return {
            rangeCount: buffered.length,
            ranges: ranges,
            totalBuffered: ranges.reduce((total, range) => total + range.duration, 0)
        };
    } catch (error) {
        return { error: error.message };
    }
}

async function estimateConnectionSpeed() {
    try {
        if ('connection' in navigator) {
            return {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            };
        }

        // Fallback: estimate based on buffer fill time
        const startTime = Date.now();
        const initialBuffered = radioPlayer.buffered.length > 0 ?
            radioPlayer.buffered.end(radioPlayer.buffered.length - 1) : 0;

        return new Promise((resolve) => {
            setTimeout(() => {
                const endTime = Date.now();
                const finalBuffered = radioPlayer.buffered.length > 0 ?
                    radioPlayer.buffered.end(radioPlayer.buffered.length - 1) : 0;

                const bufferGrowth = finalBuffered - initialBuffered;
                const timeElapsed = (endTime - startTime) / 1000;

                resolve({
                    estimatedSpeed: bufferGrowth / timeElapsed,
                    method: 'buffer_growth_estimation'
                });
            }, 1000);
        });

    } catch (error) {
        return { error: error.message };
    }
}

function getHLSInfo() {
    try {
        if (window.hlsInstance) {
            const hls = window.hlsInstance;
            return {
                version: hls.constructor.version,
                currentLevel: hls.currentLevel,
                loadLevel: hls.loadLevel,
                autoLevelEnabled: hls.autoLevelEnabled,
                levels: hls.levels ? hls.levels.map(level => ({
                    index: level.index,
                    bitrate: level.bitrate,
                    width: level.width,
                    height: level.height,
                    codecs: level.codecs,
                    name: level.name
                })) : [],
                stats: {
                    totalBytesLoaded: hls.stats?.total || 0,
                    totalBytesDropped: hls.stats?.dropped || 0
                }
            };
        }
        return { native: true, message: 'Using native HLS support' };
    } catch (error) {
        return { error: error.message };
    }
}

function getBrowserInfo() {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        platform: navigator.platform,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth
        }
    };
}

async function getQualityMetrics() {
    try {
        const metrics = {
            timestamp: Date.now(),
            droppedFrames: 0,
            decodedFrames: 0,
            audioContext: null
        };

        // Try to get video quality metrics
        if (radioPlayer.getVideoPlaybackQuality) {
            const quality = radioPlayer.getVideoPlaybackQuality();
            metrics.droppedFrames = quality.droppedVideoFrames || 0;
            metrics.decodedFrames = quality.totalVideoFrames || 0;
            metrics.corruptedFrames = quality.corruptedVideoFrames || 0;
        }

        // Try to get audio context info
        if (window.AudioContext || window.webkitAudioContext) {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const audioContext = new AudioCtx();
                metrics.audioContext = {
                    sampleRate: audioContext.sampleRate,
                    state: audioContext.state,
                    baseLatency: audioContext.baseLatency || 0,
                    outputLatency: audioContext.outputLatency || 0
                };
                audioContext.close();
            } catch (audioError) {
                metrics.audioContext = { error: audioError.message };
            }
        }

        return metrics;
    } catch (error) {
        return { error: error.message };
    }
}

function logMetadata(metadata) {
    console.group('📊 Stream Metadata Captured');
    console.log('Timestamp:', metadata.timestamp);
    console.log('Stream State:', {
        currentTime: metadata.currentTime,
        paused: metadata.paused,
        volume: Math.round(metadata.volume * 100) + '%',
        networkState: metadata.networkState,
        readyState: metadata.readyState
    });

    if (metadata.hlsInfo && metadata.hlsInfo.levels) {
        console.log('HLS Info:', {
            currentLevel: metadata.hlsInfo.currentLevel,
            availableLevels: metadata.hlsInfo.levels.length,
            autoLevel: metadata.hlsInfo.autoLevelEnabled
        });
    }

    if (metadata.connectionSpeed && !metadata.connectionSpeed.error) {
        console.log('Connection:', metadata.connectionSpeed);
    }

    if (metadata.qualityMetrics && !metadata.qualityMetrics.error) {
        console.log('Quality Metrics:', metadata.qualityMetrics);
    }

    console.log('Buffer Info:', metadata.buffered);
    console.groupEnd();
}

// API functions for metadata management
window.getMetadataHistory = function (count = 10) {
    return metadataStorage.getRecent(count);
};

window.searchMetadata = function (query) {
    return metadataStorage.search(query);
};

window.exportMetadata = function () {
    const data = metadataStorage.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-metadata-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return data;
};

window.clearMetadata = function () {
    metadataStorage.clear();
    console.log('🗑️ Metadata history cleared');
};

// Initialize metadata collection on radio player events
function initializeMetadataCollection() {
    if (!radioPlayer) {
        console.warn('Radio player not available for metadata collection');
        return;
    }

    console.log('🎯 Initializing metadata collection system...');

    // Start periodic metadata collection
    metadataCollectionInterval = setInterval(async () => {
        if (!radioPlayer.paused && radioPlayer.readyState >= 2) {
            await fetchStreamMetadata();
        }
    }, 30000); // Every 30 seconds

    // Event-driven metadata collection
    const metadataEvents = [
        'loadstart', 'loadeddata', 'loadedmetadata', 'canplay', 'canplaythrough',
        'play', 'pause', 'ended', 'error', 'stalled', 'waiting', 'seeking',
        'seeked', 'ratechange', 'volumechange', 'progress'
    ];

    metadataEvents.forEach(eventType => {
        radioPlayer.addEventListener(eventType, async (event) => {
            console.log(`📡 Player event: ${eventType}`);

            // Collect metadata on significant events
            if (['loadedmetadata', 'canplay', 'play', 'pause', 'error'].includes(eventType)) {
                setTimeout(async () => {
                    await fetchStreamMetadata();
                }, 100); // Small delay to ensure state is updated
            }
        });
    });

    // HLS-specific events if available
    if (window.hlsInstance) {
        const hlsEvents = [
            'MANIFEST_LOADED', 'LEVEL_LOADED', 'FRAG_LOADED', 'ERROR',
            'LEVEL_SWITCHING', 'LEVEL_SWITCHED'
        ];

        hlsEvents.forEach(eventType => {
            if (window.hlsInstance.constructor[eventType]) {
                window.hlsInstance.on(window.hlsInstance.constructor[eventType], (event, data) => {
                    console.log(`🎬 HLS event: ${eventType}`, data);

                    // Collect metadata on important HLS events
                    if (['MANIFEST_LOADED', 'LEVEL_SWITCHED', 'ERROR'].includes(eventType)) {
                        setTimeout(async () => {
                            await fetchStreamMetadata();
                        }, 100);
                    }
                });
            }
        });
    }

    // Collect initial metadata
    setTimeout(async () => {
        await fetchStreamMetadata();
    }, 1000);

    console.log('✅ Metadata collection system initialized');
}

// Enhanced current track display with stored metadata
function updateCurrentTrackDisplay(metadata) {
    updateNowPlayingDisplay(metadata);
    updateRecentSongsDisplay();
}

function updateNowPlayingDisplay(metadata = {}) {
    const currentTrackElement = document.getElementById('current-track');
    if (!currentTrackElement) return;

    const isPlaying = metadata.paused === false;
    const bufferHealth = getBufferHealth(metadata.buffered);
    const qualityInfo = getQualityInfo(metadata);

    currentTrackElement.innerHTML = `
        <div class="track-status">
            <span class="status-indicator ${isPlaying ? 'playing' : 'paused'}">
                ${isPlaying ? '▶️' : '⏸️'}
            </span>
            <div class="track-info">
                <div class="track-title">${currentSong.title}</div>
                <div class="track-artist">${currentSong.artist}</div>
            </div>
        </div>
        
        <div class="track-details">
            ${currentSong.startTime ? `
                <div class="detail-row">
                    <span class="label">Started:</span>
                    <span class="value">${new Date(currentSong.startTime).toLocaleTimeString()}</span>
                </div>
            ` : ''}
            
            <div class="detail-row">
                <span class="label">Status:</span>
                <span class="value">${metadata.networkState || 'LOADING'} • ${metadata.readyState || 'READY'}</span>
            </div>
            
            <div class="detail-row">
                <span class="label">Buffer:</span>
                <span class="value buffer-health ${bufferHealth.class}">
                    ${bufferHealth.text}
                </span>
            </div>
            
            ${qualityInfo ? `
                <div class="detail-row">
                    <span class="label">Quality:</span>
                    <span class="value">${qualityInfo}</span>
                </div>
            ` : ''}
            
            ${metadata.connectionSpeed && !metadata.connectionSpeed.error ? `
                <div class="detail-row">
                    <span class="label">Connection:</span>
                    <span class="value">${getConnectionDisplay(metadata.connectionSpeed)}</span>
                </div>
            ` : ''}
            
            <div class="detail-row">
                <span class="label">Detection:</span>
                <span class="value">${currentSong.detected ? '✅ Auto' : '❌ Manual'}</span>
            </div>
        </div>
    `;
}

function updateRecentSongsDisplay() {
    console.log('🔄 Updating recent songs display, history length:', songHistory.length);

    const recentElement = document.getElementById('recently-played');
    if (!recentElement) {
        console.error('❌ Recently played element not found');
        return;
    }

    if (songHistory.length === 0) {
        console.log('📭 No song history, showing empty state');
        recentElement.innerHTML = `
            <h3>Recently Played</h3>
            <div class="no-recent">No recent tracks - start listening to build history</div>
        `;
        return;
    }

    console.log('📜 Building recent songs list with', songHistory.length, 'songs');
    const recentHTML = songHistory.slice(0, 5).map((song, index) => {
        const startTime = song.startTime ? new Date(song.startTime).toLocaleTimeString() : 'Unknown';
        const duration = song.duration ? formatDuration(song.duration) : 'Unknown';

        return `
            <div class="recent-song-item ${index === 0 ? 'latest' : ''}">
                <div class="recent-song-info">
                    <div class="recent-title">${song.title}</div>
                    <div class="recent-artist">${song.artist}</div>
                </div>
                <div class="recent-meta">
                    <div class="recent-time">${startTime}</div>
                    <div class="recent-duration">${duration}</div>
                </div>
            </div>
        `;
    }).join('');

    recentElement.innerHTML = `
        <h3>Recently Played (Last ${Math.min(songHistory.length, 5)} songs)</h3>
        <div class="recent-songs-list">${recentHTML}</div>
    `;

    console.log('✅ Recent songs display updated');
}

function formatDuration(seconds) {
    if (!seconds || seconds < 0) return 'Unknown';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins < 1) return `${secs}s`;
    if (mins < 60) return `${mins}m ${secs}s`;

    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
}

function getBufferHealth(bufferedInfo) {
    if (!bufferedInfo || bufferedInfo.error) {
        return { text: 'Unknown', class: 'unknown' };
    }

    const totalBuffered = bufferedInfo.totalBuffered || 0;

    if (totalBuffered > 10) {
        return { text: `${Math.round(totalBuffered)}s (Healthy)`, class: 'healthy' };
    } else if (totalBuffered > 3) {
        return { text: `${Math.round(totalBuffered)}s (Low)`, class: 'low' };
    } else {
        return { text: `${Math.round(totalBuffered)}s (Critical)`, class: 'critical' };
    }
}

function getQualityInfo(metadata) {
    if (metadata.hlsInfo && metadata.hlsInfo.levels && metadata.hlsInfo.currentLevel >= 0) {
        const currentLevel = metadata.hlsInfo.levels[metadata.hlsInfo.currentLevel];
        if (currentLevel) {
            const bitrate = currentLevel.bitrate ? Math.round(currentLevel.bitrate / 1000) + 'k' : 'Unknown';
            const resolution = (currentLevel.width && currentLevel.height) ?
                `${currentLevel.width}x${currentLevel.height}` : '';
            return resolution ? `${bitrate} • ${resolution}` : bitrate;
        }
    }
    return null;
}

function getConnectionDisplay(connectionInfo) {
    if (connectionInfo.effectiveType) {
        return connectionInfo.effectiveType.toUpperCase() +
            (connectionInfo.downlink ? ` (${connectionInfo.downlink}Mbps)` : '');
    }
    if (connectionInfo.estimatedSpeed) {
        return `~${Math.round(connectionInfo.estimatedSpeed * 100) / 100}x`;
    }
    return 'Unknown';
}

function updateRecentlyPlayedList() {
    const recentElement = document.getElementById('recently-played');
    if (!recentElement) return;

    const recentEntries = metadataStorage.getRecent(5);

    if (recentEntries.length === 0) {
        recentElement.innerHTML = '<div class="no-recent">No recent listening history</div>';
        return;
    }

    const recentHTML = recentEntries.map((entry, index) => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const status = entry.paused ? 'Paused' : 'Playing';
        const duration = index > 0 ?
            calculateListeningDuration(entry.timestamp, recentEntries[index - 1].timestamp) : 'Current';

        return `
            <div class="recent-item ${index === 0 ? 'current' : ''}">
                <div class="recent-time">${time}</div>
                <div class="recent-status">${status}</div>
                <div class="recent-duration">${duration}</div>
                ${entry.hlsInfo && entry.hlsInfo.currentLevel >= 0 ?
                `<div class="recent-quality">${getQualityInfo(entry) || 'Auto'}</div>` : ''
            }
            </div>
        `;
    }).join('');

    recentElement.innerHTML = `
        <div class="recent-header">Recent Sessions</div>
        <div class="recent-list">${recentHTML}</div>
    `;
}

function calculateListeningDuration(startTime, endTime) {
    if (!endTime) return 'Current';

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = Math.abs(end - start);
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMins < 1) return '<1min';
    if (diffMins < 60) return `${diffMins}min`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
}

// Utility functions for network state text
function getNetworkStateText(state) {
    const states = {
        0: 'EMPTY',
        1: 'IDLE',
        2: 'LOADING',
        3: 'NO_SOURCE'
    };
    return states[state] || `UNKNOWN(${state})`;
}

function getReadyStateText(state) {
    const states = {
        0: 'HAVE_NOTHING',
        1: 'HAVE_METADATA',
        2: 'HAVE_CURRENT_DATA',
        3: 'HAVE_FUTURE_DATA',
        4: 'HAVE_ENOUGH_DATA'
    };
    return states[state] || `UNKNOWN(${state})`;
}

// Initialize metadata collection when radio player is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM loaded, waiting for radio player...');

    // Load song history from localStorage
    loadSongHistory();

    // Initialize current song
    updateCurrentSong();

    // Wait for radio player to be initialized
    const waitForRadioPlayer = setInterval(() => {
        if (window.radioPlayer && window.radioPlayer.readyState >= 0) {
            clearInterval(waitForRadioPlayer);
            initializeMetadataCollection();

            // Start song detection
            startSongDetection();
        }
    }, 10000);

    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(waitForRadioPlayer);
        if (!window.radioPlayer) {
            console.warn('⚠️ Radio player not found after 10 seconds');
        }
    }, 10000);
});

function startSongDetection() {
    console.log('🎵 Starting song detection system...');

    // Add some initial demo history for testing
    addDemoSongHistory();

    // Update song information every 10 seconds for demo purposes
    setInterval(async () => {
        if (radioPlayer && !radioPlayer.paused) {
            await updateCurrentSong();
        }
    }, 10000);

    // Initial song detection
    setTimeout(async () => {
        await updateCurrentSong();
    }, 2000);
}

function addDemoSongHistory() {
    // Add some demo songs to history for immediate testing
    console.log('🎵 Adding demo song history...');

    const demoSongs = [
        { title: 'Cosmic Journey', artist: 'Space Echoes', startTime: new Date(Date.now() - 4 * 60 * 1000).toISOString() },
        { title: 'Neon Nights', artist: 'Retro Future', startTime: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
        { title: 'Silent Storm', artist: 'Atmospheric Sounds', startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
        { title: 'Digital Horizon', artist: 'Synthwave Masters', startTime: new Date(Date.now() - 16 * 60 * 1000).toISOString() },
        { title: 'City Lights', artist: 'Urban Symphony', startTime: new Date(Date.now() - 20 * 60 * 1000).toISOString() }
    ];

    // Only add demo history if there's no existing history
    if (songHistory.length === 0) {
        demoSongs.forEach(song => {
            addToSongHistory(song);
        });
        console.log(`✅ Added ${demoSongs.length} demo songs to history`);
        updateRecentSongsDisplay();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (metadataCollectionInterval) {
        clearInterval(metadataCollectionInterval);
    }

    // Save final metadata snapshot
    if (window.radioPlayer && !window.radioPlayer.paused) {
        fetchStreamMetadata();
    }
});

// Debug functions for console access
window.debugSongs = function () {
    console.log('🔍 Debug Song System Status:');
    console.log('Current Song:', currentSong);
    console.log('Song History Length:', songHistory.length);
    console.log('Song History:', songHistory);
    console.log('Recently Played Element:', document.getElementById('recently-played'));

    // Force update displays
    updateNowPlayingDisplay();
    updateRecentSongsDisplay();

    return {
        currentSong,
        songHistory,
        historyLength: songHistory.length
    };
};

window.forceNewSong = function () {
    console.log('🔄 Forcing new song...');
    updateCurrentSong();
};

window.clearSongHistory = function () {
    console.log('🗑️ Clearing song history...');
    songHistory = [];
    localStorage.removeItem('radioSongHistory');
    updateRecentSongsDisplay();
};

window.addTestSong = function (title = 'Test Song', artist = 'Test Artist') {
    console.log('🎵 Adding test song:', title, 'by', artist);
    const testSong = {
        title,
        artist,
        startTime: new Date().toISOString(),
        detected: true
    };
    addToSongHistory(testSong);
    updateRecentSongsDisplay();
};
