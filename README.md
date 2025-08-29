# AI Music Player

A local development environment for prototyping an AI Music Player web application. See below. here

## Tech Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite (perfect for local development)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Development**: Nodemon for auto-restart

## Features

- RESTful API for songs and playlists
- SQLite database with automatic table creation
- Modern responsive web interface
- Modal forms for adding songs and creating playlists
- Real-time server status monitoring
- Sample data initialization

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database with Sample Data (Optional)
```bash
npm run init-db
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open Your Browser
Navigate to: http://localhost:3000

## API Endpoints

### Songs
- `GET /api/songs` - Get all songs
- `POST /api/songs` - Add a new song

### Playlists
- `GET /api/playlists` - Get all playlists
- `POST /api/playlists` - Create a new playlist

### Health Check
- `GET /health` - Server health status

## Database Schema

### Songs Table
- `id` - Primary key (auto-increment)
- `title` - Song title (required)
- `artist` - Artist name (required)
- `album` - Album name (optional)
- `duration` - Duration in seconds (optional)
- `file_path` - Path to audio file (optional)
- `created_at` - Timestamp

### Playlists Table
- `id` - Primary key (auto-increment)
- `name` - Playlist name (required)
- `description` - Playlist description (optional)
- `created_at` - Timestamp

### Playlist Songs Table
- `playlist_id` - Foreign key to playlists
- `song_id` - Foreign key to songs
- `position` - Song position in playlist

## Development Commands

```bash
# Start server (production)
npm start

# Start server with auto-restart (development)
npm run dev

# Initialize database with sample data
npm run init-db
```

## Project Structure

```
aiMusicPlayer/
├── public/
│   ├── index.html      # Main web interface
│   ├── styles.css      # Styling
│   └── script.js       # Frontend JavaScript
├── scripts/
│   └── init-db.js      # Database initialization
├── server.js           # Express server
├── package.json        # Dependencies and scripts
├── database.db         # SQLite database (created automatically)
└── README.md          # This file
```

## Next Steps

This setup provides a solid foundation for prototyping your AI Music Player. You can:

1. **Add AI Features**: Integrate AI APIs for music recommendation, analysis, etc.
2. **Audio Support**: Add actual audio file upload and playback
3. **User Authentication**: Implement user accounts and sessions
4. **Enhanced UI**: Add more interactive features and better styling
5. **Real Database**: Migrate to PostgreSQL or MySQL for production
6. **Deployment**: Deploy to Heroku, Vercel, or other cloud platforms

## Troubleshooting

### Port Already in Use
If port 3000 is busy, set a custom port:
```bash
PORT=3001 npm run dev
```

### Database Issues
Delete `database.db` and restart the server to recreate tables:
```bash
rm database.db
npm run dev
```

### Dependencies
Make sure you have Node.js installed (version 14 or higher recommended):
```bash
node --version
npm --version
```
