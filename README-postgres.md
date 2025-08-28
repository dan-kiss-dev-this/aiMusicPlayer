# Radio Calico Music Player - PostgreSQL + nginx Setup

A modern music streaming application with PostgreSQL database backend and nginx reverse proxy.

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript served by nginx
- **Backend**: Node.js/Express API server with PostgreSQL database
- **Proxy**: nginx reverse proxy for production deployment
- **Database**: PostgreSQL for robust data persistence

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

## Quick Start

### Development Environment

1. **Clone and setup**:
```bash
git clone <repository-url>
cd aiMusicPlayer
npm install
```

2. **Start development environment**:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

This will start:
- PostgreSQL database on port 5432
- Node.js app with hot reload on port 3000

3. **Access the application**:
- Application: http://localhost:3000
- Database: localhost:5432 (postgres/dev_password)

### Production Environment

1. **Build and start production environment**:
```bash
docker-compose up -d
```

This will start:
- nginx reverse proxy on ports 80/443
- Node.js application (internal)
- PostgreSQL database (internal)

2. **Access the application**:
- Application: http://localhost
- HTTPS: https://localhost (if SSL is configured)

## Environment Variables

### Development
- `DB_HOST=postgres-dev`
- `DB_USER=postgres` 
- `DB_PASSWORD=dev_password`
- `DB_NAME=radiocalico_dev`
- `JWT_SECRET=dev-jwt-secret-key`

### Production
- `DB_HOST=postgres`
- `DB_USER=postgres`
- `DB_PASSWORD=radiocalico_password`
- `DB_NAME=radiocalico`
- `JWT_SECRET=your-super-secret-jwt-key-change-in-production`

## Database Schema

The application uses the following PostgreSQL tables:

- **users**: User accounts and authentication
- **songs**: Music library with metadata
- **playlists**: User-created playlists
- **playlist_songs**: Junction table for playlist contents
- **ratings**: Thumbs up/down ratings for songs

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Songs
- `GET /api/songs` - List all songs
- `GET /api/songs/my` - Get user's songs
- `POST /api/songs` - Add new song

### Playlists
- `GET /api/playlists` - List all playlists
- `GET /api/playlists/my` - Get user's playlists
- `POST /api/playlists` - Create new playlist

### Ratings
- `POST /api/ratings` - Submit song rating
- `GET /api/ratings/:title/:artist` - Get song ratings
- `GET /api/ratings/my` - Get user's rating history
- `DELETE /api/ratings` - Delete rating

## nginx Configuration

The nginx configuration includes:

- **Reverse proxy** to Node.js backend
- **Static file serving** for frontend assets
- **SSL/TLS support** (production)
- **Gzip compression**
- **Rate limiting**
- **Security headers**

## Health Checks

Both the application and database include health checks:

- **App**: `GET /health` endpoint
- **Database**: PostgreSQL connection check
- **Docker**: Built-in container health monitoring

## Migration from SQLite

If migrating from the SQLite version:

1. **Backup your SQLite data**:
```bash
cp database.db database-backup.db
```

2. **Export SQLite data** (if needed):
```bash
sqlite3 database.db .dump > sqlite-export.sql
```

3. **Start PostgreSQL environment**:
```bash
docker-compose -f docker-compose.dev.yml up -d postgres-dev
```

4. **Import data manually** or use the application to recreate data

## Development

### Local Development (without Docker)

1. **Install PostgreSQL locally**
2. **Create database**:
```sql
CREATE DATABASE radiocalico_dev;
```

3. **Set environment variables**:
```bash
export DB_HOST=localhost
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=radiocalico_dev
```

4. **Run the application**:
```bash
npm run dev
```

### Database Management

**Connect to PostgreSQL**:
```bash
# Development
docker exec -it radiocalico-postgres-dev psql -U postgres -d radiocalico_dev

# Production  
docker exec -it radiocalico-postgres psql -U postgres -d radiocalico
```

**View logs**:
```bash
# Application logs
docker logs radiocalico-app

# Database logs
docker logs radiocalico-postgres

# nginx logs
docker logs radiocalico-nginx
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 443, 3000, 5432 are available
2. **Database connection**: Check PostgreSQL container is running
3. **Permission errors**: Ensure Docker has proper permissions
4. **nginx 502 errors**: Check application container is healthy

### Reset Database

```bash
# Stop containers
docker-compose down

# Remove database volume
docker volume rm aiMusicPlayer_postgres_data

# Restart
docker-compose up -d
```

## Security Notes

- Change default JWT secrets in production
- Use strong PostgreSQL passwords
- Configure SSL certificates for nginx
- Keep dependencies updated
- Review nginx security headers

## License

MIT License
