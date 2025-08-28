# Radio Calico Music Player - Makefile
# Convenient targets for development, production, and testing

.PHONY: help dev prod test clean logs install health backup restore

# Default target
help: ## Show this help message
	@echo "Radio Calico Music Player - Available Make Targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Environment Variables:"
	@echo "  NODE_ENV     - Set environment (development/production/test)"
	@echo "  DB_PASSWORD  - Database password for production"

##@ Development
dev: ## Start development environment with hot reload
	@echo "🚀 Starting Radio Calico in development mode..."
	@docker-compose -f docker-compose.dev.yml up --build

dev-daemon: ## Start development environment in background
	@echo "🚀 Starting Radio Calico in development mode (background)..."
	@docker-compose -f docker-compose.dev.yml up --build -d

dev-stop: ## Stop development environment
	@echo "🛑 Stopping development environment..."
	@docker-compose -f docker-compose.dev.yml down

dev-restart: ## Restart development environment
	@echo "🔄 Restarting development environment..."
	@docker-compose -f docker-compose.dev.yml restart

dev-logs: ## Show development logs
	@echo "📋 Development logs:"
	@docker-compose -f docker-compose.dev.yml logs -f

##@ Production
prod: ## Start production environment
	@echo "🏭 Starting Radio Calico in production mode..."
	@docker-compose -f docker-compose.prod.yml up --build

prod-daemon: ## Start production environment in background
	@echo "🏭 Starting Radio Calico in production mode (background)..."
	@docker-compose -f docker-compose.prod.yml up --build -d

prod-stop: ## Stop production environment
	@echo "🛑 Stopping production environment..."
	@docker-compose -f docker-compose.prod.yml down

prod-restart: ## Restart production environment
	@echo "🔄 Restarting production environment..."
	@docker-compose -f docker-compose.prod.yml restart

prod-logs: ## Show production logs
	@echo "📋 Production logs:"
	@docker-compose -f docker-compose.prod.yml logs -f

##@ Testing
test: ## Run all tests
	@echo "🧪 Running all tests..."
	@cd tests && npm test

test-watch: ## Run tests in watch mode
	@echo "🔍 Running tests in watch mode..."
	@cd tests && npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "📊 Running tests with coverage..."
	@cd tests && npm run test:coverage

test-backend: ## Run backend-only tests
	@echo "🔧 Running backend tests..."
	@cd tests && npm run test:backend

test-frontend: ## Run frontend-only tests
	@echo "🎨 Running frontend tests..."
	@cd tests && npm run test:frontend

test-integration: ## Run integration tests
	@echo "🔗 Running integration tests..."
	@cd tests && npm run test:integration

##@ Database
db-init: ## Initialize database tables
	@echo "🗄️ Initializing database..."
	@npm run init-db

db-backup: ## Backup production database
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker exec radiocalico-postgres pg_dump -U postgres radiocalico > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

db-backup-dev: ## Backup development database
	@echo "💾 Creating development database backup..."
	@mkdir -p backups
	@docker exec radiocalico-postgres-dev pg_dump -U postgres radiocalico_dev > backups/backup_dev_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Development backup created in backups/ directory"

##@ Utilities
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	@npm install
	@cd tests && npm install

clean: ## Clean up containers, volumes, and cache
	@echo "🧹 Cleaning up..."
	@docker-compose -f docker-compose.dev.yml down -v --remove-orphans || true
	@docker-compose -f docker-compose.prod.yml down -v --remove-orphans || true
	@docker system prune -f
	@echo "✅ Cleanup complete"

logs: ## View application logs
	@echo "📋 Recent application logs:"
	@ls -la logs/ 2>/dev/null || echo "No logs directory found"
	@echo ""
	@if [ -f logs/app-$$(date +%Y-%m-%d).log ]; then \
		echo "📄 Today's logs:"; \
		tail -20 logs/app-$$(date +%Y-%m-%d).log; \
	else \
		echo "No logs for today found"; \
	fi

logs-errors: ## View error logs only
	@echo "❌ Error logs:"
	@if [ -f logs/error.log ]; then \
		tail -20 logs/error.log; \
	else \
		echo "No error logs found"; \
	fi

health: ## Check application health
	@echo "🏥 Checking application health..."
	@echo "Development (port 3000):"
	@curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Development server not responding"
	@echo ""
	@echo "Production (port 80):"
	@curl -s http://localhost/health | jq . 2>/dev/null || echo "Production server not responding"

status: ## Show container status
	@echo "📊 Container Status:"
	@echo ""
	@echo "Development containers:"
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || echo "No development containers"
	@echo ""
	@echo "Production containers:"
	@docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo "No production containers"

##@ Quick Actions
quick-dev: ## Quick start: development with logs
	@make dev-daemon
	@sleep 5
	@make health
	@make dev-logs

quick-test: ## Quick test: run tests and show results
	@make install
	@make test
	@echo "✅ Tests completed"

quick-prod: ## Quick start: production with health check
	@make prod-daemon
	@sleep 10
	@make health
	@echo "✅ Production environment ready"

##@ Development Tools
shell-dev: ## Open shell in development container
	@echo "🐚 Opening shell in development container..."
	@docker-compose -f docker-compose.dev.yml exec radiocalico-dev /bin/sh

shell-prod: ## Open shell in production container
	@echo "🐚 Opening shell in production container..."
	@docker-compose -f docker-compose.prod.yml exec radiocalico-prod /bin/sh

shell-db: ## Open psql shell to development database
	@echo "🗄️ Opening database shell..."
	@docker-compose -f docker-compose.dev.yml exec postgres-dev psql -U postgres -d radiocalico_dev

rebuild: ## Rebuild containers without cache
	@echo "🔨 Rebuilding containers..."
	@docker-compose -f docker-compose.dev.yml build --no-cache
	@docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "✅ Rebuild complete"

##@ Information
version: ## Show version information
	@echo "📋 Radio Calico Version Information:"
	@echo "Application: $$(grep '"version"' package.json | cut -d'"' -f4)"
	@echo "Node.js: $$(node --version 2>/dev/null || echo 'Not installed locally')"
	@echo "Docker: $$(docker --version 2>/dev/null || echo 'Not installed')"
	@echo "Make: $$(make --version | head -1)"

env: ## Show environment configuration
	@echo "🌍 Environment Configuration:"
	@echo "NODE_ENV: $${NODE_ENV:-development}"
	@echo "Current directory: $$(pwd)"
	@echo "Docker Compose files:"
	@ls -la docker-compose*.yml
