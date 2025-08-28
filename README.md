# Radio Calico Music Streaming Platform 🎵

A modern, production-ready music streaming application with comprehensive authentication, PostgreSQL database, nginx reverse proxy, Winston logging, and security features.

![Radio Calico](RadioCalicoLogoTM.png)

## 🚀 Features

- **🎵 Music Streaming**: Complete music library management and streaming
- **👤 User Authentication**: JWT-based authentication with bcrypt password hashing
- **⭐ Rating System**: Thumbs up/down rating system for songs
- **📊 Playlist Management**: Create and manage personal playlists
- **🔒 Security**: Comprehensive security scanning and vulnerability management
- **📝 Logging**: Structured logging with Winston and daily log rotation
- **🐳 Containerized**: Full Docker setup for development and production
- **🌐 Production Ready**: nginx reverse proxy with SSL support
- **🧪 Comprehensive Testing**: Unit, integration, and security tests
- **⚡ Easy Management**: Makefile with 30+ convenient commands

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     nginx       │────│   Node.js       │────│  PostgreSQL     │
│  Reverse Proxy  │    │   Express API   │    │   Database      │
│   Port 80/443   │    │   Port 3000     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Node.js 18+ with Express.js
- **Database**: PostgreSQL 15 with connection pooling
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Proxy**: nginx Alpine with reverse proxy configuration
- **Authentication**: JWT tokens with bcrypt password hashing
- **Logging**: Winston with daily rotating files and structured JSON
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest with supertest for API testing
- **Security**: npm audit with automated vulnerability scanning

## 📋 Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18+** (for local development)
- **make** (for using Makefile commands)

## ⚡ Quick Start

### Option 1: Using Make Commands (Recommended)

```bash
# Show all available commands
make help

# Start development environment
make dev

# Check application health
make health

# View logs
make logs

# Run tests
make test

# Run security scan
make security
```

### Option 2: Manual Docker Commands

```bash
# Development environment
docker-compose -f docker-compose.dev.yml up -d

# Production environment  
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Set environment variables
export DB_HOST=localhost
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=radiocalico_dev
export JWT_SECRET=your-secret-key

# Start the server
npm run dev
```

## 🎯 Make Commands

The project includes a comprehensive Makefile with organized commands:

### Development
- `make dev` - Start development environment with hot reload
- `make dev-daemon` - Start development in background
- `make dev-logs` - Show development logs
- `make dev-stop` - Stop development environment

### Production
- `make prod` - Start production environment
- `make prod-daemon` - Start production in background
- `make prod-logs` - Show production logs
- `make prod-stop` - Stop production environment

### Testing
- `make test` - Run all tests
- `make test-coverage` - Run tests with coverage report
- `make test-backend` - Run backend-only tests
- `make test-integration` - Run integration tests
- `make test-watch` - Run tests in watch mode

### Security
- `make security` - Run comprehensive security scan
- `make security-audit` - Run npm audit on dependencies
- `make security-fix` - Attempt to fix vulnerabilities automatically
- `make security-report` - Generate detailed security report

### Database
- `make db-backup` - Backup production database
- `make db-backup-dev` - Backup development database
- `make shell-db` - Open PostgreSQL shell

### Utilities
- `make health` - Check application health
- `make logs` - View application logs
- `make status` - Show container status
- `make clean` - Clean up containers and cache

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile (authenticated)

### Songs
- `GET /api/songs` - List all songs
- `GET /api/songs/my` - Get user's songs (authenticated)
- `POST /api/songs` - Add new song (authenticated)

### Playlists
- `GET /api/playlists` - List all playlists
- `GET /api/playlists/my` - Get user's playlists (authenticated)
- `POST /api/playlists` - Create new playlist (authenticated)

### Ratings
- `POST /api/ratings` - Submit song rating (authenticated)
- `GET /api/ratings/:title/:artist` - Get song ratings
- `GET /api/ratings/my` - Get user's rating history (authenticated)
- `DELETE /api/ratings` - Delete rating (authenticated)

### System
- `GET /health` - Application health check
- `GET /api/status` - Detailed system status

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE
);
```

### Songs Table
```sql
CREATE TABLE songs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    album VARCHAR(200),
    duration INTEGER,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(title, artist)
);
```

### Ratings Table
```sql
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_title VARCHAR(200) NOT NULL,
    song_artist VARCHAR(200) NOT NULL,
    rating INTEGER CHECK (rating IN (-1, 1)),
    stream_timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_title, song_artist)
);
```

### Playlists & Playlist Songs
```sql
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📊 Logging System

Radio Calico uses Winston for comprehensive logging:

### Log Files
- `logs/app-YYYY-MM-DD.log` - Daily rotating application logs
- `logs/combined.log` - All logs combined
- `logs/error.log` - Error-only logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Log Categories
- **HTTP Requests**: Method, URL, status, duration, IP, User-Agent
- **Authentication**: Login/registration attempts with metadata
- **Database**: Connection events, query errors, initialization
- **Security**: Failed authentication, suspicious activity
- **Application**: Startup, shutdown, configuration changes

### Structured JSON Format
```json
{
  "level": "info",
  "message": "HTTP Request",
  "method": "POST",
  "url": "/api/auth/login",
  "status": 200,
  "duration": "45ms",
  "ip": "192.168.1.100",
  "userId": 123,
  "timestamp": "2025-08-28T10:30:00.000Z"
}
```

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- bcrypt password hashing with salt rounds
- Protected API endpoints with middleware
- User session management

### Security Scanning
- Automated npm audit vulnerability scanning
- Regular dependency updates
- Security report generation
- CVE tracking and remediation

### nginx Security
- Rate limiting for API endpoints
- Security headers (CSRF, XSS protection)
- SSL/TLS termination
- Request size limits

### Database Security
- PostgreSQL with prepared statements (SQL injection prevention)
- Connection pooling with limits
- Environment-based credentials
- Database connection encryption

## 🧪 Testing

Comprehensive test suite covering:

### Unit Tests
- Authentication functions
- Database operations
- API endpoint logic
- Utility functions

### Integration Tests
- Full API workflow testing
- Database integration
- Authentication flows
- Error handling

### Security Tests
- Vulnerability scanning
- Dependency auditing
- Authentication bypass testing
- Input validation testing

### Running Tests
```bash
# All tests
make test

# With coverage
make test-coverage

# Specific test suites
make test-backend
make test-integration

# Security tests
make security
```

## 🌍 Environment Configuration

### Development Environment Variables
```bash
NODE_ENV=development
DB_HOST=postgres-dev
DB_USER=postgres
DB_PASSWORD=dev_password
DB_NAME=radiocalico_dev
DB_PORT=5432
JWT_SECRET=dev-jwt-secret-key
```

### Production Environment Variables
```bash
NODE_ENV=production
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=strong-production-password
DB_NAME=radiocalico
DB_PORT=5432
JWT_SECRET=super-secret-production-jwt-key
SSL_CERT_PATH=/path/to/certificate
SSL_KEY_PATH=/path/to/private-key
```

## 📁 Project Structure

```
radio-calico/
├── public/                     # Frontend static files
│   ├── index.html             # Main web interface
│   ├── styles.css             # Application styling
│   └── script.js              # Frontend JavaScript
├── nginx/                     # nginx configuration
│   └── nginx.conf             # Reverse proxy config
├── tests/                     # Test suite
│   ├── setup.js               # Test configuration
│   ├── backend.test.js        # Backend unit tests
│   ├── auth.test.js           # Authentication tests
│   ├── ratings.test.js        # Ratings system tests
│   └── integration.test.js    # Integration tests
├── logs/                      # Application logs
├── backups/                   # Database backups
├── scripts/                   # Utility scripts
│   ├── security-scan.sh       # Comprehensive security scanner
│   └── ci-security-audit.sh   # CI/CD security audit
├── server.js                  # Main Express application
├── logger.js                  # Winston logging configuration
├── healthcheck.js             # Docker health check
├── init-db.sql               # Database initialization
├── package.json              # Node.js dependencies
├── Dockerfile                # Container configuration
├── docker-compose.dev.yml    # Development environment
├── docker-compose.prod.yml   # Production environment
├── Makefile                  # Build and management commands
├── .security.yml             # Security configuration
└── README.md                 # This documentation
```

## 🚀 Deployment

### Production Deployment Checklist

1. **Environment Setup**:
```bash
# Set strong passwords and secrets
export DB_PASSWORD="strong-random-password"
export JWT_SECRET="super-secret-jwt-key-change-me"
```

2. **SSL Configuration** (nginx):
```bash
# Add SSL certificates
cp your-cert.pem nginx/ssl/
cp your-key.pem nginx/ssl/
```

3. **Deploy**:
```bash
make prod-daemon
make health
make db-backup
```

4. **Monitor**:
```bash
make status
make logs
make security
```

### Docker Production Deployment

```bash
# Build and start production environment
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl http://localhost/health

# Monitor logs
docker-compose -f docker-compose.prod.yml logs -f
```

## 📈 Monitoring & Maintenance

### Regular Maintenance Tasks

```bash
# Weekly security scan
make security

# Database backup
make db-backup

# Log rotation check
make logs

# Container health check
make status

# Dependency updates
npm audit fix
```

### Performance Monitoring

- **Health Checks**: `/health` endpoint with database connectivity
- **Log Analysis**: Structured JSON logs for easy parsing
- **Error Tracking**: Separate error logs and exception handling
- **Request Metrics**: Response times and status codes in logs

## 🛠️ Development Workflow

### Setting Up Development Environment

1. **Clone repository**:
```bash
git clone <repository-url>
cd radio-calico
```

2. **Start development environment**:
```bash
make dev-daemon
```

3. **Verify setup**:
```bash
make health
make test
```

4. **Start coding**:
- Backend changes: `server.js`, `logger.js`
- Frontend changes: `public/` directory
- Tests: `tests/` directory

### Making Changes

1. **Create feature branch**:
```bash
git checkout -b feature/new-feature
```

2. **Make changes and test**:
```bash
make test
make security
```

3. **Check logs for issues**:
```bash
make logs
```

4. **Commit and push**:
```bash
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

## 🔧 Troubleshooting

### Common Issues

**Port conflicts**:
```bash
# Check what's using ports
lsof -i :3000
lsof -i :5432
lsof -i :80

# Change ports in docker-compose files if needed
```

**Database connection issues**:
```bash
# Check PostgreSQL container
make status
docker logs radiocalico-postgres-dev

# Reset database
make clean
make dev
```

**nginx 502 errors**:
```bash
# Check application container
docker logs radiocalico-dev
make health

# Restart services
make dev-restart
```

**Git index lock errors**:
```bash
# Remove stuck lock file
rm .git/index.lock

# Kill any stuck git processes
ps aux | grep git
kill -9 <process-id>
```

### Debug Mode

Enable detailed logging:
```bash
# Set environment variable
export DEBUG=true

# Restart with debug logging
make dev-restart
make logs
```

## 📚 Additional Resources

- **[Makefile Guide](MAKEFILE-GUIDE.md)** - Detailed command reference
- **[PostgreSQL Setup](README-postgres.md)** - Database configuration details
- **[Style Guide](RadioCalico_Style_Guide.txt)** - UI/UX guidelines
- **[Security Configuration](.security.yml)** - Security settings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `make test`
6. Run security scan: `make security`
7. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section above
2. Review the logs: `make logs`
3. Run health check: `make health`
4. Check container status: `make status`
5. Open an issue on GitHub

---

**Radio Calico** - Professional Music Streaming Platform 🎵
