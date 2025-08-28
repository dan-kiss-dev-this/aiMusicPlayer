# Radio Calico Makefile Guide

This project includes a comprehensive Makefile that provides convenient commands for development, production, and testing workflows.

## Quick Start

```bash
# Show all available commands
make help

# Start development environment
make dev

# Run tests
make test

# Check application health
make health

# View logs
make logs
```

## Common Workflows

### Development Workflow
```bash
# Start development environment in background
make dev-daemon

# Check if everything is running
make status
make health

# View live logs
make dev-logs

# Stop when done
make dev-stop
```

### Production Deployment
```bash
# Start production environment
make prod-daemon

# Verify deployment
make health
make status

# Monitor logs
make prod-logs

# Create database backup
make db-backup
```

### Testing Workflow
```bash
# Install test dependencies
make install

# Run all tests
make test

# Run with coverage
make test-coverage

# Watch mode for development
make test-watch

# Run specific test suites
make test-backend
make test-frontend
make test-integration
```

## Development Tools

### Database Management
```bash
# Initialize database tables
make db-init

# Backup development database
make db-backup-dev

# Backup production database
make db-backup

# Open database shell
make shell-db
```

### Container Management
```bash
# Get shell access to containers
make shell-dev      # Development container
make shell-prod     # Production container

# Rebuild containers from scratch
make rebuild

# Clean up everything
make clean
```

### Monitoring & Debugging
```bash
# Check container status
make status

# View application logs
make logs

# View only error logs
make logs-errors

# Check application health
make health

# Show version information
make version

# Show environment configuration
make env
```

## Quick Actions

The Makefile includes some "quick" targets that combine multiple operations:

```bash
# Quick development setup with health check and logs
make quick-dev

# Quick test run with dependency installation
make quick-test

# Quick production deployment with health check
make quick-prod
```

## Environment Variables

You can customize behavior with environment variables:

```bash
# Set environment mode
NODE_ENV=production make prod

# Set database password for production
DB_PASSWORD=secure_password make prod
```

## Target Categories

- **Development**: `dev`, `dev-daemon`, `dev-stop`, `dev-restart`, `dev-logs`
- **Production**: `prod`, `prod-daemon`, `prod-stop`, `prod-restart`, `prod-logs`
- **Testing**: `test`, `test-watch`, `test-coverage`, `test-backend`, `test-frontend`, `test-integration`
- **Database**: `db-init`, `db-backup`, `db-backup-dev`
- **Utilities**: `install`, `clean`, `logs`, `health`, `status`
- **Quick Actions**: `quick-dev`, `quick-test`, `quick-prod`
- **Development Tools**: `shell-dev`, `shell-prod`, `shell-db`, `rebuild`
- **Information**: `version`, `env`, `help`

## Examples

### Start a fresh development session
```bash
make clean          # Clean up any existing containers
make dev-daemon     # Start development environment
make health         # Verify everything is working
```

### Deploy to production
```bash
make db-backup      # Backup current production data
make prod-daemon    # Start new production environment
make health         # Verify deployment
make prod-logs      # Monitor startup logs
```

### Run comprehensive tests
```bash
make install        # Ensure dependencies are installed
make test-coverage  # Run tests with coverage report
make logs           # Check for any issues in logs
```

### Debug issues
```bash
make status         # Check container status
make logs-errors    # Look for error messages
make shell-dev      # Get shell access to investigate
```

All commands are designed to be safe and provide helpful output. The Makefile includes proper error handling and informative messages to guide you through each operation.
