# API Documentation - Radio Calico

Complete API reference for the Radio Calico music streaming platform.

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

Radio Calico uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "string (required, 3-50 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "firstName": "string (optional, max 50 chars)",
  "lastName": "string (optional, max 50 chars)"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "created_at": "2025-09-01T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Validation error (username taken, invalid email, etc.)
- `500` - Internal server error
  "password": "string (required, min 6 chars)"
}
```

**Response** (201 Created):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2025-08-28T10:30:00.000Z",
    "is_verified": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `409 Conflict`: Username or email already exists

### Login User
Authenticates a user and returns a JWT token.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response** (200 OK):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses**:
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials

### Get User Profile
Returns the current user's profile information.

**Endpoint**: `GET /api/auth/profile`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "created_at": "2025-08-28T10:30:00.000Z",
    "is_verified": false
  }
}
```

## Song Endpoints

### Get All Songs
Retrieves a list of all songs in the system.

**Endpoint**: `GET /api/songs`

**Query Parameters**:
- `limit` (optional): Number of songs to return (default: 50, max: 100)
- `offset` (optional): Number of songs to skip (default: 0)
- `search` (optional): Search term for title or artist

**Response** (200 OK):
```json
{
  "songs": [
    {
      "id": 1,
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "duration": 355,
      "file_path": "/music/queen/bohemian_rhapsody.mp3",
      "created_at": "2025-08-28T10:30:00.000Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Get User's Songs
Retrieves songs added by the authenticated user.

**Endpoint**: `GET /api/songs/my`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "songs": [
    {
      "id": 1,
      "title": "My Song",
      "artist": "Me",
      "album": "My Album",
      "duration": 240,
      "created_at": "2025-08-28T10:30:00.000Z"
    }
  ]
}
```

### Add New Song
Adds a new song to the library.

**Endpoint**: `POST /api/songs`

**Authentication**: Required

**Request Body**:
```json
{
  "title": "string (required)",
  "artist": "string (required)",
  "album": "string (optional)",
  "duration": "number (optional, seconds)",
  "file_path": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "message": "Song added successfully",
  "song": {
    "id": 2,
    "title": "New Song",
    "artist": "New Artist",
    "album": null,
    "duration": null,
    "file_path": null,
    "created_at": "2025-08-28T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Song with same title and artist already exists

## Rating Endpoints

### Submit Song Rating
Submit a thumbs up (+1) or thumbs down (-1) rating for a song.

**Endpoint**: `POST /api/ratings`

**Authentication**: Required

**Request Body**:
```json
{
  "song_title": "string (required)",
  "song_artist": "string (required)",
  "rating": "number (required, must be 1 or -1)",
  "stream_timestamp": "string (optional, ISO 8601 timestamp)"
}
```

**Response** (200 OK for update, 201 Created for new):
```json
{
  "message": "Rating submitted successfully",
  "rating": {
    "id": 1,
    "user_id": 1,
    "song_title": "Bohemian Rhapsody",
    "song_artist": "Queen",
    "rating": 1,
    "stream_timestamp": "2025-08-28T10:30:00.000Z",
    "created_at": "2025-08-28T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid rating value or missing fields
- `401 Unauthorized`: Authentication required

### Get Song Ratings
Get rating statistics for a specific song.

**Endpoint**: `GET /api/ratings/:title/:artist`

**URL Parameters**:
- `title`: Song title (URL encoded)
- `artist`: Artist name (URL encoded)

**Query Parameters**:
- `user_id` (optional): Include user's specific rating

**Response** (200 OK):
```json
{
  "song_title": "Bohemian Rhapsody",
  "song_artist": "Queen",
  "thumbs_up": 847,
  "thumbs_down": 23,
  "total_ratings": 870,
  "user_rating": 1
}
```

### Get User's Rating History
Get all ratings submitted by the authenticated user.

**Endpoint**: `GET /api/ratings/my`

**Authentication**: Required

**Query Parameters**:
- `limit` (optional): Number of ratings to return
- `offset` (optional): Number of ratings to skip

**Response** (200 OK):
```json
{
  "ratings": [
    {
      "song_title": "Bohemian Rhapsody",
      "song_artist": "Queen",
      "rating": 1,
      "stream_timestamp": "2025-08-28T10:30:00.000Z",
      "created_at": "2025-08-28T10:30:00.000Z"
    }
  ],
  "total": 42
}
```

### Delete Rating
Remove a rating for a specific song.

**Endpoint**: `DELETE /api/ratings`

**Authentication**: Required

**Request Body**:
```json
{
  "song_title": "string (required)",
  "song_artist": "string (required)"
}
```

**Response** (200 OK):
```json
{
  "message": "Rating deleted successfully"
}
```

**Error Responses**:
- `404 Not Found`: Rating not found
- `400 Bad Request`: Missing required fields

## Playlist Endpoints

### Get All Playlists
Retrieve all public playlists.

**Endpoint**: `GET /api/playlists`

**Response** (200 OK):
```json
{
  "playlists": [
    {
      "id": 1,
      "name": "Rock Classics",
      "description": "The best rock songs of all time",
      "user_id": 1,
      "username": "john_doe",
      "song_count": 25,
      "created_at": "2025-08-28T10:30:00.000Z"
    }
  ]
}
```

### Get User's Playlists
Retrieve playlists created by the authenticated user.

**Endpoint**: `GET /api/playlists/my`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "playlists": [
    {
      "id": 1,
      "name": "My Favorites",
      "description": "My personal favorite songs",
      "song_count": 15,
      "created_at": "2025-08-28T10:30:00.000Z"
    }
  ]
}
```

### Create New Playlist
Create a new playlist.

**Endpoint**: `POST /api/playlists`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response** (201 Created):
```json
{
  "message": "Playlist created successfully",
  "playlist": {
    "id": 2,
    "name": "New Playlist",
    "description": "A new playlist",
    "user_id": 1,
    "created_at": "2025-08-28T10:30:00.000Z"
  }
}
```

## System Endpoints

### Health Check
Check the health status of the application and database.

**Endpoint**: `GET /health`

**Response** (200 OK):
```json
{
  "status": "OK",
  "timestamp": "2025-08-28T10:30:00.000Z",
  "database": "connected",
  "uptime": 86400
}
```

**Error Response** (503 Service Unavailable):
```json
{
  "status": "ERROR",
  "timestamp": "2025-08-28T10:30:00.000Z",
  "database": "disconnected",
  "error": "Database connection failed"
}
```

### System Status
Get detailed system information (admin endpoint).

**Endpoint**: `GET /api/status`

**Response** (200 OK):
```json
{
  "version": "2.0.0",
  "environment": "development",
  "uptime": 86400,
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB"
  },
  "database": {
    "status": "connected",
    "pool_size": 10,
    "active_connections": 3
  },
  "node_version": "18.20.8"
}
```

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation errors |
| 500 | Internal Server Error - Server error |
| 503 | Service Unavailable - Service temporarily unavailable |

### Common Error Messages

#### Authentication Errors
- `"Token expired"` - JWT token has expired
- `"Invalid token"` - JWT token is malformed or invalid
- `"Authentication required"` - Endpoint requires authentication
- `"Invalid credentials"` - Username/password incorrect

#### Validation Errors
- `"Username is required"` - Missing username field
- `"Email must be valid"` - Invalid email format
- `"Password too short"` - Password less than 6 characters
- `"Rating must be -1 or 1"` - Invalid rating value

#### Database Errors
- `"Database connection failed"` - Cannot connect to database
- `"Song already exists"` - Duplicate song title/artist
- `"User not found"` - Referenced user doesn't exist

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **General API endpoints**: 100 requests per minute per user
- **Search endpoints**: 50 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples

### Complete User Registration and Song Rating Flow

1. **Register a new user**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","email":"user@example.com","password":"password123"}'
```

2. **Login to get token**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123"}'
```

3. **Add a song**:
```bash
curl -X POST http://localhost:3000/api/songs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Great Song","artist":"Great Artist","duration":240}'
```

4. **Rate the song**:
```bash
curl -X POST http://localhost:3000/api/ratings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"song_title":"Great Song","song_artist":"Great Artist","rating":1}'
```

5. **Get rating statistics**:
```bash
curl http://localhost:3000/api/ratings/Great%20Song/Great%20Artist
```

## SDK and Client Libraries

Currently, the API is REST-based and can be consumed by any HTTP client. Consider creating official SDKs for:

- JavaScript/TypeScript
- Python
- Swift (iOS)
- Kotlin (Android)
- PHP

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for API version history and breaking changes.

## Support

For API support:
1. Check this documentation
2. Review error messages and status codes
3. Check application logs: `make logs`
4. Open an issue on GitHub
