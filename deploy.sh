#!/bin/bash
set -e

# Radio Calico Docker Deployment Script
# Usage: ./deploy.sh [dev|prod] [command]

ENVIRONMENT=${1:-dev}
COMMAND=${2:-up}

echo "🎵 Radio Calico Deployment Script"
echo "Environment: $ENVIRONMENT"
echo "Command: $COMMAND"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to generate self-signed SSL certificates for development
generate_ssl_certs() {
    echo "🔐 Generating self-signed SSL certificates for development..."
    mkdir -p nginx/ssl
    
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=RadioCalico/CN=localhost"
        echo "✅ SSL certificates generated"
    else
        echo "✅ SSL certificates already exist"
    fi
}

# Function to build containers
build_containers() {
    echo "🔨 Building Radio Calico containers..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
    else
        docker-compose -f docker-compose.dev.yml build --no-cache
    fi
    echo "✅ Containers built successfully"
}

# Function to start services
start_services() {
    echo "🚀 Starting Radio Calico services..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        generate_ssl_certs
        docker-compose -f docker-compose.prod.yml $COMMAND -d
        echo "✅ Production services started"
        echo "🌐 Access the application at: https://localhost"
        echo "📊 Monitor logs with: docker-compose -f docker-compose.prod.yml logs -f"
    else
        docker-compose -f docker-compose.dev.yml $COMMAND
        echo "✅ Development services started"
        echo "🌐 Access the application at: http://localhost:3000"
        echo "🔧 Development mode with hot reload enabled"
    fi
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping Radio Calico services..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose -f docker-compose.dev.yml down
    fi
    echo "✅ Services stopped"
}

# Function to clean up everything
cleanup() {
    echo "🧹 Cleaning up Radio Calico containers and volumes..."
    
    # Stop all services
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
    
    # Remove containers
    docker container prune -f
    
    # Remove unused images
    echo "Removing unused Docker images..."
    docker image prune -f
    
    # Optionally remove volumes (uncomment if needed)
    # docker volume prune -f
    
    echo "✅ Cleanup completed"
}

# Function to show logs
show_logs() {
    echo "📋 Showing Radio Calico logs..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml logs -f --tail=100
    else
        docker-compose -f docker-compose.dev.yml logs -f --tail=100
    fi
}

# Function to backup database
backup_database() {
    echo "💾 Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sqlite"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml exec radiocalico cp /app/data/radio.db /app/data/$BACKUP_FILE
        docker cp $(docker-compose -f docker-compose.prod.yml ps -q radiocalico):/app/data/$BACKUP_FILE ./backups/
    else
        docker-compose -f docker-compose.dev.yml exec radiocalico cp /app/data/radio.db /app/data/$BACKUP_FILE
        docker cp $(docker-compose -f docker-compose.dev.yml ps -q radiocalico):/app/data/$BACKUP_FILE ./backups/
    fi
    
    echo "✅ Database backed up to ./backups/$BACKUP_FILE"
}

# Function to restore database
restore_database() {
    if [ -z "$3" ]; then
        echo "❌ Please specify backup file: ./deploy.sh $ENVIRONMENT restore backup_file.sqlite"
        exit 1
    fi
    
    BACKUP_FILE=$3
    if [ ! -f "./backups/$BACKUP_FILE" ]; then
        echo "❌ Backup file ./backups/$BACKUP_FILE not found"
        exit 1
    fi
    
    echo "🔄 Restoring database from $BACKUP_FILE..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker cp ./backups/$BACKUP_FILE $(docker-compose -f docker-compose.prod.yml ps -q radiocalico):/app/data/restore.db
        docker-compose -f docker-compose.prod.yml exec radiocalico mv /app/data/restore.db /app/data/radio.db
    else
        docker cp ./backups/$BACKUP_FILE $(docker-compose -f docker-compose.dev.yml ps -q radiocalico):/app/data/restore.db
        docker-compose -f docker-compose.dev.yml exec radiocalico mv /app/data/restore.db /app/data/radio.db
    fi
    
    echo "✅ Database restored from $BACKUP_FILE"
}

# Function to show status
show_status() {
    echo "📊 Radio Calico Status"
    echo "====================="
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml ps
    else
        docker-compose -f docker-compose.dev.yml ps
    fi
    
    echo ""
    echo "💽 Disk Usage:"
    docker system df
}

# Create necessary directories
mkdir -p backups
mkdir -p nginx/ssl

# Main command handling
case $COMMAND in
    "up"|"start")
        start_services
        ;;
    "down"|"stop")
        stop_services
        ;;
    "build")
        build_containers
        ;;
    "logs")
        show_logs
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_database
        ;;
    "restore")
        restore_database $@
        ;;
    "clean"|"cleanup")
        cleanup
        ;;
    "restart")
        stop_services
        sleep 2
        start_services
        ;;
    *)
        echo "Usage: $0 [dev|prod] [command]"
        echo ""
        echo "Commands:"
        echo "  up, start    - Start services"
        echo "  down, stop   - Stop services"
        echo "  build        - Build containers"
        echo "  restart      - Restart services"
        echo "  logs         - Show logs"
        echo "  status       - Show status"
        echo "  backup       - Backup database"
        echo "  restore      - Restore database (requires backup filename)"
        echo "  clean        - Clean up containers and images"
        echo ""
        echo "Examples:"
        echo "  $0 dev up              # Start development environment"
        echo "  $0 prod start          # Start production environment"
        echo "  $0 dev logs            # Show development logs"
        echo "  $0 prod backup         # Backup production database"
        echo "  $0 dev restore backup_20231201_120000.sqlite"
        exit 1
        ;;
esac
