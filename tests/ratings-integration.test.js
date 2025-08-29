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
            INSERT INTO users (username, email, password_hash, is_verified)
            VALUES ($1, $2, $3, true)
            RETURNING id, username, email
        `, ['testuser', 'test@example.com', hashedPassword]);
        
        testUser = userResult.rows[0];
        
        // Create auth token
        authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-jwt-secret-for-github-actions', { expiresIn: '1h' });
        
        // Replace app's database with test database
        app.locals.db = db;
    });
    
    afterAll(async () => {
        if (db) {
            // Clean up test data
            await db.query('DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)', ['test%']);
            await db.query('DELETE FROM users WHERE username LIKE $1', ['test%']);
            await db.end();
        }
    });
        test('should handle complete rating submission flow', async () => {
            const songData = {
                song_title: 'Test Song',
                song_artist: 'Test Artist',
                rating: 1
            };

            // Step 1: Submit rating (should create song and rating)
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send(songData)
                .expect(200);

            expect(response.body.message).toBe('Rating submitted successfully');
            expect(response.body.rating).toMatchObject({
                rating: 1,
                user_id: testUser.id
            });

            // Step 2: Verify song was created in database
            const song = db.prepare('SELECT * FROM songs WHERE title = ? AND artist = ?')
                .get(songData.song_title, songData.song_artist);
            
            expect(song).toBeTruthy();
            expect(song.title).toBe(songData.song_title);
            expect(song.artist).toBe(songData.song_artist);

            // Step 3: Verify rating was stored
            const rating = db.prepare('SELECT * FROM ratings WHERE user_id = ? AND song_id = ?')
                .get(testUser.id, song.id);
            
            expect(rating).toBeTruthy();
            expect(rating.rating).toBe(1);

            // Step 4: Fetch rating data via API
            const fetchResponse = await request(app)
                .get(`/api/ratings/${encodeURIComponent(songData.song_title)}/${encodeURIComponent(songData.song_artist)}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(fetchResponse.body).toMatchObject({
                thumbs_up: 1,
                thumbs_down: 0,
                user_rating: 1
            });
        });

        test('should handle rating updates', async () => {
            const songData = {
                song_title: 'Update Test Song',
                song_artist: 'Update Test Artist',
                rating: 1
            };

            // Submit initial thumbs up
            await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send(songData)
                .expect(200);

            // Change to thumbs down
            const updateResponse = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ ...songData, rating: -1 })
                .expect(200);

            expect(updateResponse.body.message).toBe('Rating updated successfully');

            // Verify updated rating
            const fetchResponse = await request(app)
                .get(`/api/ratings/${encodeURIComponent(songData.song_title)}/${encodeURIComponent(songData.song_artist)}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(fetchResponse.body).toMatchObject({
                thumbs_up: 0,
                thumbs_down: 1,
                user_rating: -1
            });
        });

        test('should handle multiple users rating same song', async () => {
            // Create second user
            const hashedPassword = await bcrypt.hash('password123', 10);
            const userStmt = db.prepare(`
                INSERT INTO users (username, email, password_hash, is_verified)
                VALUES (?, ?, ?, 1)
            `);
            
            const userResult = userStmt.run('user2', 'user2@example.com', hashedPassword);
            const user2 = {
                id: userResult.lastInsertRowid,
                username: 'user2',
                email: 'user2@example.com'
            };
            
            const authToken2 = jwt.sign(user2, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

            const songData = {
                song_title: 'Multi User Song',
                song_artist: 'Multi User Artist'
            };

            // User 1 gives thumbs up
            await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ ...songData, rating: 1 })
                .expect(200);

            // User 2 gives thumbs down
            await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken2}`)
                .send({ ...songData, rating: -1 })
                .expect(200);

            // Check totals (no auth needed for public view)
            const publicResponse = await request(app)
                .get(`/api/ratings/${encodeURIComponent(songData.song_title)}/${encodeURIComponent(songData.song_artist)}`)
                .expect(200);

            expect(publicResponse.body).toMatchObject({
                thumbs_up: 1,
                thumbs_down: 1
                // No user_rating in public view
            });

            // Check user 1's view
            const user1Response = await request(app)
                .get(`/api/ratings/${encodeURIComponent(songData.song_title)}/${encodeURIComponent(songData.song_artist)}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(user1Response.body).toMatchObject({
                thumbs_up: 1,
                thumbs_down: 1,
                user_rating: 1
            });
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle unauthorized rating submission', async () => {
            const songData = {
                song_title: 'Unauthorized Song',
                song_artist: 'Unauthorized Artist',
                rating: 1
            };

            const response = await request(app)
                .post('/api/ratings')
                .send(songData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. Please login.');

            // Verify no song or rating was created
            const song = db.prepare('SELECT * FROM songs WHERE title = ?')
                .get(songData.song_title);
            expect(song).toBeFalsy();
        });

        test('should handle invalid rating values', async () => {
            const invalidRatings = [0, 2, -2, 'invalid', null];

            for (const invalidRating of invalidRatings) {
                const response = await request(app)
                    .post('/api/ratings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        song_title: 'Invalid Rating Song',
                        song_artist: 'Invalid Rating Artist',
                        rating: invalidRating
                    })
                    .expect(400);

                expect(response.body.error).toContain('Rating must be 1 (thumbs up) or -1 (thumbs down)');
            }
        });

        test('should handle missing song information', async () => {
            const testCases = [
                { song_artist: 'Artist Only', rating: 1 },
                { song_title: 'Title Only', rating: 1 },
                { rating: 1 },
                {}
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/ratings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(testCase)
                    .expect(400);

                expect(response.body.error).toContain('Song title and artist are required');
            }
        });

        test('should handle invalid JWT tokens', async () => {
            const songData = {
                song_title: 'Invalid Token Song',
                song_artist: 'Invalid Token Artist',
                rating: 1
            };

            // Test with invalid token
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', 'Bearer invalid-token')
                .send(songData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. Please login.');
        });
    });

    describe('Database Consistency', () => {
        test('should maintain referential integrity', async () => {
            const songData = {
                song_title: 'Integrity Test Song',
                song_artist: 'Integrity Test Artist',
                rating: 1
            };

            // Submit rating
            await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send(songData)
                .expect(200);

            // Verify foreign key relationships
            const result = db.prepare(`
                SELECT r.rating, r.user_id, r.song_id, s.title, s.artist, u.username
                FROM ratings r
                JOIN songs s ON r.song_id = s.id
                JOIN users u ON r.user_id = u.id
                WHERE s.title = ? AND s.artist = ?
            `).get(songData.song_title, songData.song_artist);

            expect(result).toBeTruthy();
            expect(result.rating).toBe(1);
            expect(result.user_id).toBe(testUser.id);
            expect(result.title).toBe(songData.song_title);
            expect(result.artist).toBe(songData.song_artist);
            expect(result.username).toBe(testUser.username);
        });

        test('should handle concurrent rating submissions', async () => {
            const songData = {
                song_title: 'Concurrent Test Song',
                song_artist: 'Concurrent Test Artist',
                rating: 1
            };

            // Simulate concurrent requests
            const promises = Array(5).fill().map(() =>
                request(app)
                    .post('/api/ratings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(songData)
            );

            const responses = await Promise.all(promises);

            // First request should succeed, others should update
            expect(responses[0].status).toBe(200);
            
            // Verify only one rating exists for this user/song
            const ratings = db.prepare(`
                SELECT COUNT(*) as count FROM ratings 
                WHERE user_id = ? AND song_id = (
                    SELECT id FROM songs WHERE title = ? AND artist = ?
                )
            `).get(testUser.id, songData.song_title, songData.song_artist);

            expect(ratings.count).toBe(1);
        });
    });

    describe('Performance Integration', () => {
        test('should handle bulk rating operations efficiently', async () => {
            const songs = Array(10).fill().map((_, i) => ({
                song_title: `Performance Song ${i}`,
                song_artist: `Performance Artist ${i}`,
                rating: i % 2 === 0 ? 1 : -1
            }));

            const startTime = Date.now();

            // Submit all ratings
            for (const song of songs) {
                await request(app)
                    .post('/api/ratings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(song)
                    .expect(200);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (adjust as needed)
            expect(duration).toBeLessThan(5000); // 5 seconds

            // Verify all ratings were stored
            const ratingCount = db.prepare('SELECT COUNT(*) as count FROM ratings').get();
            expect(ratingCount.count).toBe(10);

            const songCount = db.prepare('SELECT COUNT(*) as count FROM songs').get();
            expect(songCount.count).toBe(10);
        });
    });
});

// Helper function to create test data
function createTestSong(title, artist) {
    return db.prepare('INSERT INTO songs (title, artist) VALUES (?, ?)')
        .run(title, artist);
}

function createTestRating(userId, songId, rating) {
    return db.prepare('INSERT INTO ratings (user_id, song_id, rating) VALUES (?, ?, ?)')
        .run(userId, songId, rating);
}

module.exports = {
    createTestSong,
    createTestRating
};
