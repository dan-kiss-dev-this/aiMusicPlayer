# Radio Calico - System Architecture

This document provides a comprehensive overview of the Radio Calico system architecture, including component interactions, data flows, and deployment strategies.

## High-Level Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Browser]
        PWA[Progressive Web App]
    end

    subgraph "CDN & Load Balancing"
        CF[CloudFront CDN]
        LB[Load Balancer]
    end

    subgraph "Application Layer"
        NGINX[nginx Reverse Proxy]
        APP[Node.js Express API]
        HLS[HLS.js Stream Handler]
    end

    subgraph "Data Layer"
        DB[(PostgreSQL Database)]
        REDIS[(Redis Cache)]
        LOGS[Winston Logs]
    end

    subgraph "External Services"
        STREAM[Live Audio Stream]
        METADATA[Metadata Service]
        AUTH[JWT Auth Service]
    end

    subgraph "Infrastructure"
        DOCKER[Docker Containers]
        CI[GitHub Actions CI/CD]
        MONITOR[Health Monitoring]
    end

    WEB --> CF
    MOBILE --> CF
    PWA --> CF
    CF --> LB
    LB --> NGINX
    NGINX --> APP
    APP --> DB
    APP --> REDIS
    APP --> LOGS
    HLS --> STREAM
    APP --> AUTH
    APP --> METADATA
    DOCKER --> APP
    CI --> DOCKER
    MONITOR --> APP
```

## Detailed Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        HTML[HTML5 Interface]
        CSS[CSS Grid/Flexbox]
        JS[Vanilla JavaScript]
        HLS_CLIENT[HLS.js Client]
        SW[Service Worker]
    end

    subgraph "Backend API Services"
        AUTH_API[Authentication API]
        SONGS_API[Songs API]
        RATINGS_API[Ratings API]
        PLAYLISTS_API[Playlists API]
        HEALTH_API[Health Check API]
    end

    subgraph "Core Services"
        JWT_SERVICE[JWT Token Service]
        BCRYPT_SERVICE[Password Hashing]
        DB_POOL[Database Pool]
        LOGGER_SERVICE[Winston Logger]
        METADATA_SERVICE[Song Detection]
    end

    subgraph "Data Models"
        USER_MODEL[User Model]
        SONG_MODEL[Song Model]
        RATING_MODEL[Rating Model]
        PLAYLIST_MODEL[Playlist Model]
    end

    HTML --> JS
    JS --> HLS_CLIENT
    JS --> SW
    JS --> AUTH_API
    JS --> SONGS_API
    JS --> RATINGS_API
    JS --> PLAYLISTS_API

    AUTH_API --> JWT_SERVICE
    AUTH_API --> BCRYPT_SERVICE
    AUTH_API --> USER_MODEL

    SONGS_API --> SONG_MODEL
    RATINGS_API --> RATING_MODEL
    PLAYLISTS_API --> PLAYLIST_MODEL

    USER_MODEL --> DB_POOL
    SONG_MODEL --> DB_POOL
    RATING_MODEL --> DB_POOL
    PLAYLIST_MODEL --> DB_POOL

    ALL_SERVICES --> LOGGER_SERVICE
    HLS_CLIENT --> METADATA_SERVICE
```

## Database Architecture

```mermaid
erDiagram
    USERS ||--o{ SONGS : owns
    USERS ||--o{ PLAYLISTS : creates
    USERS ||--o{ RATINGS : submits
    PLAYLISTS ||--o{ PLAYLIST_SONGS : contains
    SONGS ||--o{ PLAYLIST_SONGS : included_in
    SONGS ||--o{ RATINGS : rated

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        string first_name
        string last_name
        timestamp created_at
        timestamp updated_at
        boolean is_verified
        timestamp last_login
    }

    SONGS {
        int id PK
        string title
        string artist
        string album
        int duration
        string file_path
        int user_id FK
        timestamp created_at
        timestamp updated_at
    }

    RATINGS {
        int id PK
        int user_id FK
        string song_title
        string song_artist
        int rating
        timestamp stream_timestamp
        timestamp created_at
        timestamp updated_at
    }

    PLAYLISTS {
        int id PK
        int user_id FK
        string name
        text description
        boolean is_public
        timestamp created_at
        timestamp updated_at
    }

    PLAYLIST_SONGS {
        int id PK
        int playlist_id FK
        int song_id FK
        int position
        timestamp added_at
    }
```

## Container Architecture

```mermaid
graph TB
    subgraph "Docker Network: radiocalico-network"
        subgraph "Web Tier"
            NGINX_CONTAINER[nginx Container<br/>Port 80/443<br/>Alpine Linux]
        end

        subgraph "Application Tier"
            APP_CONTAINER[Node.js Container<br/>Port 3000<br/>Express API<br/>HLS Integration]
        end

        subgraph "Database Tier"
            DB_CONTAINER[PostgreSQL Container<br/>Port 5432<br/>Data Persistence]
        end

        subgraph "Cache Tier"
            REDIS_CONTAINER[Redis Container<br/>Port 6379<br/>Session Storage]
        end

        subgraph "Monitoring"
            HEALTH_CONTAINER[Health Check<br/>Container Health<br/>Log Aggregation]
        end
    end

    subgraph "External"
        VOLUME_DATA[(Docker Volumes<br/>- postgres_data<br/>- app_logs<br/>- nginx_logs)]
        HOST_NETWORK[Host Network<br/>Docker Host]
    end

    NGINX_CONTAINER --> APP_CONTAINER
    APP_CONTAINER --> DB_CONTAINER
    APP_CONTAINER --> REDIS_CONTAINER
    HEALTH_CONTAINER --> APP_CONTAINER
    HEALTH_CONTAINER --> DB_CONTAINER

    DB_CONTAINER --> VOLUME_DATA
    APP_CONTAINER --> VOLUME_DATA
    NGINX_CONTAINER --> VOLUME_DATA

    NGINX_CONTAINER --> HOST_NETWORK
```

## API Request Flow

```mermaid
sequenceDiagram
    participant CLIENT as Web Client
    participant NGINX as nginx Proxy
    participant APP as Express API
    participant AUTH as JWT Service
    participant DB as PostgreSQL
    participant LOGGER as Winston Logger

    CLIENT->>NGINX: HTTP Request
    NGINX->>APP: Forward Request
    
    alt Authentication Required
        APP->>AUTH: Validate JWT Token
        AUTH-->>APP: Token Valid/Invalid
        
        alt Token Invalid
            APP-->>NGINX: 401 Unauthorized
            NGINX-->>CLIENT: 401 Response
        end
    end

    APP->>DB: Database Query
    DB-->>APP: Query Result
    
    APP->>LOGGER: Log Request/Response
    
    APP-->>NGINX: JSON Response
    NGINX-->>CLIENT: HTTP Response
```

## Live Streaming Architecture

```mermaid
graph LR
    subgraph "Audio Source"
        AUDIO_INPUT[Live Audio Input]
        ENCODER[Audio Encoder<br/>24-bit/48kHz]
    end

    subgraph "CDN Distribution"
        ORIGIN[Origin Server]
        CF_CDN[CloudFront CDN<br/>Global Distribution]
        EDGE[Edge Locations]
    end

    subgraph "Client Playback"
        HLS_MANIFEST[HLS Playlist<br/>(.m3u8)]
        SEGMENTS[Audio Segments<br/>(.ts files)]
        PLAYER[HLS.js Player]
        METADATA_EXTRACTOR[Metadata Extractor]
    end

    subgraph "Metadata Flow"
        SONG_DETECTION[Song Detection]
        RATING_SYSTEM[Real-time Rating]
        HISTORY_TRACKER[Play History]
    end

    AUDIO_INPUT --> ENCODER
    ENCODER --> ORIGIN
    ORIGIN --> CF_CDN
    CF_CDN --> EDGE
    EDGE --> HLS_MANIFEST
    HLS_MANIFEST --> SEGMENTS
    SEGMENTS --> PLAYER
    PLAYER --> METADATA_EXTRACTOR
    METADATA_EXTRACTOR --> SONG_DETECTION
    SONG_DETECTION --> RATING_SYSTEM
    SONG_DETECTION --> HISTORY_TRACKER
```

## Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Network Security"
            FIREWALL[Firewall Rules]
            SSL[SSL/TLS Encryption]
            RATE_LIMIT[Rate Limiting]
        end

        subgraph "Application Security"
            JWT_AUTH[JWT Authentication]
            BCRYPT[Password Hashing]
            INPUT_VALIDATION[Input Validation]
            SQL_INJECTION[SQL Injection Prevention]
        end

        subgraph "Infrastructure Security"
            DOCKER_SECURITY[Container Security]
            SECRET_MANAGEMENT[Secret Management]
            VULNERABILITY_SCAN[Vulnerability Scanning]
        end

        subgraph "Monitoring & Logging"
            SECURITY_LOGS[Security Event Logs]
            AUDIT_TRAIL[Audit Trail]
            INTRUSION_DETECTION[Intrusion Detection]
        end
    end

    subgraph "External Security"
        GITHUB_SECURITY[GitHub Security Scanning]
        NPM_AUDIT[npm Audit]
        DEPENDENCY_CHECK[Dependency Checking]
    end

    FIREWALL --> SSL
    SSL --> RATE_LIMIT
    RATE_LIMIT --> JWT_AUTH
    JWT_AUTH --> BCRYPT
    BCRYPT --> INPUT_VALIDATION
    INPUT_VALIDATION --> SQL_INJECTION

    DOCKER_SECURITY --> SECRET_MANAGEMENT
    SECRET_MANAGEMENT --> VULNERABILITY_SCAN

    SECURITY_LOGS --> AUDIT_TRAIL
    AUDIT_TRAIL --> INTRUSION_DETECTION

    GITHUB_SECURITY --> NPM_AUDIT
    NPM_AUDIT --> DEPENDENCY_CHECK
```

## CI/CD Pipeline Architecture

```mermaid
graph LR
    subgraph "Source Control"
        GITHUB[GitHub Repository]
        PR[Pull Request]
        MAIN[Main Branch]
    end

    subgraph "GitHub Actions CI/CD"
        PR_CHECK[PR Security Check]
        INTEGRATION_TEST[Integration Tests]
        SECURITY_SCAN[Security Scan]
        DOCKER_BUILD[Docker Build]
        CONTAINER_SECURITY[Container Security]
        DEPLOY_TEST[Deployment Test]
    end

    subgraph "Quality Gates"
        LINT[Code Linting]
        UNIT_TESTS[Unit Tests]
        COVERAGE[Coverage Check]
        AUDIT[Security Audit]
    end

    subgraph "Deployment"
        DEV_DEPLOY[Development Deploy]
        STAGING_DEPLOY[Staging Deploy]
        PROD_DEPLOY[Production Deploy]
    end

    subgraph "Monitoring"
        HEALTH_CHECK[Health Monitoring]
        LOG_ANALYSIS[Log Analysis]
        PERFORMANCE[Performance Metrics]
    end

    GITHUB --> PR
    PR --> PR_CHECK
    PR_CHECK --> INTEGRATION_TEST
    INTEGRATION_TEST --> SECURITY_SCAN
    SECURITY_SCAN --> DOCKER_BUILD
    DOCKER_BUILD --> CONTAINER_SECURITY
    CONTAINER_SECURITY --> DEPLOY_TEST

    PR --> LINT
    LINT --> UNIT_TESTS
    UNIT_TESTS --> COVERAGE
    COVERAGE --> AUDIT

    MAIN --> DEV_DEPLOY
    DEV_DEPLOY --> STAGING_DEPLOY
    STAGING_DEPLOY --> PROD_DEPLOY

    PROD_DEPLOY --> HEALTH_CHECK
    HEALTH_CHECK --> LOG_ANALYSIS
    LOG_ANALYSIS --> PERFORMANCE
```

## Performance Architecture

```mermaid
graph TB
    subgraph "Frontend Performance"
        CODE_SPLITTING[Code Splitting<br/>Core: 15KB<br/>Lazy: 100KB]
        LAZY_LOADING[Lazy Loading<br/>Images & Components]
        SERVICE_WORKER[Service Worker<br/>Caching Strategy]
        WEB_VITALS[Core Web Vitals<br/>Monitoring]
    end

    subgraph "Backend Performance"
        CONNECTION_POOL[DB Connection Pool<br/>Max: 10 connections]
        QUERY_OPTIMIZATION[Query Optimization<br/>Indexes & Prepared Statements]
        RESPONSE_CACHING[Response Caching<br/>Redis TTL]
        API_RATE_LIMITING[API Rate Limiting<br/>100 req/min/user]
    end

    subgraph "Infrastructure Performance"
        CDN_CACHING[CDN Caching<br/>Static Assets]
        GZIP_COMPRESSION[Gzip Compression<br/>API Responses]
        HTTP2[HTTP/2 Support<br/>Multiplexing]
        LOAD_BALANCING[Load Balancing<br/>Multiple Instances]
    end

    subgraph "Monitoring"
        PERFORMANCE_METRICS[Performance Metrics<br/>Response Times]
        ERROR_TRACKING[Error Tracking<br/>Exception Monitoring]
        RESOURCE_MONITORING[Resource Monitoring<br/>CPU/Memory/Disk]
    end

    CODE_SPLITTING --> LAZY_LOADING
    LAZY_LOADING --> SERVICE_WORKER
    SERVICE_WORKER --> WEB_VITALS

    CONNECTION_POOL --> QUERY_OPTIMIZATION
    QUERY_OPTIMIZATION --> RESPONSE_CACHING
    RESPONSE_CACHING --> API_RATE_LIMITING

    CDN_CACHING --> GZIP_COMPRESSION
    GZIP_COMPRESSION --> HTTP2
    HTTP2 --> LOAD_BALANCING

    PERFORMANCE_METRICS --> ERROR_TRACKING
    ERROR_TRACKING --> RESOURCE_MONITORING
```

## Data Flow Architecture

```mermaid
graph TD
    subgraph "User Interactions"
        LOGIN[User Login]
        STREAM_LISTEN[Listen to Stream]
        RATE_SONG[Rate Song]
        MANAGE_PLAYLIST[Manage Playlist]
    end

    subgraph "Authentication Flow"
        JWT_GENERATE[Generate JWT]
        TOKEN_VALIDATE[Validate Token]
        SESSION_MANAGE[Manage Session]
    end

    subgraph "Audio Stream Flow"
        HLS_REQUEST[HLS Request]
        METADATA_EXTRACT[Extract Metadata]
        SONG_DETECT[Detect Song]
        HISTORY_UPDATE[Update History]
    end

    subgraph "Rating Flow"
        RATING_VALIDATE[Validate Rating]
        RATING_STORE[Store Rating]
        RATING_AGGREGATE[Aggregate Ratings]
        RATING_DISPLAY[Display Ratings]
    end

    subgraph "Data Persistence"
        DB_WRITE[Database Write]
        DB_READ[Database Read]
        CACHE_UPDATE[Cache Update]
        LOG_WRITE[Log Write]
    end

    LOGIN --> JWT_GENERATE
    JWT_GENERATE --> TOKEN_VALIDATE
    TOKEN_VALIDATE --> SESSION_MANAGE

    STREAM_LISTEN --> HLS_REQUEST
    HLS_REQUEST --> METADATA_EXTRACT
    METADATA_EXTRACT --> SONG_DETECT
    SONG_DETECT --> HISTORY_UPDATE

    RATE_SONG --> RATING_VALIDATE
    RATING_VALIDATE --> RATING_STORE
    RATING_STORE --> RATING_AGGREGATE
    RATING_AGGREGATE --> RATING_DISPLAY

    SESSION_MANAGE --> DB_WRITE
    HISTORY_UPDATE --> DB_WRITE
    RATING_STORE --> DB_WRITE
    
    DB_WRITE --> CACHE_UPDATE
    DB_READ --> CACHE_UPDATE
    
    DB_WRITE --> LOG_WRITE
    DB_READ --> LOG_WRITE
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_DOCKER[Docker Compose Dev]
        DEV_DB[PostgreSQL Dev]
        DEV_LOGS[Development Logs]
        HOT_RELOAD[Hot Reload]
    end

    subgraph "Staging Environment"
        STAGING_DOCKER[Docker Compose Staging]
        STAGING_DB[PostgreSQL Staging]
        STAGING_NGINX[nginx Staging]
        STAGING_SSL[SSL Certificates]
    end

    subgraph "Production Environment"
        PROD_DOCKER[Docker Compose Production]
        PROD_DB[PostgreSQL Production]
        PROD_NGINX[nginx Production]
        PROD_SSL[Production SSL]
        PROD_MONITORING[Production Monitoring]
    end

    subgraph "Cloud Deployment Options"
        AWS_ECS[AWS ECS]
        GCP_CLOUD_RUN[GCP Cloud Run]
        AZURE_CONTAINER[Azure Container Instances]
        KUBERNETES[Kubernetes Cluster]
    end

    subgraph "Infrastructure as Code"
        DOCKER_COMPOSE[Docker Compose Files]
        KUBERNETES_MANIFESTS[Kubernetes Manifests]
        TERRAFORM[Terraform Scripts]
        ANSIBLE[Ansible Playbooks]
    end

    DEV_DOCKER --> STAGING_DOCKER
    STAGING_DOCKER --> PROD_DOCKER

    PROD_DOCKER --> AWS_ECS
    PROD_DOCKER --> GCP_CLOUD_RUN
    PROD_DOCKER --> AZURE_CONTAINER
    PROD_DOCKER --> KUBERNETES

    DOCKER_COMPOSE --> KUBERNETES_MANIFESTS
    KUBERNETES_MANIFESTS --> TERRAFORM
    TERRAFORM --> ANSIBLE
```

## Architecture Principles

### 1. **Scalability**
- Microservices-ready architecture with separated concerns
- Horizontal scaling support through containerization
- Database connection pooling and query optimization
- CDN integration for global content delivery

### 2. **Security**
- Multi-layer security approach (network, application, infrastructure)
- JWT-based stateless authentication
- Input validation and SQL injection prevention
- Regular security scanning and vulnerability management

### 3. **Performance**
- Code splitting and lazy loading for optimal frontend performance
- Caching strategies at multiple levels (browser, CDN, application, database)
- Optimized database queries with proper indexing
- Resource monitoring and performance metrics

### 4. **Reliability**
- Health checks and monitoring at all levels
- Comprehensive error handling and logging
- Database backup and recovery procedures
- Graceful degradation for service failures

### 5. **Maintainability**
- Clean separation of concerns with modular architecture
- Comprehensive documentation and API specifications
- Automated testing and CI/CD pipelines
- Infrastructure as Code for reproducible deployments

### 6. **Observability**
- Structured logging with Winston
- Performance monitoring and Core Web Vitals tracking
- Health endpoints for system status monitoring
- Error tracking and exception handling

## Technology Decisions

### Frontend Architecture
- **Vanilla JavaScript**: No framework dependencies for optimal performance and minimal bundle size
- **CSS Grid/Flexbox**: Modern layout techniques for responsive design
- **HLS.js**: Industry-standard for HTTP Live Streaming with broad browser support
- **Service Workers**: Offline-first approach with intelligent caching

### Backend Architecture
- **Node.js/Express**: Lightweight, fast, and JavaScript ecosystem compatibility
- **PostgreSQL**: ACID compliance, advanced features, and excellent performance
- **JWT Authentication**: Stateless, scalable, and secure authentication
- **Winston Logging**: Structured logging with multiple transports and rotation

### Infrastructure Architecture
- **Docker**: Consistent environments across development, staging, and production
- **nginx**: High-performance reverse proxy with SSL termination
- **GitHub Actions**: Integrated CI/CD with security scanning and automated testing
- **CloudFront CDN**: Global content delivery for optimal streaming performance

This architecture supports Radio Calico's current requirements while providing a foundation for future growth and feature expansion.
