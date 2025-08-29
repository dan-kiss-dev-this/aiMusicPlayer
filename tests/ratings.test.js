// Backend Unit Tests for Ratings System
// File: tests/ratings.test.js

const request = require('supertest');
// Using PostgreSQL for testing to match production
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the app for testing
const app = require('../server'); // Import your Express app

describe('Ratings System Backend Tests', () => {
    let db;
    let testUser;
    let authToken;
    
    // Test database setup
    beforeEach(async () => {
        // Create PostgreSQL connection for testing
        db = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'test_password',
            database: process.env.DB_NAME || 'radiocalico_test'
        });
        
        // Clean and setup test data
        await cleanTestData(db);
        
        // Create test user
        testUser = await createTestUser(db);
        
        // Generate auth token
        authToken = jwt.sign(
            { userId: testUser.id, username: testUser.username },
            process.env.JWT_SECRET || 'test-secret'
        );
    });
    
    afterEach(async () => {
        // Clean up database
        if (db) {
            await cleanTestData(db);
            await db.end();
        }
    });

    describe('POST /api/ratings', () => {
        test('should create a new rating for authenticated user', async () => {
            const ratingData = {
                song_title: 'Test Song',
                song_artist: 'Test Artist', 
                rating: 1
            };

            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send(ratingData)
                .expect(201);

            expect(response.body).toMatchObject({
                message: 'Rating submitted successfully',
                rating: expect.objectContaining({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 1,
                    user_id: testUser.id
                })
            });
        });

        test('should update existing rating when user rates same song again', async () => {
            // First rating
            await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 1
                });

            // Second rating (should update)
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: -1
                })
                .expect(200);

            expect(response.body.rating.rating).toBe(-1);
        });

        test('should reject rating without authentication', async () => {
            const response = await request(app)
                .post('/api/ratings')
                .send({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 1
                })
                .expect(401);

            expect(response.body.error).toContain('authentication');
        });

        test('should validate rating value (-1 or 1 only)', async () => {
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 5 // Invalid rating
                })
                .expect(400);

            expect(response.body.error).toContain('rating must be -1 or 1');
        });

        test('should require song_title and song_artist', async () => {
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    rating: 1
                    // Missing song_title and song_artist
                })
                .expect(400);

            expect(response.body.error).toContain('required');
        });
    });

    describe('GET /api/ratings/:title/:artist', () => {
        beforeEach(async () => {
            // Create test ratings
            await createTestRatings(db, testUser.id);
        });

        test('should return rating counts for a song', async () => {
            const response = await request(app)
                .get('/api/ratings/Test%20Song/Test%20Artist')
                .expect(200);

            expect(response.body).toMatchObject({
                thumbs_up: expect.any(Number),
                thumbs_down: expect.any(Number),
                total_ratings: expect.any(Number)
            });
        });

        test('should return user rating when authenticated', async () => {
            const response = await request(app)
                .get('/api/ratings/Test%20Song/Test%20Artist')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('user_rating');
        });

        test('should handle URL encoding of song titles and artists', async () => {
            const response = await request(app)
                .get('/api/ratings/Song%20With%20Spaces/Artist%20%26%20Band')
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should return zero counts for non-existent song', async () => {
            const response = await request(app)
                .get('/api/ratings/Nonexistent%20Song/Unknown%20Artist')
                .expect(200);

            expect(response.body).toMatchObject({
                thumbs_up: 0,
                thumbs_down: 0,
                total_ratings: 0
            });
        });
    });

    describe('Database Operations', () => {
        test('should calculate rating aggregates correctly', async () => {
            // Create multiple ratings for same song
            const users = await createMultipleTestUsers(db, 5);
            
            // 3 thumbs up, 2 thumbs down
            await db.run(`INSERT INTO ratings (user_id, song_title, song_artist, rating) VALUES 
                (${users[0].id}, 'Popular Song', 'Famous Artist', 1),
                (${users[1].id}, 'Popular Song', 'Famous Artist', 1),
                (${users[2].id}, 'Popular Song', 'Famous Artist', 1),
                (${users[3].id}, 'Popular Song', 'Famous Artist', -1),
                (${users[4].id}, 'Popular Song', 'Famous Artist', -1)
            `);

            const response = await request(app)
                .get('/api/ratings/Popular%20Song/Famous%20Artist')
                .expect(200);

            expect(response.body).toMatchObject({
                thumbs_up: 3,
                thumbs_down: 2,
                total_ratings: 5
            });
        });

        test('should handle database errors gracefully', async () => {
            // Simulate database error by closing connection
            db.close();
            
            const response = await request(app)
                .post('/api/ratings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    song_title: 'Test Song',
                    song_artist: 'Test Artist',
                    rating: 1
                })
                .expect(500);

            expect(response.body.error).toContain('database');
        });
    });
});

// Helper functions
async function cleanTestData(db) {
    // Clean test data but keep schema (tables already exist from init-db.sql)
    await db.query('DELETE FROM ratings WHERE user_id IN (SELECT id FROM users WHERE username LIKE $1)', ['test%']);
    await db.query('DELETE FROM users WHERE username LIKE $1', ['test%']);
}

async function createTestUser(db) {
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    const result = await db.query(`
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, username, email
    `, ['testuser', 'test@example.com', passwordHash]);
    
    return result.rows[0];
}

async function createTestRatings(db, userId) {
    await db.query(`
        INSERT INTO ratings (user_id, song_title, song_artist, rating)
        VALUES ($1, $2, $3, $4)
    `, [userId, 'Test Song', 'Test Artist', 1]);
}

async function createMultipleTestUsers(db, count) {
    const users = [];
    for (let i = 0; i < count; i++) {
        const passwordHash = await bcrypt.hash(`testpassword${i}`, 10);
        const result = await db.query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email
        `, [`testuser${i}`, `test${i}@example.com`, passwordHash]);
        
        users.push(result.rows[0]);
    }
    return users;
}

module.exports = {
    createTestUser,
    createTestRatings,
    createMultipleTestUsers
};

async function createTestRatings(db, userId) {
    await db.query(`
        INSERT INTO ratings (user_id, song_title, song_artist, rating)
        VALUES ($1, $2, $3, $4)
    `, [userId, 'Test Song', 'Test Artist', 1]);
}

async function createMultipleTestUsers(db, count) {
    const users = [];
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    for (let i = 0; i < count; i++) {
        const user = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [`testuser${i}`, `test${i}@example.com`, passwordHash],
                function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, username: `testuser${i}` });
                }
            );
        });
        users.push(user);
    }
    
    return users;
}

module.exports = {
    createTestTables,
    createTestUser,
    createTestRatings
};
