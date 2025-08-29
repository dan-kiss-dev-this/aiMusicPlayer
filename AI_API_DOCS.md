
# 🎵 Radio Calico API Documentation

## Overview
Radio Calico is a music player application with rating functionality, built with Node.js and PostgreSQL.

## Authentication
- JWT-based authentication
- bcrypt password hashing
- Session management

## Endpoints

### Songs
- `GET /api/songs` - Get all songs
- `POST /api/songs` - Add new song
- `GET /api/songs/:id` - Get specific song

### Ratings
- `POST /api/rate` - Rate a song
- `GET /api/ratings/:songId` - Get song ratings
- `GET /api/user-ratings` - Get user's ratings

### Users
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile

## Database Schema
- Users table with authentication
- Songs table with metadata
- Ratings table with user-song relationships

## Security Features
- Input validation
- SQL injection prevention
- XSS protection
- Rate limiting
