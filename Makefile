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

##@ Security
security: ## Run comprehensive security scan
	@echo "🛡️ Running comprehensive security scan..."
	@./scripts/security-scan.sh

security-audit: ## Run npm audit on main dependencies
	@echo "🔍 Running security audit on main dependencies..."
	@npm run audit

security-audit-fix: ## Automatically fix security vulnerabilities
	@echo "🔧 Fixing security vulnerabilities..."
	@npm run audit:fix
	@cd tests && npm run security:fix || true
	@echo "✅ Security fixes applied"

security-audit-tests: ## Run npm audit on test dependencies
	@echo "🔍 Running security audit on test dependencies..."
	@cd tests && npm run security:audit

security-check-deps: ## Check for outdated dependencies
	@echo "📦 Checking for outdated dependencies..."
	@echo "Main dependencies:"
	@npm run security:check-deps
	@echo ""
	@echo "Test dependencies:"
	@cd tests && npm run security:deps

security-report: ## Generate detailed security reports
	@echo "📋 Generating security reports..."
	@npm run security:report
	@cd tests && npm run security:report
	@echo "✅ Security reports generated"

security-docker: ## Scan Docker images for vulnerabilities (requires trivy)
	@echo "🐳 Scanning Docker images for security vulnerabilities..."
	@if command -v docker >/dev/null 2>&1; then \
		if docker image inspect aimusicplayer-radiocalico-dev >/dev/null 2>&1; then \
			echo "Scanning development image..."; \
			docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image aimusicplayer-radiocalico-dev || echo "⚠️ Install trivy for Docker scanning"; \
		else \
			echo "⚠️ Development image not found"; \
		fi; \
		if docker image inspect aimusicplayer-radiocalico >/dev/null 2>&1; then \
			echo "Scanning production image..."; \
			docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image aimusicplayer-radiocalico || echo "⚠️ Install trivy for Docker scanning"; \
		else \
			echo "⚠️ Production image not found"; \
		fi; \
	else \
		echo "⚠️ Docker not available"; \
	fi

security-quick: ## Quick security check (audit + outdated packages)
	@echo "⚡ Quick security check..."
	@make security-audit || true
	@make security-check-deps
	@echo "✅ Quick security check completed"

security-ci: ## Run security audit for CI/CD pipeline
	@echo "🤖 Running CI security audit..."
	@./scripts/ci-security-audit.sh

security-fix-all: ## Fix all security issues automatically
	@echo "🔧 Fixing all security issues..."
	@npm run audit:fix
	@cd tests && npm run security:fix || true
	@npm update
	@cd tests && npm update || true
	@echo "✅ All security fixes applied"

security-clean: ## Clean old security reports
	@echo "🧹 Cleaning old security reports..."
	@find security-reports -name "*.txt" -mtime +30 -delete 2>/dev/null || true
	@find security-reports -name "*.json" -mtime +30 -delete 2>/dev/null || true
	@echo "✅ Old security reports cleaned"

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

quick-security: ## Quick security scan and fix
	@make security-quick
	@make security-audit-fix
	@echo "✅ Security scan and fixes completed"

quick-prod: ## Quick start: production with health check
	@make prod-daemon
	@sleep 10
	@make health
	@echo "✅ Production environment ready"

quick-full-check: ## Full check: tests, security, and health
	@echo "🔄 Running comprehensive system check..."
	@make install
	@make test
	@make security-quick
	@make health
	@echo "✅ Full system check completed"

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
