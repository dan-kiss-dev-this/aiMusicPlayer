-- Radio Calico Database Initialization Script
-- This script sets up the initial database schema for PostgreSQL

-- Enable UUID extension if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    album VARCHAR(255),
    duration INTEGER,
    file_path VARCHAR(500),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Playlist songs junction table
CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER,
    PRIMARY KEY (playlist_id, song_id)
);

-- Ratings table for thumbs up/down system
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    song_title VARCHAR(255) NOT NULL,
    song_artist VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    stream_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_title, song_artist)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_song ON ratings(song_title, song_artist);

-- Insert some sample data (optional)
-- Uncomment the lines below if you want sample data

/*
-- Sample users (passwords are 'password123' hashed with bcrypt)
INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES
('admin', 'admin@radiocalico.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Radio', 'Admin'),
('demo_user', 'demo@radiocalico.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo', 'User')
ON CONFLICT (username) DO NOTHING;

-- Sample songs
INSERT INTO songs (title, artist, album, duration, file_path) VALUES
('Welcome to Radio Calico', 'Radio Calico', 'Demo Album', 180, '/music/welcome.mp3'),
('Sample Track 1', 'Sample Artist', 'Sample Album', 240, '/music/sample1.mp3'),
('Sample Track 2', 'Another Artist', 'Another Album', 200, '/music/sample2.mp3')
ON CONFLICT DO NOTHING;

-- Sample playlist
INSERT INTO playlists (name, description, user_id) VALUES
('Welcome Playlist', 'A playlist to get you started with Radio Calico', 1)
ON CONFLICT DO NOTHING;
*/

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Radio Calico database schema initialized successfully!';
END $$;
