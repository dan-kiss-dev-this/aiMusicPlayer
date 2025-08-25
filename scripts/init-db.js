const sqlite3 = require('sqlite3').verbose();

// Initialize database with sample data
const db = new sqlite3.Database('./database.db');

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

// Insert songs
db.serialize(() => {
    // Clear existing data
    db.run('DELETE FROM playlist_songs');
    db.run('DELETE FROM songs');
    db.run('DELETE FROM playlists');
    
    // Insert sample songs
    const songStmt = db.prepare('INSERT INTO songs (title, artist, album, duration) VALUES (?, ?, ?, ?)');
    sampleSongs.forEach(song => {
        songStmt.run(song.title, song.artist, song.album, song.duration);
    });
    songStmt.finalize();
    
    // Insert sample playlists
    const playlistStmt = db.prepare('INSERT INTO playlists (name, description) VALUES (?, ?)');
    samplePlaylists.forEach(playlist => {
        playlistStmt.run(playlist.name, playlist.description);
    });
    playlistStmt.finalize();
    
    console.log(`✅ Added ${sampleSongs.length} sample songs`);
    console.log(`✅ Added ${samplePlaylists.length} sample playlists`);
    console.log('🎵 Database initialization complete!');
    
    db.close();
});
