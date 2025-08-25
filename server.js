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
    
    // Update songs table to include user_id
    db.run(`CREATE TABLE IF NOT EXISTS songs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      duration INTEGER,
      file_path TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    // Update playlists table to include user_id
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id INTEGER,
      song_id INTEGER,
      position INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists (id),
      FOREIGN KEY (song_id) REFERENCES songs (id),
      PRIMARY KEY (playlist_id, song_id)
    )`);
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
