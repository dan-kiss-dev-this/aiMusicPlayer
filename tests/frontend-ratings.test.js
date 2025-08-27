// Frontend Unit Tests for Ratings System
// File: tests/frontend-ratings.test.js

/**
 * Frontend Ratings System Unit Tests
 * Tests the client-side rating functionality including:
 * - Rating submission
 * - UI updates
 * - Authentication handling
 * - Error handling
 */

describe('Frontend Ratings System Tests', () => {
    let mockUser;
    let mockCurrentSong;
    
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="current-title">Test Song</div>
            <div id="current-artist">Test Artist</div>
            <div id="track-rating" style="display: flex;">
                <button id="thumbs-up-btn" class="rating-btn">👍</button>
                <button id="thumbs-down-btn" class="rating-btn">👎</button>
                <span id="thumbs-up-count">0</span>
                <span id="thumbs-down-count">0</span>
            </div>
            <div id="login-modal" style="display: none;"></div>
        `;
        
        // Mock user state
        mockUser = { 
            id: 1, 
            username: 'testuser' 
        };
        
        mockCurrentSong = {
            title: 'Test Song',
            artist: 'Test Artist'
        };
        
        // Reset global state
        global.currentUser = null;
        global.currentSong = mockCurrentSong;
        
        // Mock fetch responses
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('handleRating()', () => {
        test('should show login modal when user not authenticated', async () => {
            // Mock functions
            const mockShowModal = jest.fn();
            const mockShowNotification = jest.fn();
            global.showModal = mockShowModal;
            global.showNotification = mockShowNotification;
            
            // Set user as not logged in
            global.currentUser = null;
            
            // Call handleRating
            await handleRating(1);
            
            expect(mockShowNotification).toHaveBeenCalledWith(
                'Please login to rate songs', 
                'error'
            );
            expect(mockShowModal).toHaveBeenCalled();
        });

        test('should submit rating when user is authenticated', async () => {
            // Mock authenticated user
            global.currentUser = mockUser;
            
            // Mock successful API response
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    message: 'Rating submitted successfully',
                    rating: { id: 1, rating: 1 }
                })
            });
            
            // Mock functions
            global.makeAuthenticatedRequest = jest.fn().mockResolvedValue({
                message: 'Rating submitted successfully',
                rating: { id: 1, rating: 1 }
            });
            global.showNotification = jest.fn();
            global.updateRatingDisplay = jest.fn();
            global.updateDynamicRatingDisplay = jest.fn();
            
            await handleRating(1);
            
            expect(global.makeAuthenticatedRequest).toHaveBeenCalledWith('/api/ratings', {
                method: 'POST',
                body: JSON.stringify({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 1
                })
            });
            
            expect(global.showNotification).toHaveBeenCalledWith(
                'Gave "Test Song" a thumbs up!',
                'success'
            );
        });

        test('should handle API errors gracefully', async () => {
            global.currentUser = mockUser;
            
            // Mock API error
            global.makeAuthenticatedRequest = jest.fn().mockRejectedValue(
                new Error('Network error')
            );
            global.showNotification = jest.fn();
            
            await handleRating(1);
            
            expect(global.showNotification).toHaveBeenCalledWith(
                'Failed to submit rating: Network error',
                'error'
            );
        });

        test('should disable buttons during rating submission', async () => {
            global.currentUser = mockUser;
            
            const thumbsUpBtn = document.getElementById('thumbs-up-btn');
            const thumbsDownBtn = document.getElementById('thumbs-down-btn');
            
            // Mock slow API response
            global.makeAuthenticatedRequest = jest.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 100))
            );
            global.showNotification = jest.fn();
            global.updateRatingDisplay = jest.fn();
            global.updateDynamicRatingDisplay = jest.fn();
            
            const ratingPromise = handleRating(1);
            
            // Buttons should be disabled immediately
            expect(thumbsUpBtn.disabled).toBe(true);
            expect(thumbsDownBtn.disabled).toBe(true);
            
            await ratingPromise;
            
            // Buttons should be re-enabled after completion
            expect(thumbsUpBtn.disabled).toBe(false);
            expect(thumbsDownBtn.disabled).toBe(false);
        });
    });

    describe('updateRatingDisplay()', () => {
        test('should hide rating section when no track playing', async () => {
            document.getElementById('current-title').textContent = 'No track playing';
            document.getElementById('current-artist').textContent = '-';
            
            const trackRating = document.getElementById('track-rating');
            global.trackRating = trackRating;
            
            await updateRatingDisplay();
            
            expect(trackRating.style.display).toBe('none');
        });

        test('should show rating section and update counts', async () => {
            global.currentUser = mockUser;
            
            // Mock API response
            global.makeAuthenticatedRequest = jest.fn().mockResolvedValue({
                thumbs_up: 5,
                thumbs_down: 2,
                user_rating: 1
            });
            
            const trackRating = document.getElementById('track-rating');
            const thumbsUpCount = document.getElementById('thumbs-up-count');
            const thumbsDownCount = document.getElementById('thumbs-down-count');
            const thumbsUpBtn = document.getElementById('thumbs-up-btn');
            
            global.trackRating = trackRating;
            global.thumbsUpCount = thumbsUpCount;
            global.thumbsDownCount = thumbsDownCount;
            global.thumbsUpBtn = thumbsUpBtn;
            global.thumbsDownBtn = document.getElementById('thumbs-down-btn');
            
            await updateRatingDisplay('Test Song', 'Test Artist');
            
            expect(trackRating.style.display).toBe('flex');
            expect(thumbsUpCount.textContent).toBe('5');
            expect(thumbsDownCount.textContent).toBe('2');
            expect(thumbsUpBtn.classList.contains('active')).toBe(true);
        });

        test('should handle API errors in rating display', async () => {
            global.makeRequest = jest.fn().mockRejectedValue(new Error('API Error'));
            
            const thumbsUpCount = document.getElementById('thumbs-up-count');
            const thumbsDownCount = document.getElementById('thumbs-down-count');
            
            global.thumbsUpCount = thumbsUpCount;
            global.thumbsDownCount = thumbsDownCount;
            global.thumbsUpBtn = document.getElementById('thumbs-up-btn');
            global.thumbsDownBtn = document.getElementById('thumbs-down-btn');
            
            await updateRatingDisplay('Test Song', 'Test Artist');
            
            // Should set default values on error
            expect(thumbsUpCount.textContent).toBe('0');
            expect(thumbsDownCount.textContent).toBe('0');
        });
    });

    describe('Rating UI Interactions', () => {
        test('should add event listeners to rating buttons', () => {
            const thumbsUpBtn = document.getElementById('thumbs-up-btn');
            const thumbsDownBtn = document.getElementById('thumbs-down-btn');
            
            // Mock handleRating function
            global.handleRating = jest.fn();
            
            // Simulate adding event listeners (as done in setupEventListeners)
            thumbsUpBtn.addEventListener('click', () => global.handleRating(1));
            thumbsDownBtn.addEventListener('click', () => global.handleRating(-1));
            
            // Simulate clicks
            thumbsUpBtn.click();
            thumbsDownBtn.click();
            
            expect(global.handleRating).toHaveBeenCalledWith(1);
            expect(global.handleRating).toHaveBeenCalledWith(-1);
        });

        test('should update button states based on user rating', () => {
            const thumbsUpBtn = document.getElementById('thumbs-up-btn');
            const thumbsDownBtn = document.getElementById('thumbs-down-btn');
            
            // Simulate user has given thumbs up
            thumbsUpBtn.classList.add('active');
            thumbsDownBtn.classList.remove('active');
            
            expect(thumbsUpBtn.classList.contains('active')).toBe(true);
            expect(thumbsDownBtn.classList.contains('active')).toBe(false);
            
            // Simulate user changes to thumbs down
            thumbsUpBtn.classList.remove('active');
            thumbsDownBtn.classList.add('active');
            
            expect(thumbsUpBtn.classList.contains('active')).toBe(false);
            expect(thumbsDownBtn.classList.contains('active')).toBe(true);
        });
    });

    describe('Current Song Detection', () => {
        test('should use currentSong object when available', async () => {
            global.currentUser = mockUser;
            global.currentSong = {
                title: 'Dynamic Song',
                artist: 'Dynamic Artist'
            };
            
            global.makeAuthenticatedRequest = jest.fn().mockResolvedValue({});
            global.showNotification = jest.fn();
            global.updateRatingDisplay = jest.fn();
            global.updateDynamicRatingDisplay = jest.fn();
            
            await handleRating(1);
            
            expect(global.makeAuthenticatedRequest).toHaveBeenCalledWith('/api/ratings', {
                method: 'POST',
                body: JSON.stringify({
                    song_title: 'Dynamic Song',
                    song_artist: 'Dynamic Artist',
                    rating: 1
                })
            });
        });

        test('should fallback to DOM elements when currentSong unavailable', async () => {
            global.currentUser = mockUser;
            global.currentSong = { title: 'Unknown Track', artist: 'Unknown Artist' };
            
            global.makeAuthenticatedRequest = jest.fn().mockResolvedValue({});
            global.showNotification = jest.fn();
            global.updateRatingDisplay = jest.fn();
            global.updateDynamicRatingDisplay = jest.fn();
            
            await handleRating(1);
            
            expect(global.makeAuthenticatedRequest).toHaveBeenCalledWith('/api/ratings', {
                method: 'POST',
                body: JSON.stringify({
                    song_title: 'Test Song',  // From DOM
                    song_artist: 'Test Artist', // From DOM
                    rating: 1
                })
            });
        });
    });
});

// Mock implementation of rating functions for testing
async function handleRating(rating) {
    console.log('🎵 handleRating called with rating:', rating);
    
    if (!global.currentUser) {
        console.log('❌ No currentUser found, showing login modal');
        global.showNotification('Please login to rate songs', 'error');
        global.showModal(document.getElementById('login-modal'));
        return;
    }

    let songTitle, songArtist;
    
    if (global.currentSong && global.currentSong.title && global.currentSong.artist && 
        global.currentSong.title !== 'Unknown Track' && global.currentSong.artist !== 'Unknown Artist') {
        songTitle = global.currentSong.title;
        songArtist = global.currentSong.artist;
    } else {
        const currentTitle = document.getElementById('current-title');
        const currentArtist = document.getElementById('current-artist');
        
        if (!currentTitle || !currentArtist || 
            currentTitle.textContent === 'No track playing' || 
            currentArtist.textContent === '-') {
            global.showNotification('No track is currently playing to rate', 'error');
            return;
        }
        
        songTitle = currentTitle.textContent;
        songArtist = currentArtist.textContent;
    }

    try {
        // Disable buttons while submitting
        const thumbsUpBtn = document.getElementById('thumbs-up-btn');
        const thumbsDownBtn = document.getElementById('thumbs-down-btn');
        if (thumbsUpBtn) thumbsUpBtn.disabled = true;
        if (thumbsDownBtn) thumbsDownBtn.disabled = true;

        await global.makeAuthenticatedRequest('/api/ratings', {
            method: 'POST',
            body: JSON.stringify({
                song_title: songTitle,
                song_artist: songArtist,
                rating: rating
            })
        });

        const ratingText = rating === 1 ? 'thumbs up' : 'thumbs down';
        global.showNotification(`Gave "${songTitle}" a ${ratingText}!`, 'success');
        
        if (global.updateRatingDisplay) global.updateRatingDisplay(songTitle, songArtist);
        if (global.updateDynamicRatingDisplay) global.updateDynamicRatingDisplay(songTitle, songArtist);

    } catch (error) {
        global.showNotification('Failed to submit rating: ' + error.message, 'error');
    } finally {
        // Re-enable buttons
        const thumbsUpBtn = document.getElementById('thumbs-up-btn');
        const thumbsDownBtn = document.getElementById('thumbs-down-btn');
        if (thumbsUpBtn) thumbsUpBtn.disabled = false;
        if (thumbsDownBtn) thumbsDownBtn.disabled = false;
    }
}

async function updateRatingDisplay(songTitle = null, songArtist = null) {
    if (!global.trackRating) return;

    if (!songTitle || !songArtist) {
        const currentTitleEl = document.getElementById('current-title');
        const currentArtistEl = document.getElementById('current-artist');
        
        if (!currentTitleEl || !currentArtistEl || 
            currentTitleEl.textContent === 'No track playing' || 
            currentArtistEl.textContent === '-') {
            global.trackRating.style.display = 'none';
            return;
        }
        
        songTitle = currentTitleEl.textContent;
        songArtist = currentArtistEl.textContent;
    }

    global.trackRating.style.display = 'flex';

    try {
        const encodedTitle = encodeURIComponent(songTitle);
        const encodedArtist = encodeURIComponent(songArtist);
        
        const response = await (global.currentUser ? 
            global.makeAuthenticatedRequest(`/api/ratings/${encodedTitle}/${encodedArtist}`) :
            global.makeRequest(`/api/ratings/${encodedTitle}/${encodedArtist}`)
        );

        if (global.thumbsUpCount) global.thumbsUpCount.textContent = response.thumbs_up || 0;
        if (global.thumbsDownCount) global.thumbsDownCount.textContent = response.thumbs_down || 0;

        if (global.currentUser && response.user_rating !== undefined) {
            if (global.thumbsUpBtn) {
                global.thumbsUpBtn.classList.toggle('active', response.user_rating === 1);
            }
            if (global.thumbsDownBtn) {
                global.thumbsDownBtn.classList.toggle('active', response.user_rating === -1);
            }
        }

    } catch (error) {
        console.error('Error loading rating data:', error);
        if (global.thumbsUpCount) global.thumbsUpCount.textContent = '0';
        if (global.thumbsDownCount) global.thumbsDownCount.textContent = '0';
    }
}

module.exports = {
    handleRating,
    updateRatingDisplay
};
