# DigitalOcean App Platform Deployment Guide

## Quick Start

Your Radio Calico app is now ready to deploy on DigitalOcean App Platform! Here's everything you need:

### 🏗️ What's Been Created

1. **`.do/app.yaml`** - DigitalOcean App Platform configuration
2. **`scripts/deploy-digitalocean.sh`** - Automated deployment script
3. **Environment variables** - Pre-configured for production
4. **Database integration** - PostgreSQL cluster ready

## 📋 Prerequisites

### 1. Install DigitalOcean CLI
```bash
# macOS (using Homebrew)
brew install doctl

# Or download from: https://docs.digitalocean.com/reference/doctl/how-to/install/
```

### 2. Authenticate with DigitalOcean
```bash
doctl auth init
```
Follow the prompts to connect your DigitalOcean account.

### 3. Verify Authentication
```bash
doctl account get
```

## 🚀 Deployment Options

### Option 1: One-Click Deployment (Recommended)

```bash
# Deploy your app
./scripts/deploy-digitalocean.sh deploy

# Check deployment status
./scripts/deploy-digitalocean.sh status

# View logs
./scripts/deploy-digitalocean.sh logs
```

### Option 2: Manual Deployment

```bash
# Create new app
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps list  # Get your app ID
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## 🔧 Configuration Details

### App Specification (`.do/app.yaml`)
- **Service**: Node.js web service on port 3000
- **Database**: PostgreSQL 14 cluster
- **Scaling**: 1-3 instances based on load
- **Health checks**: Built-in monitoring
- **Environment**: Production-optimized

### Environment Variables Required
Add these in your DigitalOcean dashboard or via GitHub secrets:

```bash
DATABASE_URL=postgresql://user:pass@host:port/db  # Auto-provided by DO
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://your-domain.ondigitalocean.app
NODE_ENV=production
```

## 🔒 Secrets Management

### Using DigitalOcean Dashboard
1. Go to Apps → Your App → Settings → Environment Variables
2. Add each variable with appropriate values
3. Mark sensitive variables as "encrypted"

### Using GitHub Integration
If deploying via GitHub:
1. Add secrets to your GitHub repository
2. Update `.github/workflows/deploy.yml` 
3. Secrets will be automatically synced

## 📊 Monitoring & Management

### Check App Status
```bash
doctl apps list
doctl apps get YOUR_APP_ID
```

### View Logs
```bash
# Real-time logs
doctl apps logs YOUR_APP_ID --follow

# Historical logs
doctl apps logs YOUR_APP_ID --type build
doctl apps logs YOUR_APP_ID --type deploy
```

### Scale Your App
```bash
# Update instance count in .do/app.yaml
# Then redeploy:
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## 🌐 Custom Domain Setup

### 1. Add Domain in DigitalOcean
```bash
doctl apps update-domain YOUR_APP_ID --domain your-domain.com
```

### 2. Update DNS Records
Point your domain to DigitalOcean's nameservers or add CNAME:
```
CNAME www your-app-name.ondigitalocean.app
```

### 3. Update Environment Variables
```bash
CORS_ORIGIN=https://your-domain.com
```

## 🛠️ Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs
doctl apps logs YOUR_APP_ID --type build

# Common fixes:
# 1. Verify package.json scripts
# 2. Check Node.js version compatibility
# 3. Ensure all dependencies are listed
```

#### Database Connection Issues
```bash
# Verify database cluster is running
doctl databases list

# Check connection string format
# Should be: postgresql://user:pass@host:port/db?sslmode=require
```

#### Environment Variable Problems
```bash
# List current variables
doctl apps get YOUR_APP_ID --format Spec

# Update variables via dashboard or CLI
```

### Performance Optimization

#### Enable Caching
```yaml
# Add to .do/app.yaml
envs:
- key: ENABLE_CACHE
  value: "true"
```

#### Optimize Build
```yaml
# Pre-build optimizations
build_command: |
  npm ci --only=production
  npm run build
```

## 🔄 CI/CD Integration

Your app includes GitHub Actions integration:

### Automatic Deployment
1. Push to `main` branch
2. GitHub Actions builds and tests
3. Auto-deploys to DigitalOcean
4. Health checks verify deployment

### Manual Deployment
```bash
# Trigger from GitHub Actions
gh workflow run deploy.yml
```

## 💰 Cost Optimization

### Instance Sizing
- **Basic**: $5/month (512MB RAM, 1 vCPU)
- **Professional**: $12/month (1GB RAM, 1 vCPU)
- **Pro+**: $24/month (2GB RAM, 2 vCPU)

### Database Costs
- **Basic**: $15/month (1GB RAM, 1 vCPU, 10GB storage)
- **Standard**: $30/month (2GB RAM, 1 vCPU, 25GB storage)

### Scaling Strategy
```yaml
# Auto-scale based on usage
instance_count: 1
instance_size_slug: basic
autoscaling:
  min_instance_count: 1
  max_instance_count: 3
```

## 📞 Support

### DigitalOcean Resources
- [App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [Community Tutorials](https://www.digitalocean.com/community/tutorials)
- [Support Tickets](https://cloud.digitalocean.com/support)

### App-Specific Help
- Check logs: `./scripts/deploy-digitalocean.sh logs`
- Monitor status: `./scripts/deploy-digitalocean.sh status`
- GitHub Issues: Create issue in your repository

## 🎯 Next Steps

1. **Deploy**: Run `./scripts/deploy-digitalocean.sh deploy`
2. **Verify**: Check your app at the provided URL
3. **Configure**: Add custom domain if needed
4. **Monitor**: Set up alerts and monitoring
5. **Scale**: Adjust resources based on usage

Your Radio Calico app is now ready for production on DigitalOcean! 🎵
