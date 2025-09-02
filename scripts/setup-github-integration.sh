#!/bin/bash

# DigitalOcean App Platform Deployment Script - GitHub Setup
# This script helps set up GitHub integration for DigitalOcean App Platform

set -e

echo "🔗 Radio Calico - GitHub Integration Setup"
echo "=========================================="

# Function to check GitHub integration
check_github_integration() {
    echo "🔍 Checking GitHub integration status..."
    
    # Try to list apps to see if we have access
    if doctl apps list &> /dev/null; then
        echo "✅ GitHub integration appears to be working"
        return 0
    else
        echo "❌ GitHub integration needed"
        return 1
    fi
}

# Function to setup GitHub integration
setup_github_integration() {
    echo "🚀 Setting up GitHub integration..."
    echo ""
    echo "To connect your GitHub account to DigitalOcean App Platform:"
    echo ""
    echo "1. 🌐 Open your browser and go to:"
    echo "   https://cloud.digitalocean.com/apps"
    echo ""
    echo "2. 🔗 Click 'Create App' or 'GitHub' in the source selection"
    echo ""
    echo "3. 🔐 Authorize DigitalOcean to access your GitHub account"
    echo ""
    echo "4. 📂 Select your repository: dan-kiss-dev-this/aiMusicPlayer"
    echo ""
    echo "5. ⚙️  Use the app.yaml configuration (already created)"
    echo ""
    echo "6. 🚀 Deploy your app!"
    echo ""
    echo "After setup, you can use the automated deployment script."
}

# Function to create app via web interface
create_app_web() {
    echo "🌐 Creating app via DigitalOcean web interface..."
    echo ""
    echo "Since GitHub integration isn't set up yet, let's use the web interface:"
    echo ""
    echo "1. 🌐 Open: https://cloud.digitalocean.com/apps"
    echo ""
    echo "2. 🆕 Click 'Create App'"
    echo ""
    echo "3. 📂 Choose 'GitHub' as source"
    echo ""
    echo "4. 🔗 Connect your GitHub account when prompted"
    echo ""
    echo "5. 📋 Select repository: dan-kiss-dev-this/aiMusicPlayer"
    echo ""
    echo "6. 🌳 Choose branch: main"
    echo ""
    echo "7. ⚙️  DigitalOcean will detect the .do/app.yaml configuration"
    echo ""
    echo "8. 💰 Review pricing (Basic plan: ~$20/month total)"
    echo ""
    echo "9. 🚀 Click 'Create Resources'"
    echo ""
    echo "Your app will be built and deployed automatically!"
    echo ""
    echo "📝 After creation, you can manage it with:"
    echo "   doctl apps list"
    echo "   doctl apps get APP_ID"
}

# Function to show alternative deployment methods
show_alternatives() {
    echo "🔄 Alternative Deployment Methods"
    echo "================================="
    echo ""
    echo "If you prefer not to use GitHub integration:"
    echo ""
    echo "1. 🐳 Docker Deployment:"
    echo "   - Build Docker image: docker build -t radiocalico ."
    echo "   - Push to Docker Hub or DigitalOcean Container Registry"
    echo "   - Use .do/app-docker.yaml for deployment"
    echo ""
    echo "2. 📦 Direct Upload:"
    echo "   - Create a tarball of your project"
    echo "   - Upload via DigitalOcean web interface"
    echo "   - Configure build settings manually"
    echo ""
    echo "3. 🔄 CI/CD Pipeline:"
    echo "   - Use GitHub Actions (already configured)"
    echo "   - Set up DigitalOcean API token as GitHub secret"
    echo "   - Automatic deployment on push to main"
}

# Main logic
echo "Checking current status..."

if check_github_integration; then
    echo "✅ GitHub integration is working!"
    echo "You can now use: ./scripts/deploy-digitalocean.sh deploy"
else
    echo ""
    echo "❌ GitHub integration is required for App Platform deployment."
    echo ""
    echo "Choose an option:"
    echo "1. Set up GitHub integration (recommended)"
    echo "2. Use web interface for first-time setup"
    echo "3. See alternative deployment methods"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            setup_github_integration
            ;;
        2)
            create_app_web
            ;;
        3)
            show_alternatives
            ;;
        *)
            echo "Invalid choice. Please run the script again."
            ;;
    esac
fi

echo ""
echo "🎵 Need help? Check the deployment guide:"
echo "   docs/DIGITALOCEAN_DEPLOYMENT.md"
