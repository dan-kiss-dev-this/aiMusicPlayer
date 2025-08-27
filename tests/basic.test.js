// Simple test to verify Jest configuration
describe('Jest Configuration Test', () => {
    test('should be able to run basic tests', () => {
        expect(1 + 1).toBe(2);
    });

    test('should have access to test utilities', () => {
        expect(global.testUtils).toBeDefined();
        expect(global.testUtils.createMockUser).toBeDefined();
    });

    test('should have DOM environment available', () => {
        expect(global.window).toBeDefined();
        expect(global.document).toBeDefined();
        expect(global.localStorage).toBeDefined();
    });
});
