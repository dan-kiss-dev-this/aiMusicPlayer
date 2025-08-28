# Radio Calico Deployment Guide

Complete guide for deploying Radio Calico Music Streaming Platform in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Security Considerations](#security-considerations)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Docker** 20.10+ and **Docker Compose** 1.29+
- **Node.js** 18+ (for local development)
- **PostgreSQL** 15+ (if not using Docker)
- **nginx** (if not using Docker)
- **make** (for using Makefile commands)

### Required Knowledge
- Basic Docker and container concepts
- nginx configuration
- PostgreSQL administration
- Environment variable management
- SSL/TLS certificate management

## Development Deployment

### Quick Start

1. **Clone the repository**:
```bash
git clone <repository-url>
cd radio-calico
```

2. **Start development environment**:
```bash
make dev-daemon
```

3. **Verify deployment**:
```bash
make health
make status
```

4. **Access the application**:
- Application: http://localhost:3000
- Database: localhost:5433 (postgres/dev_password)

### Manual Development Setup

If you prefer not to use Docker for development:

1. **Install dependencies**:
```bash
npm install
cd tests && npm install
```

2. **Set up PostgreSQL**:
```bash
# On macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb radiocalico_dev
```

3. **Configure environment**:
```bash
export NODE_ENV=development
export DB_HOST=localhost
export DB_USER=postgres
export DB_PASSWORD=your_password
export DB_NAME=radiocalico_dev
export DB_PORT=5432
export JWT_SECRET=dev-jwt-secret-key
```

4. **Start the application**:
```bash
npm run dev
```

## Production Deployment

### Using Docker (Recommended)

1. **Prepare environment variables**:
```bash
# Create .env.production file
cat > .env.production << EOF
NODE_ENV=production
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_NAME=radiocalico
DB_PORT=5432
JWT_SECRET=CHANGE_THIS_SUPER_SECRET_JWT_KEY
EOF
```

2. **Configure SSL certificates** (if using HTTPS):
```bash
# Place certificates in nginx/ssl/
cp your-certificate.pem nginx/ssl/server.crt
cp your-private-key.pem nginx/ssl/server.key
```

3. **Deploy with make commands**:
```bash
make prod-daemon
make health
make db-backup
```

4. **Verify deployment**:
```bash
curl http://localhost/health
make status
make logs
```

### Manual Production Setup

For deployment without Docker:

1. **Set up PostgreSQL**:
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE radiocalico;
CREATE USER radiocalico_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE radiocalico TO radiocalico_user;
```

2. **Configure nginx**:
```bash
# Copy nginx configuration
sudo cp nginx/nginx.conf /etc/nginx/sites-available/radiocalico
sudo ln -s /etc/nginx/sites-available/radiocalico /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

3. **Set up application**:
```bash
# Install Node.js dependencies
npm install --production

# Set environment variables
export NODE_ENV=production
export DB_HOST=localhost
export DB_USER=radiocalico_user
export DB_PASSWORD=strong_password
export DB_NAME=radiocalico
export JWT_SECRET=super-secret-production-key

# Start application with PM2
npm install -g pm2
pm2 start server.js --name radiocalico
pm2 startup
pm2 save
```

## Docker Deployment

### Development Environment

The development environment uses `docker-compose.dev.yml`:

```yaml
# Key features:
- Hot reload with volume mounts
- Development database on port 5433
- Application accessible on port 3000
- Separate development secrets
```

**Start development**:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Production Environment

The production environment uses `docker-compose.prod.yml`:

```yaml
# Key features:
- nginx reverse proxy on ports 80/443
- Internal networking (no exposed ports except nginx)
- Production database with strong passwords
- SSL/TLS termination
- Health checks and restart policies
```

**Start production**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Custom Docker Configuration

You can customize the deployment by:

1. **Modifying environment variables**:
```bash
# Edit docker-compose.prod.yml
environment:
  - NODE_ENV=production
  - DB_PASSWORD=${DB_PASSWORD}
  - JWT_SECRET=${JWT_SECRET}
```

2. **Customizing nginx configuration**:
```bash
# Edit nginx/nginx.conf
# Add custom server blocks, SSL settings, etc.
```

3. **Adding custom volumes**:
```bash
# For persistent log storage
volumes:
  - ./logs:/app/logs
  - ./backups:/app/backups
```

## Cloud Deployment

### AWS ECS/Fargate

1. **Build and push images**:
```bash
# Build production image
docker build -t radiocalico:latest .

# Tag for ECR
docker tag radiocalico:latest ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/radiocalico:latest

# Push to ECR
docker push ${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/radiocalico:latest
```

2. **Create ECS task definition**:
```json
{
  "family": "radiocalico",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "radiocalico",
      "image": "${AWS_ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com/radiocalico:latest",
      "portMappings": [{"containerPort": 3000}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DB_HOST", "value": "${RDS_ENDPOINT}"}
      ],
      "secrets": [
        {"name": "DB_PASSWORD", "valueFrom": "${DB_PASSWORD_ARN}"},
        {"name": "JWT_SECRET", "valueFrom": "${JWT_SECRET_ARN}"}
      ]
    }
  ]
}
```

3. **Set up RDS PostgreSQL**:
```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier radiocalico-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password "${DB_PASSWORD}" \
  --allocated-storage 20
```

### Google Cloud Run

1. **Build and deploy**:
```bash
# Build with Cloud Build
gcloud builds submit --tag gcr.io/${PROJECT_ID}/radiocalico

# Deploy to Cloud Run
gcloud run deploy radiocalico \
  --image gcr.io/${PROJECT_ID}/radiocalico \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DB_HOST=${CLOUD_SQL_HOST}
```

2. **Set up Cloud SQL**:
```bash
# Create PostgreSQL instance
gcloud sql instances create radiocalico-db \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1
```

### DigitalOcean App Platform

1. **Create app specification** (`.do/app.yaml`):
```yaml
name: radiocalico
services:
- name: web
  source_dir: /
  github:
    repo: your-username/radiocalico
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: DB_HOST
    value: ${db.HOSTNAME}
  - key: DB_PASSWORD
    value: ${db.PASSWORD}
    type: secret

databases:
- name: db
  engine: PG
  version: "15"
```

## Security Considerations

### Environment Variables

**Never commit secrets to version control**:
```bash
# Use environment files
echo "JWT_SECRET=super-secret-key" >> .env.production
echo "DB_PASSWORD=strong-database-password" >> .env.production

# Add to .gitignore
echo ".env.production" >> .gitignore
```

### SSL/TLS Configuration

**nginx SSL configuration**:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
}
```

### Database Security

**PostgreSQL security settings**:
```postgresql
-- Create limited user
CREATE USER radiocalico_app WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE radiocalico TO radiocalico_app;
GRANT USAGE ON SCHEMA public TO radiocalico_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO radiocalico_app;

-- Enable connection encryption
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

### Container Security

**Dockerfile security best practices**:
```dockerfile
# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Remove unnecessary packages
RUN apt-get remove --purge -y wget curl && \
    apt-get autoremove -y && \
    apt-get clean

# Set security headers
ENV NODE_OPTIONS="--max-old-space-size=1024"
```

## Monitoring and Maintenance

### Health Monitoring

**Set up health checks**:
```bash
# Application health
curl http://localhost/health

# Database connectivity
make shell-db -c "\l"

# Container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Log Management

**Configure log rotation**:
```bash
# View logs
make logs

# Archive old logs
find logs/ -name "*.log" -mtime +30 -exec gzip {} \;

# Clean up old archives
find logs/ -name "*.gz" -mtime +90 -delete
```

### Backup Strategy

**Automated backups**:
```bash
# Daily database backup
0 2 * * * /usr/local/bin/make db-backup

# Weekly full backup
0 3 * * 0 tar -czf /backups/radiocalico-$(date +%Y%m%d).tar.gz /app
```

### Security Updates

**Regular maintenance**:
```bash
# Weekly security scan
make security

# Monthly dependency updates
npm audit fix
docker pull postgres:15-alpine
docker pull nginx:alpine

# Rebuild with updates
make rebuild
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database status
make status
docker logs radiocalico-postgres

# Reset database
make clean
make dev
```

#### nginx 502 Bad Gateway
```bash
# Check application status
docker logs radiocalico-app
make health

# Check nginx configuration
nginx -t
docker logs radiocalico-nginx
```

#### Out of Memory
```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in nginx/ssl/server.crt -text -noout

# Test SSL configuration
openssl s_client -connect localhost:443
```

### Performance Issues

#### Slow Database Queries
```bash
# Enable query logging
# In postgresql.conf:
log_statement = 'all'
log_min_duration_statement = 1000

# Analyze slow queries
make shell-db
\x
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC;
```

#### High Memory Usage
```bash
# Check Node.js memory usage
node --max-old-space-size=1024 server.js

# Monitor with PM2
pm2 monit
```

### Log Analysis

**Common log patterns**:
```bash
# Authentication failures
grep "authentication failed" logs/app-*.log

# Database errors
grep "database" logs/error.log

# High response times
grep "duration.*[5-9][0-9][0-9]ms" logs/app-*.log
```

## Deployment Checklist

### Pre-deployment
- [ ] Update dependencies: `npm audit fix`
- [ ] Run tests: `make test`
- [ ] Security scan: `make security`
- [ ] Build containers: `make rebuild`
- [ ] Backup database: `make db-backup`

### Deployment
- [ ] Set environment variables
- [ ] Configure SSL certificates
- [ ] Deploy application: `make prod-daemon`
- [ ] Verify health: `make health`
- [ ] Check logs: `make logs`

### Post-deployment
- [ ] Monitor application health
- [ ] Verify all endpoints work
- [ ] Check database connectivity
- [ ] Test authentication flow
- [ ] Monitor resource usage
- [ ] Set up monitoring alerts

### Rollback Plan
- [ ] Keep previous container images
- [ ] Database backup before deployment
- [ ] Quick rollback script
- [ ] Health check automation
- [ ] Alert system for failures

---

For additional support, see:
- [README.md](README.md) - General documentation
- [API.md](API.md) - API reference
- [MAKEFILE-GUIDE.md](MAKEFILE-GUIDE.md) - Command reference
- [CHANGELOG.md](CHANGELOG.md) - Version history
