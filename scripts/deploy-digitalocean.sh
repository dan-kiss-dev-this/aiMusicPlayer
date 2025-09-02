#!/bin/bash

# DigitalOcean App Platform Deployment Script
# This script helps deploy Radio Calico to DigitalOcean App Platform

set -e

echo "🚀 Radio Calico - DigitalOcean App Platform Deployment"
echo "=================================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI is not installed. Please install it first:"
    echo "   https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean. Please run:"
    echo "   doctl auth init"
    exit 1
fi

# Check GitHub authentication for App Platform
echo "🔗 Checking GitHub integration..."
if ! doctl apps list &> /dev/null; then
    echo "⚠️  Unable to access App Platform. This might be due to:"
    echo "   1. GitHub integration not set up"
    echo "   2. Insufficient permissions"
    echo "   3. First-time setup required"
    echo ""
    echo "📋 To set up GitHub integration:"
    echo "   1. Go to https://cloud.digitalocean.com/apps"
    echo "   2. Click 'Create App'"
    echo "   3. Connect your GitHub account"
    echo "   4. Then return here to deploy"
    echo ""
fi

# Function to create or update app
deploy_app() {
    local app_spec_file="$1"
    local app_name="radiocalico"
    
    echo "📋 Checking if app exists..."
    
    # Try to list apps, catch GitHub authentication error
    if ! doctl apps list &> /dev/null; then
        echo "❌ Cannot access DigitalOcean App Platform."
        echo "   This usually means GitHub integration is not set up."
        echo ""
        echo "🔧 To fix this:"
        echo "   1. Run: ./scripts/setup-github-integration.sh"
        echo "   2. Or visit: https://cloud.digitalocean.com/apps"
        echo "   3. Connect your GitHub account first"
        echo ""
        echo "🐳 Alternative: Use Docker deployment with .do/app-docker.yaml"
        exit 1
    fi
    
    echo "🗄️  Checking database requirements..."
    # Note: DigitalOcean will create the database automatically with the app
    
    # Check if app already exists
    if doctl apps list --format Name --no-header | grep -q "^${app_name}$"; then
        echo "🔄 App '${app_name}' exists. Updating..."
        
        # Get app ID
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${app_name}" | awk '{print $1}')
        
        # Update the app
        doctl apps update "${APP_ID}" --spec "${app_spec_file}"
        echo "✅ App updated successfully!"
        
        # Get app URL
        APP_URL=$(doctl apps get "${APP_ID}" --format LiveURL --no-header)
        echo "🌐 Your app is available at: ${APP_URL}"
        
    else
        echo "🆕 Creating new app '${app_name}'..."
        
        # Create new app
        doctl apps create --spec "${app_spec_file}"
        echo "✅ App created successfully!"
        
        # Wait a moment for the app to be ready
        sleep 5
        
        # Get the new app info
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${app_name}" | awk '{print $1}')
        if [ -n "$APP_ID" ]; then
            APP_URL=$(doctl apps get "${APP_ID}" --format LiveURL --no-header)
            echo "🌐 Your app will be available at: ${APP_URL}"
        fi
    fi
}

# Function to check deployment status
check_deployment() {
    local app_name="radiocalico"
    
    echo "📊 Checking deployment status..."
    
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${app_name}" | awk '{print $1}')
    
    if [ -n "$APP_ID" ]; then
        echo "App ID: ${APP_ID}"
        
        # Get deployment status
        doctl apps get "${APP_ID}" --format Status,LiveURL
        
        echo ""
        echo "📝 Recent deployments:"
        doctl apps list-deployments "${APP_ID}" --format ID,Phase,CreatedAt | head -5
    else
        echo "❌ App not found"
    fi
}

# Function to view logs
view_logs() {
    local app_name="radiocalico"
    
    echo "📝 Fetching recent logs..."
    
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "${app_name}" | awk '{print $1}')
    
    if [ -n "$APP_ID" ]; then
        doctl apps logs "${APP_ID}" --follow
    else
        echo "❌ App not found"
    fi
}

# Main menu
case "${1:-}" in
    deploy)
        echo "🚀 Starting deployment..."
        if [ -f ".do/app.yaml" ]; then
            deploy_app ".do/app.yaml"
        else
            echo "❌ App spec file (.do/app.yaml) not found!"
            echo "   Please make sure you're in the project root directory."
            exit 1
        fi
        ;;
    deploy-simple)
        echo "🚀 Starting simple deployment (without complex database setup)..."
        if [ -f ".do/app-simple.yaml" ]; then
            deploy_app ".do/app-simple.yaml"
        else
            echo "❌ Simple app spec file (.do/app-simple.yaml) not found!"
            exit 1
        fi
        ;;
    setup)
        echo "🔧 Setting up GitHub integration..."
        if [ -f "scripts/setup-github-integration.sh" ]; then
            ./scripts/setup-github-integration.sh
        else
            echo "❌ Setup script not found!"
        fi
        ;;
    status)
        check_deployment
        ;;
    logs)
        view_logs
        ;;
    *)
        echo "Usage: $0 {deploy|deploy-simple|setup|status|logs}"
        echo ""
        echo "Commands:"
        echo "  setup        - Set up GitHub integration (required for first deployment)"
        echo "  deploy       - Deploy or update the app on DigitalOcean"
        echo "  deploy-simple - Deploy with simplified database configuration"
        echo "  status       - Check deployment status"
        echo "  logs         - View application logs"
        echo ""
        echo "Examples:"
        echo "  $0 setup         # Set up GitHub integration first"
        echo "  $0 deploy-simple # Deploy with basic database setup (recommended)"
        echo "  $0 deploy        # Deploy the full app"
        echo "  $0 status        # Check if app is running"
        echo "  $0 logs          # View real-time logs"
        echo ""
        echo "Prerequisites:"
        echo "  1. Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        echo "  2. Authenticate: doctl auth init"
        echo "  3. Set up GitHub integration: $0 setup"
        echo "  4. Run from project root directory"
        exit 1
        ;;
esac
