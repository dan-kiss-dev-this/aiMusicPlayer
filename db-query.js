#!/usr/bin/env node

const { Pool } = require('pg');

// Connect to the database
const db = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'radiocalico'
});

console.log('✅ Connected to PostgreSQL database');

// Function to run queries
async function query(sql, params = []) {
    try {
        const result = await db.query(sql, params);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

// Main function to explore database
async function exploreDatabase() {
    try {
        console.log('\n📊 Database Tables:');
        const tables = await query(`
            SELECT table_name as name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        for (const table of tables) {
            console.log(`\n🔍 Table: ${table.name}`);
            
            // Get table schema
            const schema = await query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position
            `, [table.name]);
            
            console.log('   Columns:', schema.map(col => 
                `${col.column_name} (${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''})`
            ).join(', '));
            
            // Get row count
            const count = await query(`SELECT COUNT(*) as count FROM ${table.name}`);
            console.log(`   Rows: ${count[0].count}`);
            
            // Show sample data if any exists
            if (parseInt(count[0].count) > 0) {
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
        await db.end();
        console.log('\n✅ Database connection closed.');
    }
}

// Run the exploration
exploreDatabase();
