const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true in production with HTTPS
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize PostgreSQL database
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radiocalico',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

// Test database connection and create tables
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.message);
    } else {
        console.log('Connected to PostgreSQL database');
        release();

        // Create tables if they don't exist
        initializeTables();
    }
});

async function initializeTables() {
    try {
        // Users table
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )`);

        // Songs table
        await pool.query(`CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      artist VARCHAR(255) NOT NULL,
      album VARCHAR(255),
      duration INTEGER,
      file_path VARCHAR(500),
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

        // Playlists table
        await pool.query(`CREATE TABLE IF NOT EXISTS playlists (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

        // Playlist songs junction table
        await pool.query(`CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER REFERENCES playlists(id),
      song_id INTEGER REFERENCES songs(id),
      position INTEGER,
      PRIMARY KEY (playlist_id, song_id)
    )`);

        // Ratings table for thumbs up/down system
        await pool.query(`CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      song_title VARCHAR(255) NOT NULL,
      song_artist VARCHAR(255) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
      stream_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, song_title, song_artist)
    )`);

        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('Error initializing tables:', error);
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Optional authentication middleware (allows both authenticated and non-authenticated access)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};

// Auth Routes

// Register a new user
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [username, email, passwordHash, firstName || null, lastName || null]
        );

        const userId = result.rows[0].id;

        // Generate JWT token
        const token = jwt.sign(
            { userId: userId, username: username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'User registered successfully',
            user: {
                id: userId,
                username: username,
                email: email,
                firstName: firstName,
                lastName: lastName
            },
            token: token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Find user by username or email
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = result.rows[0];

        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            },
            token: token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error during login' });
    }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, first_name, last_name, created_at, last_login FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user profile' });
    }
});

// Get all users (admin function)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, first_name, last_name, created_at, last_login FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// API Routes

// Get all songs (with optional user filtering)
app.get('/api/songs', optionalAuth, async (req, res) => {
    try {
        let query = 'SELECT * FROM songs';
        let params = [];

        // If user is authenticated, show all songs but mark which are theirs
        if (req.user) {
            query = `SELECT *, CASE WHEN user_id = $1 THEN 1 ELSE 0 END as is_mine FROM songs ORDER BY created_at DESC`;
            params = [req.user.userId];
        } else {
            query = 'SELECT * FROM songs WHERE user_id IS NULL ORDER BY created_at DESC';
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching songs' });
    }
});

// Get user's songs only
app.get('/api/songs/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM songs WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user songs' });
    }
});

// Add a new song
app.post('/api/songs', optionalAuth, async (req, res) => {
    const { title, artist, album, duration, file_path } = req.body;

    if (!title || !artist) {
        res.status(400).json({ error: 'Title and artist are required' });
        return;
    }

    const userId = req.user ? req.user.userId : null;

    try {
        const result = await pool.query(
            'INSERT INTO songs (title, artist, album, duration, file_path, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [title, artist, album, duration, file_path, userId]
        );
        res.json({ id: result.rows[0].id, message: 'Song added successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error adding song' });
    }
});

// Get all playlists (with optional user filtering)
app.get('/api/playlists', optionalAuth, async (req, res) => {
    try {
        let query = 'SELECT * FROM playlists';
        let params = [];

        // If user is authenticated, show all playlists but mark which are theirs
        if (req.user) {
            query = `SELECT *, CASE WHEN user_id = $1 THEN 1 ELSE 0 END as is_mine FROM playlists ORDER BY created_at DESC`;
            params = [req.user.userId];
        } else {
            query = 'SELECT * FROM playlists WHERE user_id IS NULL ORDER BY created_at DESC';
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching playlists' });
    }
});

// Get user's playlists only
app.get('/api/playlists/my', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user playlists' });
    }
});

// Create a new playlist
app.post('/api/playlists', optionalAuth, async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Playlist name is required' });
        return;
    }

    const userId = req.user ? req.user.userId : null;

    try {
        const result = await pool.query(
            'INSERT INTO playlists (name, description, user_id) VALUES ($1, $2, $3) RETURNING id',
            [name, description, userId]
        );
        res.json({ id: result.rows[0].id, message: 'Playlist created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating playlist' });
    }
});

// Rating endpoints

// Submit a rating (thumbs up = 1, thumbs down = -1)
app.post('/api/ratings', authenticateToken, async (req, res) => {
    const { song_title, song_artist, rating } = req.body;
    const user_id = req.user.userId;

    console.log('Rating submission request:', { user_id, song_title, song_artist, rating });

    if (!song_title || !song_artist || rating === undefined || rating === null) {
        return res.status(400).json({ error: 'song_title, song_artist, and rating are required' });
    }

    if (rating !== 1 && rating !== -1) {
        return res.status(400).json({ error: 'rating must be 1 (thumbs up) or -1 (thumbs down)' });
    }

    try {
        // Use ON CONFLICT to handle updating existing ratings
        await pool.query(
            `INSERT INTO ratings (user_id, song_title, song_artist, rating, stream_timestamp) 
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, song_title, song_artist) 
       DO UPDATE SET rating = EXCLUDED.rating, stream_timestamp = CURRENT_TIMESTAMP`,
            [user_id, song_title, song_artist, rating]
        );

        res.json({
            message: 'Rating submitted successfully',
            rating: rating === 1 ? 'thumbs_up' : 'thumbs_down'
        });
    } catch (error) {
        console.error('Database error submitting rating:', error);
        res.status(500).json({ error: 'Database error: ' + error.message });
    }
});

// Get ratings for a specific song
app.get('/api/ratings/:title/:artist', optionalAuth, async (req, res) => {
    const { title, artist } = req.params;
    const user_id = req.user?.userId;

    try {
        const result = await pool.query(
            `SELECT 
        COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
        COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down,
        COUNT(*) as total_ratings
       FROM ratings 
       WHERE song_title = $1 AND song_artist = $2`,
            [decodeURIComponent(title), decodeURIComponent(artist)]
        );

        const stats = result.rows[0] || { thumbs_up: 0, thumbs_down: 0, total_ratings: 0 };

        // If user is authenticated, get their rating for this song
        if (user_id) {
            const userRatingResult = await pool.query(
                `SELECT rating FROM ratings WHERE user_id = $1 AND song_title = $2 AND song_artist = $3`,
                [user_id, decodeURIComponent(title), decodeURIComponent(artist)]
            );

            res.json({
                ...stats,
                user_rating: userRatingResult.rows[0]?.rating || null
            });
        } else {
            res.json(stats);
        }
    } catch (error) {
        console.error('Error getting ratings:', error);
        res.status(500).json({ error: 'Error fetching ratings' });
    }
});

// Get user's rating history
app.get('/api/ratings/my', authenticateToken, async (req, res) => {
    const user_id = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT song_title, song_artist, rating, stream_timestamp, created_at 
       FROM ratings 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error getting user ratings:', error);
        res.status(500).json({ error: 'Error fetching user ratings' });
    }
});

// Delete a rating
app.delete('/api/ratings', authenticateToken, async (req, res) => {
    const { song_title, song_artist } = req.body;
    const user_id = req.user.userId;

    if (!song_title || !song_artist) {
        return res.status(400).json({ error: 'song_title and song_artist are required' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM ratings WHERE user_id = $1 AND song_title = $2 AND song_artist = $3',
            [user_id, song_title, song_artist]
        );

        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Rating not found' });
        } else {
            res.json({ message: 'Rating deleted successfully' });
        }
    } catch (error) {
        console.error('Error deleting rating:', error);
        res.status(500).json({ error: 'Error deleting rating' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🎵 Radio Calico server running on port ${PORT}`);
});
