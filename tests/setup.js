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
    createTestDatabase: async () => {
        const { Pool } = require('pg');
        const db = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5433,  // Use dev database port
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'dev_password',  // Use dev password
            database: process.env.DB_NAME || 'radiocalico_dev'  // Use dev database
        });
        
        // Clean existing test data
        await global.testUtils.cleanDatabase(db);
        
        return db;
    },

    // Clean up test database
    cleanDatabase: async (db) => {
        if (db) {
            try {
                await db.query('DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)', ['test%']);
                await db.query('DELETE FROM users WHERE username LIKE $1', ['test%']);
                await db.query('DELETE FROM songs WHERE title LIKE $1', ['Test%']);
            } catch (error) {
                console.error('Error cleaning test database:', error);
            }
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
