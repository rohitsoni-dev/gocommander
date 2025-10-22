const { addon } = require("../index.js");

/**
 * Error Handling and Memory Management Tests
 * Comprehensive tests for error scenarios, edge cases, and memory management
 */

console.log("=== Error Handling and Memory Management Tests ===\n");

// Test configuration
const TEST_CONFIG = {
    maxCommands: 100,
    stressTestIterations: 1000,
    verbose: process.env.TEST_VERBOSE === 'true'
};

// Test uti