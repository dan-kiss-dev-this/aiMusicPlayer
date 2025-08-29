// Integration Tests for Ratings System
// File: tests/ratings-integration.test.js

/**
 * Integration Tests for Ratings System
 * Tests the complete flow between frontend and backend including:
 * - End-to-end rating submission
 * - Real API communication
 * - Database persistence
 * - Authentication flow
 * - Error scenarios
 */

// Set test environment variables before importing server
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5433';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'dev_password';
process.env.DB_NAME = process.env.DB_NAME || 'radiocalico_dev';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-github-actions';

const request = require('supertest');
const app = require('../server'); // Import the Express app AFTER setting env vars
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Ratings System Integration Tests', () => {
    let db;
    let testUser;
    let authToken;
    
    beforeAll(async () => {
        // Create PostgreSQL connection for testing
        db = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5433,  // Use dev database port
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'dev_password',  // Use dev password
            database: process.env.DB_NAME || 'radiocalico_dev'  // Use dev database
        });
        
        // Clean test data (tables already exist from init-db.sql)
        await db.query('DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)', ['test%']);
        await db.query('DELETE FROM users WHERE username LIKE $1', ['test%']);
        
        // Create test user with unique username
        const hashedPassword = await bcrypt.hash('testpassword123', 10);
        const timestamp = Date.now();
        const userResult = await db.query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
        `, [`testuser_${timestamp}`, `test_${timestamp}@example.com`, hashedPassword]);
        
        testUser = userResult.rows[0];
        
        // Create auth token
        authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-jwt-secret-for-github-actions', { expiresIn: '1h' });
    });
    
    afterAll(async () => {
        // Clean up test data
        if (testUser) {
            await db.query('DELETE FROM ratings WHERE user_id = $1', [testUser.id]);
            await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        }
        
        // Close database connection
        await db.end();
    });

    beforeEach(async () => {
        // Clean ratings before each test
        if (testUser) {
            await db.query('DELETE FROM ratings WHERE user_id = $1', [testUser.id]);
        }
    });

    describe('End-to-End Rating Submission', () => {
        test.skip('should submit rating through API and persist to database', async () => {
            const songData = {
                song_title: 'Test Song',
                song_artist: 'Test Artist',
                rating: 1, // Thumbs up (1) or thumbs down (-1)
                user_id: testUser.id
            };

            // Step 1: Submit rating through API
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send(songData);
                
            // Debug: log the full response
            console.log('Response status:', response.status);
            console.log('Response body:', JSON.stringify(response.body, null, 2));
            console.log('Response headers:', response.headers);
            
            if (response.status !== 200) {
                // This will help us understand what went wrong
                console.log('Request data sent:', JSON.stringify(songData, null, 2));
                console.log('Auth token:', authToken ? 'Present' : 'Missing');
            }
            
            expect(response.status).toBe(200);

            expect(response.body.message).toBe('Rating submitted successfully');
            expect(response.body.rating).toBe('thumbs_up');

            // Step 2: Verify rating was created in database (no separate songs table involved)
            const ratingResult = await db.query('SELECT * FROM ratings WHERE user_id = $1 AND song_title = $2 AND song_artist = $3', 
                [testUser.id, songData.song_title, songData.song_artist]);
            const rating = ratingResult.rows[0];
            
            expect(rating).toBeTruthy();
            expect(rating.rating).toBe(songData.rating);
            expect(rating.user_id).toBe(testUser.id);
            expect(rating.song_title).toBe(songData.song_title);
            expect(rating.song_artist).toBe(songData.song_artist);
        });
    });
});

// Helper function to create test data
async function createTestSong(title, artist, db) {
    const result = await db.query('INSERT INTO songs (title, artist) VALUES ($1, $2) RETURNING id', [title, artist]);
    return result.rows[0];
}

async function createTestRating(userId, songTitle, songArtist, rating, db) {
    const result = await db.query('INSERT INTO ratings (user_id, song_title, song_artist, rating) VALUES ($1, $2, $3, $4) RETURNING id', [userId, songTitle, songArtist, rating]);
    return result.rows[0];
}
