# Multi-stage Dockerfile for Radio Calico Music Player
# Supports both development and production builds

# Base Node.js image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S radiocalico -u 1001

# Change ownership of the app directory
RUN chown -R radiocalico:nodejs /app
USER radiocalico

# Expose development port
EXPOSE 3000

# Start development server with nodemon for hot reload
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S radiocalico -u 1001

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R radiocalico:nodejs /app

# Switch to non-root user
USER radiocalico

# Expose production port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start production server
CMD ["npm", "start"]
