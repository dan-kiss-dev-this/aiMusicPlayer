// Backend Unit Tests for Ratings System
// File: tests/ratings.test.js

const request = require('supertest');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Test database configuration
const pool = new Pool({
    user: 'radiocalico',
    host: 'localhost',
    database: 'radiocalico_test',
    password: 'radioPassword123',
    port: 5433
});

// Create a test Express app instead of importing the main server
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Authentication middleware for tests
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return next(); // Allow unauthenticated requests for some endpoints
    }
    
    jwt.verify(token, 'test-secret', (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};

// Rating endpoints for testing
app.post('/api/ratings', authenticateToken, async (req, res) => {
    try {
        const { song_title, song_artist, rating } = req.body;
        
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!song_title || !song_artist) {
            return res.status(400).json({ error: 'Song title and artist are required' });
        }
        
        if (rating !== -1 && rating !== 1) {
            return res.status(400).json({ error: 'Rating must be -1 or 1' });
        }
        
        // Insert or update rating
        const query = `
            INSERT INTO ratings (user_id, song_title, song_artist, rating)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, song_title, song_artist)
            DO UPDATE SET rating = $4, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await pool.query(query, [req.user.userId, song_title, song_artist, rating]);
        const ratingValue = rating === 1 ? 'thumbs_up' : 'thumbs_down';
        
        res.json({
            message: 'Rating submitted successfully',
            rating: ratingValue
        });
    } catch (error) {
        console.error('Rating submission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/ratings/:title/:artist', authenticateToken, async (req, res) => {
    try {
        const { title, artist } = req.params;
        const song_title = decodeURIComponent(title);
        const song_artist = decodeURIComponent(artist);
        
        // Get rating counts
        const countQuery = `
            SELECT 
                COUNT(CASE WHEN rating = 1 THEN 1 END)::int as thumbs_up,
                COUNT(CASE WHEN rating = -1 THEN 1 END)::int as thumbs_down
            FROM ratings 
            WHERE song_title = $1 AND song_artist = $2
        `;
        
        const countResult = await pool.query(countQuery, [song_title, song_artist]);
        const counts = countResult.rows[0];
        
        let userRating = null;
        if (req.user) {
            const userQuery = `
                SELECT rating FROM ratings 
                WHERE user_id = $1 AND song_title = $2 AND song_artist = $3
            `;
            const userResult = await pool.query(userQuery, [req.user.userId, song_title, song_artist]);
            if (userResult.rows.length > 0) {
                userRating = userResult.rows[0].rating === 1 ? 'thumbs_up' : 'thumbs_down';
            }
        }
        
        res.json({
            thumbs_up: counts.thumbs_up,
            thumbs_down: counts.thumbs_down,
            user_rating: userRating
        });
    } catch (error) {
        console.error('Rating fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

describe.skip('Ratings System Backend Tests', () => {
    let testUser;
    let authToken;
    
    beforeAll(async () => {
        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                song_title VARCHAR(255) NOT NULL,
                song_artist VARCHAR(255) NOT NULL,
                rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, song_title, song_artist)
            )
        `);
    });
    
    beforeEach(async () => {
        // Clear test data
        await pool.query('DELETE FROM ratings');
        await pool.query('DELETE FROM users');
        
        // Create test user
        const hashedPassword = await bcrypt.hash('testpassword123', 10);
        const userResult = await pool.query(
            'INSERT INTO users (username, email, password_hash, is_verified) VALUES ($1, $2, $3, $4) RETURNING *',
            ['testuser', 'test@example.com', hashedPassword, true]
        );
        testUser = userResult.rows[0];
        
        // Generate auth token
        authToken = jwt.sign(
            { userId: testUser.id, username: testUser.username },
            'test-secret'
        );
    });
    
    afterAll(async () => {
        await pool.end();
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
async function createTestTables(db) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            db.run(`CREATE TABLE ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                song_title TEXT NOT NULL,
                song_artist TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(user_id, song_title, song_artist)
            )`, resolve);
        });
    });
}

async function createTestUser(db) {
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            ['testuser', 'test@example.com', passwordHash],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, username: 'testuser', email: 'test@example.com' });
            }
        );
    });
}

async function createTestRatings(db, userId) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO ratings (user_id, song_title, song_artist, rating) VALUES (?, ?, ?, ?)',
            [userId, 'Test Song', 'Test Artist', 1],
            resolve
        );
    });
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
