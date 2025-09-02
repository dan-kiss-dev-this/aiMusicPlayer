# Radio Calico - AI Music Player 🎵

A modern, production-ready music streaming application featuring live HLS streaming, real-time song detection, comprehensive user authentication, and an advanced rating system. Built with PostgreSQL, Docker, and comprehensive CI/CD pipelines.

![Radio Calico](public/RadioCalicoLogoTM.png)

## 🚀 Key Features

### 🎵 Live Music Streaming
- **HLS Live Stream**: 24-bit/48kHz lossless audio streaming via CloudFront CDN
- **Real-time Song Detection**: Automatic song identification and metadata extraction
- **Cross-browser Support**: Native HLS support + HLS.js fallback for broader compatibility
- **Advanced Audio Controls**: Volume control, mute functionality, and stream status monitoring

### 👤 User Experience
- **JWT Authentication**: Secure user registration and login with bcrypt password hashing
- **⭐ Rating System**: Real-time thumbs up/down voting for live streams and detected songs
- **� Song History**: Recently played track tracking with timestamps
- **� Responsive Design**: Mobile-first, fully responsive UI with modern CSS Grid/Flexbox

### 🔧 Technical Excellence
- **� Comprehensive Logging**: Winston-based structured logging with daily rotation
- **🐳 Full Containerization**: Docker development and production environments
- **🔒 Security-First**: Automated security scanning, vulnerability management, and CI/CD pipelines
- **🧪 Extensive Testing**: Unit tests, integration tests, and automated CI/CD validation
- **⚡ Performance Optimized**: Lazy loading, code splitting, and caching strategies

## 🏗️ Architecture

### System Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     nginx       │────│   Node.js       │────│  PostgreSQL     │
│  Reverse Proxy  │    │   Express API   │    │   Database      │
│   Port 80/443   │    │   Port 3000     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Live HLS Stream                              │
│  CloudFront CDN → https://d3d4yli4hf5bmh.cloudfront.net       │
│  • 24-bit/48kHz Lossless Audio                                 │
│  • HLS.js Integration                                          │
│  • Real-time Metadata Extraction                               │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Architecture
- **Modern Vanilla JavaScript**: No framework dependencies for optimal performance
- **HLS.js Integration**: Advanced streaming capabilities with fallback support
- **Real-time Updates**: Live song detection and rating synchronization
- **Responsive Design**: CSS Grid/Flexbox with mobile-first approach
- **Performance Optimized**: Lazy loading, code splitting, and efficient DOM manipulation

### Backend Architecture
- **Express.js API**: RESTful endpoints with middleware-based architecture
- **JWT Authentication**: Stateless authentication with refresh token support
- **PostgreSQL**: Relational database with connection pooling and prepared statements
- **Winston Logging**: Structured JSON logging with multiple transports
- **Docker Multi-stage**: Optimized container builds for development and production

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with CSS Grid, Flexbox, and custom properties
- **JavaScript (ES6+)**: Vanilla JS with modules, async/await, and modern APIs
- **HLS.js**: HTTP Live Streaming library for cross-browser compatibility
- **Web APIs**: Intersection Observer, Performance API, Service Workers

### Backend
- **Node.js 18+**: Modern JavaScript runtime with latest features
- **Express.js**: Minimal web framework with middleware architecture
- **PostgreSQL 15**: Advanced relational database with JSON support
- **JWT**: JSON Web Tokens for stateless authentication
- **bcrypt**: Password hashing with configurable salt rounds
- **Winston**: Structured logging with multiple transports and rotation

### Infrastructure
- **Docker**: Containerization for consistent environments
- **Docker Compose**: Multi-container orchestration
- **nginx Alpine**: Lightweight reverse proxy with SSL termination
- **CloudFront CDN**: Content delivery for live audio streaming

### Development & CI/CD
- **Jest**: Testing framework with comprehensive coverage
- **Supertest**: HTTP assertion library for API testing
- **GitHub Actions**: Automated CI/CD pipelines
- **ESLint**: Code quality and style enforcement
- **npm audit**: Security vulnerability scanning
- **Make**: Build automation and task management

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
  ```json
  {
    "username": "string",
    "email": "string", 
    "password": "string",
    "firstName": "string?",
    "lastName": "string?"
  }
  ```
- `POST /api/auth/login` - User login
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- `GET /api/auth/profile` - Get user profile (authenticated)

### Songs & Music Library
- `GET /api/songs` - List all songs
- `GET /api/songs/my` - Get user's songs (authenticated)
- `POST /api/songs` - Add new song (authenticated)
  ```json
  {
    "title": "string",
    "artist": "string",
    "album": "string?",
    "duration": "number?",
    "file_path": "string?"
  }
  ```

### Live Stream Rating System
- `POST /api/ratings` - Submit song rating (authenticated)
  ```json
  {
    "song_title": "string",
    "song_artist": "string", 
    "rating": 1 | -1
  }
  ```
- `GET /api/ratings/:title/:artist` - Get song ratings
  ```json
  {
    "thumbs_up": 42,
    "thumbs_down": 3,
    "user_rating": 1 | -1 | null
  }
  ```
- `GET /api/ratings/my` - Get user's rating history (authenticated)
- `DELETE /api/ratings` - Delete rating (authenticated)

### Playlists
- `GET /api/playlists` - List all playlists
- `GET /api/playlists/my` - Get user's playlists (authenticated)
- `POST /api/playlists` - Create new playlist (authenticated)
  ```json
  {
    "name": "string",
    "description": "string?"
  }
  ```

### System Health & Monitoring
- `GET /health` - Application health check
- `GET /api/status` - Detailed system status with database connectivity

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP
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
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(title, artist)
);
```

### Live Stream Ratings Table
```sql
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    song_title VARCHAR(200) NOT NULL,
    song_artist VARCHAR(200) NOT NULL,
    rating INTEGER CHECK (rating IN (-1, 1)),
    stream_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, song_title, song_artist)
);

-- Indexes for performance
CREATE INDEX idx_ratings_song ON ratings(song_title, song_artist);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_timestamp ON ratings(stream_timestamp);
```

### Playlists & Playlist Songs
```sql
CREATE TABLE playlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlist_songs (
    id SERIAL PRIMARY KEY,
    playlist_id INTEGER REFERENCES playlists(id) ON DELETE CASCADE,
    song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(playlist_id, song_id)
);
```

### Database Views & Aggregations
```sql
-- Song rating summary view
CREATE VIEW song_ratings_summary AS
SELECT 
    song_title,
    song_artist,
    COUNT(CASE WHEN rating = 1 THEN 1 END) as thumbs_up,
    COUNT(CASE WHEN rating = -1 THEN 1 END) as thumbs_down,
    COUNT(*) as total_ratings,
    AVG(CAST(rating AS FLOAT)) as avg_rating
FROM ratings
GROUP BY song_title, song_artist;
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

Comprehensive test suite covering all application layers:

### Test Structure
```
tests/
├── basic.test.js              # Basic functionality tests
├── backend.test.js            # Backend API tests  
├── frontend-ratings.test.js   # Frontend rating system tests
├── ratings.test.js            # Rating API endpoint tests
├── ratings-integration.test.js # End-to-end rating workflow tests
└── setup.js                   # Test configuration and setup
```

### Test Categories

#### Unit Tests
- **Authentication**: Login/registration, JWT token validation
- **Database Operations**: CRUD operations, connection pooling
- **API Endpoints**: Request/response validation, error handling
- **Rating System**: Thumbs up/down logic, user rating history
- **Utility Functions**: Data validation, formatting, security

#### Integration Tests
- **Full API Workflow**: Authentication → API calls → Database updates
- **Rating System Integration**: User authentication → song rating → data persistence
- **Error Handling**: Database failures, network issues, invalid inputs
- **Security**: SQL injection prevention, authentication bypass attempts

#### Frontend Tests
- **DOM Manipulation**: Element creation, event handling, state updates
- **AJAX Requests**: API communication, error handling, response processing
- **User Interactions**: Button clicks, form submissions, modal operations
- **Live Stream Integration**: HLS.js integration, metadata extraction

#### Performance Tests
- **Load Testing**: Concurrent user simulation
- **Memory Leaks**: Long-running operation monitoring
- **Database Performance**: Query optimization validation
- **Stream Performance**: HLS loading and playback testing

### Security Tests
- **Vulnerability Scanning**: Automated npm audit with CI/CD integration
- **Authentication Security**: Token expiration, password strength, brute force protection
- **Input Validation**: SQL injection, XSS prevention, data sanitization
- **API Security**: Rate limiting, CORS configuration, header security

### Running Tests
```bash
# Run all tests
make test
npm test

# Run with coverage report
make test-coverage
npm run test:coverage

# Run specific test suites
npm test -- tests/ratings.test.js
npm test -- tests/ratings-integration.test.js

# Run tests in watch mode for development
make test-watch
npm run test:watch

# Run security tests
make security
npm run security:scan
```

### Test Coverage Goals
- **Lines**: >90% coverage
- **Functions**: >95% coverage  
- **Branches**: >85% coverage
- **Statements**: >90% coverage

### Continuous Integration
All tests run automatically on:
- Every pull request
- Commits to main branch
- Nightly security scans
- Deployment pipeline validation

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
├── .github/                   # GitHub Actions CI/CD
│   └── workflows/
│       ├── ci.yml            # Main CI/CD pipeline
│       ├── pr-validation.yml # Pull request validation
│       └── security.yml      # Security scanning workflow
├── public/                    # Frontend static files
│   ├── index.html            # Main web interface
│   ├── styles.css            # Application styling (35KB)
│   ├── script.js             # Frontend JavaScript (115KB)
│   ├── RadioCalicoLogoTM.png # Brand logo (55KB)
│   ├── css/                  # Performance-optimized CSS
│   │   └── critical.css      # Above-the-fold styles
│   ├── js/                   # Modular JavaScript
│   │   ├── core.js           # Essential functionality
│   │   ├── metadata.js       # Song detection & metadata
│   │   ├── rating.js         # Rating system
│   │   ├── lazy-loader.js    # Performance optimization
│   │   └── performance.js    # Performance monitoring
│   ├── index-optimized.html  # Performance-optimized version
│   └── sw.js                 # Service Worker for caching
├── nginx/                     # nginx reverse proxy configuration
│   ├── nginx.conf            # Main configuration
│   └── ssl/                  # SSL certificates (production)
├── tests/                     # Comprehensive test suite
│   ├── setup.js              # Test environment configuration
│   ├── basic.test.js         # Basic functionality tests
│   ├── backend.test.js       # Backend API tests
│   ├── frontend-ratings.test.js # Frontend rating tests
│   ├── ratings.test.js       # Rating system API tests
│   └── ratings-integration.test.js # End-to-end tests
├── logs/                      # Winston logging output
│   ├── app-YYYY-MM-DD.log    # Daily rotating logs
│   ├── combined.log          # All logs combined
│   ├── error.log             # Error-only logs
│   ├── exceptions.log        # Uncaught exceptions
│   └── rejections.log        # Unhandled promise rejections
├── backups/                   # Database backup storage
├── scripts/                   # Utility and automation scripts
│   ├── security-scan.sh      # Comprehensive security scanner
│   ├── ci-security-audit.sh  # CI/CD security validation
│   └── init-db.js           # Database initialization
├── server.js                  # Main Express application (entry point)
├── logger.js                  # Winston logging configuration
├── healthcheck.js             # Docker health check script
├── init-db.sql               # PostgreSQL schema initialization
├── package.json               # Node.js dependencies & scripts
├── package-lock.json          # Locked dependency versions
├── Dockerfile                 # Multi-stage container build
├── docker-compose.dev.yml     # Development environment
├── docker-compose.prod.yml    # Production environment  
├── Makefile                   # Build automation (30+ commands)
├── .dockerignore             # Docker build exclusions
├── .gitignore                # Git exclusions
├── .security.yml             # Security scanning configuration
├── jest.config.js            # Jest testing configuration
├── README.md                 # This comprehensive documentation
└── LICENSE                   # MIT License
```

### Key File Sizes & Performance
- **Total Public Assets**: 192KB
- **JavaScript Bundle**: 115KB (optimizable to ~50KB with code splitting)
- **CSS Styles**: 35KB (critical path: ~15KB)
- **Logo Image**: 55KB PNG (optimizable to ~25KB WebP)
- **Docker Images**: 
  - Development: ~200MB
  - Production: ~150MB (multi-stage optimized)

## 🚀 Deployment

### GitHub Actions CI/CD Pipeline

The project includes a comprehensive CI/CD pipeline with multiple automated checks:

#### CI Pipeline (`.github/workflows/ci.yml`)
1. **PR Security Check**: Automated security scanning on pull requests
2. **Integration Tests**: Full test suite with PostgreSQL database
3. **Security Scan**: Comprehensive vulnerability assessment
4. **Docker Build**: Multi-platform container builds with optimization
5. **Container Security**: Security scanning of built images
6. **Deployment Test**: Production environment validation

#### Security Workflows
- **PR Validation**: Automatic security checks with comments on pull requests
- **Dependency Scanning**: Daily npm audit runs with security reports
- **Container Scanning**: Docker image vulnerability assessment
- **Secret Detection**: Automated detection of exposed credentials

### Production Deployment Checklist

1. **Environment Configuration**:
```bash
# Set production environment variables
export NODE_ENV=production
export DB_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 64)"
export DB_HOST=your-postgres-host
export DB_NAME=radiocalico_prod
```

2. **SSL Certificate Setup**:
```bash
# Add SSL certificates for nginx
sudo mkdir -p nginx/ssl
sudo cp your-domain.crt nginx/ssl/
sudo cp your-domain.key nginx/ssl/
sudo chmod 600 nginx/ssl/*
```

3. **Database Initialization**:
```bash
# Create production database
createdb radiocalico_prod
psql radiocalico_prod < init-db.sql

# Run database backup
make db-backup
```

4. **Deploy Application**:
```bash
# Start production environment
make prod-daemon

# Verify deployment
make health
curl https://your-domain.com/health

# Monitor deployment
make status
make logs
```

5. **Post-Deployment Validation**:
```bash
# Run security scan
make security

# Check all services
make status

# Monitor logs for errors
make logs | grep ERROR

# Test critical functionality
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test", "password":"test"}'
```

### Docker Production Deployment

#### Option 1: Docker Compose
```bash
# Production deployment with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker-compose -f docker-compose.prod.yml logs -f

# Health check
curl http://localhost/health
```

#### Option 2: Kubernetes Deployment
```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radio-calico
spec:
  replicas: 3
  selector:
    matchLabels:
      app: radio-calico
  template:
    metadata:
      labels:
        app: radio-calico
    spec:
      containers:
      - name: radio-calico
        image: radio-calico:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: radio-calico-secrets
              key: db-host
```

### Cloud Deployment Options

#### AWS Deployment
```bash
# Using AWS ECS with CloudFormation
aws cloudformation deploy \
  --template-file aws-ecs-template.yaml \
  --stack-name radio-calico-prod \
  --parameter-overrides \
    Environment=production \
    ImageTag=latest

# Using AWS App Runner
aws apprunner create-service \
  --service-name radio-calico \
  --source-configuration file://apprunner-source.json
```

#### Google Cloud Platform
```bash
# Using Google Cloud Run
gcloud run deploy radio-calico \
  --image gcr.io/your-project/radio-calico:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Azure Container Instances
```bash
# Using Azure Container Instances
az container create \
  --resource-group radio-calico-rg \
  --name radio-calico-prod \
  --image your-registry/radio-calico:latest \
  --dns-name-label radio-calico \
  --ports 80
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
