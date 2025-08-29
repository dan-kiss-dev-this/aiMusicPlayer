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

const request = require('supertest');
const app = require('../server'); // Import the Express app
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
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'test_password',
            database: process.env.DB_NAME || 'radiocalico_test'
        });
        
        // Clean test data (tables already exist from init-db.sql)
        await db.query('DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)', ['test%']);
        await db.query('DELETE FROM users WHERE username LIKE $1', ['test%']);
        
        // Create test user
        const hashedPassword = await bcrypt.hash('testpassword123', 10);
        const userResult = await db.query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
        `, ['testuser', 'test@example.com', hashedPassword]);
        
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
        test('should submit rating through API and persist to database', async () => {
            const songData = {
                song_title: 'Test Song',
                song_artist: 'Test Artist',
                rating: 1, // Thumbs up (1) or thumbs down (-1)
                user_id: testUser.id
            };

            // Step 1: Submit rating through API
            const response = await request(app)
                .post('/rate-song')
                .set('Authorization', `Bearer ${authToken}`)
                .send(songData)
                .expect(200);

            expect(response.body.success).toBe(true);

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
