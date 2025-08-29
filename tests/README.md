# Radio Calico Ratings System - Testing Framework

## Overview

This testing framework provides comprehensive coverage for the Radio Calico ratings system, including unit tests, integration tests, and end-to-end testing scenarios.

## Test Structure

```
tests/
├── package.json              # Test dependencies and scripts
├── setup.js                  # Global test configuration
├── ratings.test.js           # Backend unit tests
├── frontend-ratings.test.js  # Frontend unit tests  
├── ratings-integration.test.js # Integration tests
└── README.md                 # This documentation
```

## Test Types

### 1. Backend Unit Tests (`ratings.test.js`)
- **API Endpoint Testing**: POST/GET rating endpoints
- **Authentication**: JWT token validation
- **Database Operations**: CRUD operations with SQLite
- **Validation**: Input validation and error handling
- **Business Logic**: Rating calculations and updates

### 2. Frontend Unit Tests (`frontend-ratings.test.js`)
- **User Interactions**: Button clicks, form submissions
- **DOM Manipulation**: Rating display updates
- **API Communication**: Mocked fetch requests
- **Authentication Flow**: Login modal triggers
- **Error Handling**: Network errors, validation errors

### 3. Integration Tests (`ratings-integration.test.js`)
- **End-to-End Flow**: Complete rating submission process
- **Database Persistence**: Real database operations
- **Multi-User Scenarios**: Concurrent ratings
- **Performance Testing**: Bulk operations
- **Error Scenarios**: Real error conditions

## Installation

1. **Navigate to tests directory:**
   ```bash
   cd /Users/danielkiss/Code/aiMusicPlayer/tests
   ```

2. **Install test dependencies:**
   ```bash
   npm install
   ```

## Running Tests

### Quick Commands

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test suites
npm run test:backend      # Backend only
npm run test:frontend     # Frontend only  
npm run test:integration  # Integration only

# Run with verbose output
npm run test:verbose
```

### Individual Test Files

```bash
# Backend unit tests
npx jest ratings.test.js

# Frontend unit tests  
npx jest frontend-ratings.test.js

# Integration tests
npx jest ratings-integration.test.js
```

## Test Coverage

The framework tests the following functionality:

### ✅ Authentication
- JWT token validation
- Unauthorized access prevention
- User session management
- Login modal triggers

### ✅ Rating Operations
- Thumbs up/down submission
- Rating updates (changing vote)
- Rating retrieval with counts
- User-specific rating status

### ✅ Database Operations
- Song creation and lookup
- Rating storage and updates
- Foreign key relationships
- Data integrity constraints

### ✅ UI Components
- Rating button interactions
- Dynamic count updates
- Active state management
- Error message display

### ✅ Error Handling
- Invalid rating values
- Missing song information
- Network errors
- Database errors
- Authentication failures

### ✅ Performance
- Concurrent requests
- Bulk operations
- Response times
- Memory usage

## Test Data

### Mock User
```javascript
{
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_verified: true
}
```

### Mock Song
```javascript
{
  id: 1,
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 180
}
```

### Mock Rating
```javascript
{
  id: 1,
  user_id: 1,
  song_id: 1,
  rating: 1, // 1 for thumbs up, -1 for thumbs down
  created_at: '2024-01-01T00:00:00.000Z'
}
```

## Environment Configuration

### Test Environment Variables
```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-for-testing-only
```

### Database Configuration
- Uses in-memory SQLite for isolation
- Fresh database created for each test suite
- Automatic cleanup between tests

## Custom Jest Matchers

### `.toBeValidRating()`
```javascript
expect(1).toBeValidRating();        // ✅ Passes
expect(-1).toBeValidRating();       // ✅ Passes  
expect(0).toBeValidRating();        // ❌ Fails
```

### `.toHaveValidAuthToken()`
```javascript
const token = jwt.sign(user, secret);
expect(token).toHaveValidAuthToken(); // ✅ Passes
```

## Debugging Tests

### Enable Console Output
```javascript
// In test file
beforeAll(() => {
  global.console = console; // Restore console for debugging
});
```

### Debug Specific Test
```bash
npx jest --testNamePattern="should submit rating" --verbose
```

### Database Inspection
```javascript
// In test
console.log('Database state:', db.prepare('SELECT * FROM ratings').all());
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Test Radio Calico
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd tests && npm install
      - run: cd tests && npm run test:coverage
```

## Common Issues

### 1. Database Lock Errors
**Solution**: Ensure proper cleanup in `afterEach`
```javascript
afterEach(() => {
  if (db) db.close();
});
```

### 2. Async Test Timeouts
**Solution**: Increase timeout or use proper async/await
```javascript
jest.setTimeout(10000); // 10 seconds
```

### 3. DOM Manipulation Errors
**Solution**: Ensure JSDOM setup in test environment
```javascript
const { JSDOM } = require('jsdom');
global.document = new JSDOM().window.document;
```

## Best Practices

### ✅ Do's
- Use descriptive test names
- Test both success and error cases  
- Mock external dependencies
- Clean up after each test
- Use proper async/await syntax
- Test edge cases and boundary conditions

### ❌ Don'ts
- Don't test implementation details
- Don't use real external APIs in tests
- Don't leave database connections open
- Don't rely on test execution order
- Don't use hardcoded delays instead of proper mocking

## Performance Benchmarks

### Expected Test Performance
- **Unit Tests**: < 50ms per test
- **Integration Tests**: < 500ms per test
- **Full Suite**: < 30 seconds
- **Coverage Generation**: < 60 seconds

## Extending Tests

### Adding New Test Cases
1. Create test file in `/tests` directory
2. Follow naming convention: `feature.test.js`
3. Use test utilities from `setup.js`
4. Update package.json scripts if needed

### Test Template
```javascript
const { testUtils } = require('./setup');

describe('New Feature Tests', () => {
  let testDb;
  
  beforeEach(() => {
    testDb = testUtils.createTestDatabase();
  });
  
  afterEach(() => {
    testUtils.cleanDatabase(testDb);
  });
  
  test('should test new feature', async () => {
    // Arrange
    const testData = testUtils.createMockUser();
    
    // Act
    const result = await newFeature(testData);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

## Troubleshooting

### Common Commands
```bash
# Clear Jest cache
npx jest --clearCache

# Run single test file with debug
npx jest frontend-ratings.test.js --verbose --no-cache

# Check test file syntax
node -c tests/ratings.test.js

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

**Radio Calico Testing Framework v1.0**  
*Ensuring quality music streaming since 2024* 🎵✨
