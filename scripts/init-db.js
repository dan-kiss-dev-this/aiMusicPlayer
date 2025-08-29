const { Pool } = require('pg');

// Initialize database with sample data
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'radiocalico'
});

console.log('🗄️  Initializing database with sample data...');

// Insert sample songs
const sampleSongs = [
    {
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        album: 'A Night at the Opera',
        duration: 354
    },
    {
        title: 'Hotel California',
        artist: 'Eagles',
        album: 'Hotel California',
        duration: 391
    },
    {
        title: 'Imagine',
        artist: 'John Lennon',
        album: 'Imagine',
        duration: 183
    },
    {
        title: 'Billie Jean',
        artist: 'Michael Jackson',
        album: 'Thriller',
        duration: 294
    },
    {
        title: 'Sweet Child O\' Mine',
        artist: 'Guns N\' Roses',
        album: 'Appetite for Destruction',
        duration: 356
    }
];

// Insert sample playlists
const samplePlaylists = [
    {
        name: 'Classic Rock Hits',
        description: 'The best classic rock songs of all time'
    },
    {
        name: 'Road Trip Mix',
        description: 'Perfect songs for a long drive'
    },
    {
        name: 'Chill Vibes',
        description: 'Relaxing music for any time of day'
    }
];

// Main initialization function
async function initializeDatabase() {
    try {
        // Clear existing data (reverse order due to foreign keys)
        await db.query('DELETE FROM playlist_songs');
        await db.query('DELETE FROM songs');
        await db.query('DELETE FROM playlists');

        // Insert sample songs
        for (const song of sampleSongs) {
            await db.query(
                'INSERT INTO songs (title, artist, album, duration) VALUES ($1, $2, $3, $4)',
                [song.title, song.artist, song.album, song.duration]
            );
        }

        // Insert sample playlists
        for (const playlist of samplePlaylists) {
            await db.query(
                'INSERT INTO playlists (name, description) VALUES ($1, $2)',
                [playlist.name, playlist.description]
            );
        }

        console.log(`✅ Added ${sampleSongs.length} sample songs`);
        console.log(`✅ Added ${samplePlaylists.length} sample playlists`);
        console.log('🎵 Database initialization complete!');

    } catch (error) {
        console.error('❌ Error initializing database:', error);
    } finally {
        await db.end();
    }
}

// Run the initialization
initializeDatabase();
