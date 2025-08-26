const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create tables if they don't exist
    
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )`);
    
    // Create original tables without user_id first
    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      duration INTEGER,
      file_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER,
      song_id INTEGER,
      position INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists (id),
      FOREIGN KEY (song_id) REFERENCES songs (id),
      PRIMARY KEY (playlist_id, song_id)
    )`);
    
    // Ratings table for thumbs up/down system
    db.run(`CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      song_title TEXT NOT NULL,
      song_artist TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
      stream_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, song_title, song_artist)
    )`, (err) => {
      if (err) {
        console.error('Error creating ratings table:', err.message);
      } else {
        console.log('✅ Ratings table created/verified successfully');
      }
    });
    
    // Add user_id columns if they don't exist (migration)
    db.run(`PRAGMA table_info(songs)`, (err, rows) => {
      if (!err) {
        db.all(`PRAGMA table_info(songs)`, (err, columns) => {
          if (!err) {
            const hasUserId = columns.some(col => col.name === 'user_id');
            if (!hasUserId) {
              console.log('🔄 Adding user_id column to songs table...');
              db.run(`ALTER TABLE songs ADD COLUMN user_id INTEGER REFERENCES users(id)`);
            }
          }
        });
      }
    });
    
    db.run(`PRAGMA table_info(playlists)`, (err, rows) => {
      if (!err) {
        db.all(`PRAGMA table_info(playlists)`, (err, columns) => {
          if (!err) {
            const hasUserId = columns.some(col => col.name === 'user_id');
            if (!hasUserId) {
              console.log('🔄 Adding user_id column to playlists table...');
              db.run(`ALTER TABLE playlists ADD COLUMN user_id INTEGER REFERENCES users(id)`);
            }
          }
        });
      }
    });
  }
});

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

// User Authentication Routes

// Register new user
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
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (row) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert new user
      db.run(
        'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)',
        [username, email, passwordHash, firstName || null, lastName || null],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // Generate JWT token
          const token = jwt.sign(
            { userId: this.lastID, username: username },
            JWT_SECRET,
            { expiresIn: '24h' }
          );
          
          res.json({
            message: 'User registered successfully',
            user: {
              id: this.lastID,
              username: username,
              email: email,
              firstName: firstName,
              lastName: lastName
            },
            token: token
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Find user by username or email
  db.get(
    'SELECT * FROM users WHERE username = ? OR email = ?',
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
      
      try {
        // Check password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        
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
    }
  );
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, first_name, last_name, created_at, last_login FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        lastLogin: user.last_login
      });
    }
  );
});

// Get all users (admin function)
app.get('/api/users', (req, res) => {
  db.all(
    'SELECT id, username, email, first_name, last_name, created_at, last_login FROM users ORDER BY created_at DESC',
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// API Routes

// Get all songs (with optional user filtering)
app.get('/api/songs', optionalAuth, (req, res) => {
  let query = 'SELECT * FROM songs';
  let params = [];
  
  // If user is authenticated, show all songs but mark which are theirs
  if (req.user) {
    query = `SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END as is_mine FROM songs ORDER BY created_at DESC`;
    params = [req.user.userId];
  } else {
    query = 'SELECT * FROM songs WHERE user_id IS NULL ORDER BY created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get user's songs only
app.get('/api/songs/my', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM songs WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Add a new song
app.post('/api/songs', optionalAuth, (req, res) => {
  const { title, artist, album, duration, file_path } = req.body;
  
  if (!title || !artist) {
    res.status(400).json({ error: 'Title and artist are required' });
    return;
  }
  
  const userId = req.user ? req.user.userId : null;
  
  db.run(
    'INSERT INTO songs (title, artist, album, duration, file_path, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [title, artist, album, duration, file_path, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Song added successfully' });
    }
  );
});

// Get all playlists (with optional user filtering)
app.get('/api/playlists', optionalAuth, (req, res) => {
  let query = 'SELECT * FROM playlists';
  let params = [];
  
  // If user is authenticated, show all playlists but mark which are theirs
  if (req.user) {
    query = `SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END as is_mine FROM playlists ORDER BY created_at DESC`;
    params = [req.user.userId];
  } else {
    query = 'SELECT * FROM playlists WHERE user_id IS NULL ORDER BY created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get user's playlists only
app.get('/api/playlists/my', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Create a new playlist
app.post('/api/playlists', optionalAuth, (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Playlist name is required' });
    return;
  }
  
  const userId = req.user ? req.user.userId : null;
  
  db.run(
    'INSERT INTO playlists (name, description, user_id) VALUES (?, ?, ?)',
    [name, description, userId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, message: 'Playlist created successfully' });
    }
  );
});

// Rating endpoints

// Submit a rating (thumbs up = 1, thumbs down = -1)
app.post('/api/ratings', authenticateToken, (req, res) => {
  const { song_title, song_artist, rating } = req.body;
  const user_id = req.user.userId; // Fixed: use userId instead of id

  console.log('Rating submission request:', { user_id, song_title, song_artist, rating });
  console.log('Full req.user object:', req.user);

  if (!song_title || !song_artist || rating === undefined || rating === null) {
    console.log('Missing required fields:', { song_title, song_artist, rating });
    return res.status(400).json({ error: 'song_title, song_artist, and rating are required' });
  }

  if (rating !== 1 && rating !== -1) {
    console.log('Invalid rating value:', rating);
    return res.status(400).json({ error: 'rating must be 1 (thumbs up) or -1 (thumbs down)' });
  }

  // Use INSERT OR REPLACE to handle updating existing ratings
  console.log('Attempting to insert rating into database...');
  db.run(
    `INSERT OR REPLACE INTO ratings (user_id, song_title, song_artist, rating, stream_timestamp) 
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [user_id, song_title, song_artist, rating],
    function(err) {
      if (err) {
        console.error('Database error submitting rating:', err);
        console.error('Error details:', {
          message: err.message,
          errno: err.errno,
          code: err.code,
          parameters: [user_id, song_title, song_artist, rating]
        });
        res.status(500).json({ error: 'Database error: ' + err.message });
        return;
      }
      console.log('Rating submitted successfully:', this.lastID);
      res.json({ 
        message: 'Rating submitted successfully',
        rating: rating === 1 ? 'thumbs_up' : 'thumbs_down'
      });
    }
  );
});

// Get ratings for a specific song
app.get('/api/ratings/:title/:artist', optionalAuth, (req, res) => {
  const { title, artist } = req.params;
  const user_id = req.user?.id;

  db.all(
    `SELECT 
      COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
      COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down,
      COUNT(*) as total_ratings
     FROM ratings 
     WHERE song_title = ? AND song_artist = ?`,
    [decodeURIComponent(title), decodeURIComponent(artist)],
    (err, rows) => {
      if (err) {
        console.error('Error getting ratings:', err);
        res.status(500).json({ error: err.message });
        return;
      }

      const stats = rows[0] || { thumbs_up: 0, thumbs_down: 0, total_ratings: 0 };
      
      // If user is authenticated, get their rating for this song
      if (user_id) {
        db.get(
          `SELECT rating FROM ratings WHERE user_id = ? AND song_title = ? AND song_artist = ?`,
          [user_id, decodeURIComponent(title), decodeURIComponent(artist)],
          (err, userRating) => {
            if (err) {
              console.error('Error getting user rating:', err);
              res.status(500).json({ error: err.message });
              return;
            }
            
            res.json({
              ...stats,
              user_rating: userRating?.rating || null
            });
          }
        );
      } else {
        res.json(stats);
      }
    }
  );
});

// Get user's rating history
app.get('/api/ratings/my', authenticateToken, (req, res) => {
  const user_id = req.user.userId; // Fixed: use userId instead of id

  db.all(
    `SELECT song_title, song_artist, rating, stream_timestamp, created_at 
     FROM ratings 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [user_id],
    (err, rows) => {
      if (err) {
        console.error('Error getting user ratings:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

// Delete a rating
app.delete('/api/ratings', authenticateToken, (req, res) => {
  const { song_title, song_artist } = req.body;
  const user_id = req.user.userId; // Fixed: use userId instead of id

  if (!song_title || !song_artist) {
    return res.status(400).json({ error: 'song_title and song_artist are required' });
  }

  db.run(
    `DELETE FROM ratings WHERE user_id = ? AND song_title = ? AND song_artist = ?`,
    [user_id, song_title, song_artist],
    function(err) {
      if (err) {
        console.error('Error deleting rating:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      
      if (this.changes === 0) {
        res.status(404).json({ error: 'Rating not found' });
      } else {
        res.json({ message: 'Rating deleted successfully' });
      }
    }
  );
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

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 AI Music Player server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎶 API endpoints available at http://localhost:${PORT}/api/*`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
