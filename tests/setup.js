// Test Setup Configuration
// File: tests/setup.js

/**
 * Global test setup for Radio Calico ratings system tests
 * Sets up common mocks, test utilities, and environment configuration
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Global test utilities
global.testUtils = {
    // Create mock user object
    createMockUser: (overrides = {}) => ({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        is_verified: true,
        created_at: new Date().toISOString(),
        ...overrides
    }),

    // Create mock song object
    createMockSong: (overrides = {}) => ({
        id: 1,
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        created_at: new Date().toISOString(),
        ...overrides
    }),

    // Create mock rating object
    createMockRating: (overrides = {}) => ({
        id: 1,
        user_id: 1,
        song_id: 1,
        rating: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides
    }),

    // Generate valid JWT token for testing
    generateTestToken: (user = null) => {
        const jwt = require('jsonwebtoken');
        const testUser = user || global.testUtils.createMockUser();
        return jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
    },

    // Create mock request/response objects
    createMockReq: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides
    }),

    createMockRes: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        return res;
    },

    // Database test helpers
    createTestDatabase: () => {
        const Database = require('better-sqlite3');
        const db = new Database(':memory:');
        
        // Create test tables
        const createTables = `
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_verified BOOLEAN DEFAULT 0
            );

            CREATE TABLE songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                duration INTEGER,
                file_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(title, artist)
            );

            CREATE TABLE ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                song_id INTEGER NOT NULL,
                rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (song_id) REFERENCES songs (id) ON DELETE CASCADE,
                UNIQUE(user_id, song_id)
            );
        `;
        
        db.exec(createTables);
        return db;
    },

    // Clean up test database
    cleanDatabase: (db) => {
        if (db) {
            db.exec('DELETE FROM ratings');
            db.exec('DELETE FROM songs');
            db.exec('DELETE FROM users');
        }
    },

    // Wait for async operations
    wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

    // Verify rating response structure
    validateRatingResponse: (response, expectedFields = []) => {
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        
        const defaultFields = ['id', 'user_id', 'song_id', 'rating', 'created_at'];
        const fieldsToCheck = expectedFields.length > 0 ? expectedFields : defaultFields;
        
        fieldsToCheck.forEach(field => {
            expect(response).toHaveProperty(field);
        });
    },

    // Verify song response structure
    validateSongResponse: (response, expectedFields = []) => {
        expect(response).toBeDefined();
        expect(typeof response).toBe('object');
        
        const defaultFields = ['id', 'title', 'artist', 'created_at'];
        const fieldsToCheck = expectedFields.length > 0 ? expectedFields : defaultFields;
        
        fieldsToCheck.forEach(field => {
            expect(response).toHaveProperty(field);
        });
    }
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };

beforeAll(() => {
    // Suppress console output during tests unless specifically testing it
    global.console = {
        ...console,
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    };
});

afterAll(() => {
    // Restore original console
    global.console = originalConsole;
});

// Global test setup
beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset any global state
    if (global.currentUser) global.currentUser = null;
    if (global.currentSong) global.currentSong = null;
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Mock DOM environment for frontend tests
if (typeof window === 'undefined') {
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable'
    });
    
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.sessionStorage = dom.window.sessionStorage;
    global.navigator = dom.window.navigator;
}

// Mock fetch for testing
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Custom Jest matchers
expect.extend({
    toBeValidRating(received) {
        const pass = received === 1 || received === -1;
        if (pass) {
            return {
                message: () => `expected ${received} not to be a valid rating`,
                pass: true
            };
        } else {
            return {
                message: () => `expected ${received} to be a valid rating (1 or -1)`,
                pass: false
            };
        }
    },

    toHaveValidAuthToken(received) {
        const jwt = require('jsonwebtoken');
        try {
            const decoded = jwt.verify(received, process.env.JWT_SECRET);
            const pass = decoded && decoded.id && decoded.username;
            
            if (pass) {
                return {
                    message: () => `expected token not to be valid`,
                    pass: true
                };
            } else {
                return {
                    message: () => `expected token to have valid user data`,
                    pass: false
                };
            }
        } catch (error) {
            return {
                message: () => `expected valid JWT token, got: ${error.message}`,
                pass: false
            };
        }
    }
});

module.exports = {
    testUtils: global.testUtils
};
