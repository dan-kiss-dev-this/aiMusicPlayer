#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connected to SQLite database:', dbPath);
    }
});

// Function to run queries
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Main function to explore database
async function exploreDatabase() {
    try {
        console.log('\n📊 Database Tables:');
        const tables = await query(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        for (const table of tables) {
            console.log(`\n🔍 Table: ${table.name}`);
            
            // Get table schema
            const schema = await query(`PRAGMA table_info(${table.name})`);
            console.log('   Columns:', schema.map(col => `${col.name} (${col.type})`).join(', '));
            
            // Get row count
            const count = await query(`SELECT COUNT(*) as count FROM ${table.name}`);
            console.log(`   Rows: ${count[0].count}`);
            
            // Show sample data if any exists
            if (count[0].count > 0) {
                const sample = await query(`SELECT * FROM ${table.name} LIMIT 3`);
                console.log('   Sample data:', JSON.stringify(sample, null, 2));
            }
        }
        
        console.log('\n🎵 Recent Songs (if any):');
        try {
            const recentSongs = await query(`
                SELECT title, artist, created_at 
                FROM songs 
                ORDER BY created_at DESC 
                LIMIT 5
            `);
            console.log(recentSongs);
        } catch (e) {
            console.log('   No songs table found or no data');
        }
        
        console.log('\n👍 Recent Ratings (if any):');
        try {
            const recentRatings = await query(`
                SELECT r.rating, r.song_title, r.song_artist, r.created_at,
                       u.username
                FROM ratings r
                LEFT JOIN users u ON r.user_id = u.id
                ORDER BY r.created_at DESC 
                LIMIT 5
            `);
            console.log(recentRatings);
        } catch (e) {
            console.log('   No ratings found or no data');
        }
        
    } catch (error) {
        console.error('❌ Error exploring database:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('\n✅ Database connection closed.');
            }
        });
    }
}

// Run the exploration
exploreDatabase();
