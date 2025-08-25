// API Base URL
const API_BASE = '/api';

// DOM Elements
const addSongBtn = document.getElementById('add-song-btn');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const refreshBtn = document.getElementById('refresh-btn');
const songsListEl = document.getElementById('songs-list');
const playlistsListEl = document.getElementById('playlists-list');
const serverStatusEl = document.getElementById('server-status');

// Modals
const addSongModal = document.getElementById('add-song-modal');
const createPlaylistModal = document.getElementById('create-playlist-modal');
const addSongForm = document.getElementById('add-song-form');
const createPlaylistForm = document.getElementById('create-playlist-form');

// Close buttons for modals
const closeButtons = document.querySelectorAll('.close');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    loadSongs();
    loadPlaylists();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    addSongBtn.addEventListener('click', () => showModal(addSongModal));
    createPlaylistBtn.addEventListener('click', () => showModal(createPlaylistModal));
    refreshBtn.addEventListener('click', refreshData);
    
    addSongForm.addEventListener('submit', handleAddSong);
    createPlaylistForm.addEventListener('submit', handleCreatePlaylist);
    
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
        const songs = await makeRequest(`${API_BASE}/songs`);
        renderSongs(songs);
    } catch (error) {
        songsListEl.innerHTML = '<div class="empty-state">Failed to load songs</div>';
    }
}

// Load playlists from API
async function loadPlaylists() {
    try {
        showLoading(playlistsListEl);
        const playlists = await makeRequest(`${API_BASE}/playlists`);
        renderPlaylists(playlists);
    } catch (error) {
        playlistsListEl.innerHTML = '<div class="empty-state">Failed to load playlists</div>';
    }
}

// Render songs
function renderSongs(songs) {
    if (songs.length === 0) {
        songsListEl.innerHTML = '<div class="empty-state">No songs yet. Add your first song!</div>';
        return;
    }
    
    songsListEl.innerHTML = songs.map(song => `
        <div class="list-item">
            <h4>${escapeHtml(song.title)}</h4>
            <p><strong>Artist:</strong> ${escapeHtml(song.artist)}</p>
            ${song.album ? `<p><strong>Album:</strong> ${escapeHtml(song.album)}</p>` : ''}
            ${song.duration ? `<p><strong>Duration:</strong> ${formatDuration(song.duration)}</p>` : ''}
            <p><small>Added: ${formatDate(song.created_at)}</small></p>
        </div>
    `).join('');
}

// Render playlists
function renderPlaylists(playlists) {
    if (playlists.length === 0) {
        playlistsListEl.innerHTML = '<div class="empty-state">No playlists yet. Create your first playlist!</div>';
        return;
    }
    
    playlistsListEl.innerHTML = playlists.map(playlist => `
        <div class="list-item">
            <h4>${escapeHtml(playlist.name)}</h4>
            ${playlist.description ? `<p>${escapeHtml(playlist.description)}</p>` : ''}
            <p><small>Created: ${formatDate(playlist.created_at)}</small></p>
        </div>
    `).join('');
}

// Handle add song form submission
async function handleAddSong(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
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
        await makeRequest(`${API_BASE}/songs`, {
            method: 'POST',
            body: JSON.stringify(songData)
        });
        
        showNotification('Song added successfully!', 'success');
        hideModal(addSongModal);
        loadSongs();
    } catch (error) {
        console.error('Error adding song:', error);
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
        await makeRequest(`${API_BASE}/playlists`, {
            method: 'POST',
            body: JSON.stringify(playlistData)
        });
        
        showNotification('Playlist created successfully!', 'success');
        hideModal(createPlaylistModal);
        loadPlaylists();
    } catch (error) {
        console.error('Error creating playlist:', error);
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
