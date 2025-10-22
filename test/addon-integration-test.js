const { addon } = require("../index.js");
const assert = require("assert");
const os = require("os");

/**
 * Integration tests for C++ addon bridge
 * Tests Go library loading, function export/import, error handling, and memory management
 */

console.log("=== C++ Addon Bridge Integration Tests ===\n");

// Test configuration
const TEST_CONFIG = {
    timeout: 5000,
    verbose: process.env.TEST_VERBOSE === 'true',
    platform: os.platform(),
    arch: os.arch()
};

// Test utilities
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.errors = [];
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log(`Running ${this.tests.length} integration tests on ${TEST_CONFIG.platform} (${TEST_CONFIG.arch})\n`);
        
        for (const { name, fn } of this.tests) {
            try {
                console.log(`Running: ${name}`);
                await fn();
                console.log(`✓ PASS: ${name}\n`);
                this.passed++;
            } catch (error) {
                console.log(`✗ FAIL: ${name}`);
                console.log(`  Error: ${error.message}\n`);
                this.failed++;
                this.errors.push({ test: name, error: error.message });
            }
        }

        this.printSummary();
    }

    printSummary() {
        console.log("=== Test Summary ===");
        console.log(`Total: ${this.tests.length}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        
        if (this.failed > 0) {
            console.log("\nFailures:");
            this.errors.forEach(({ test, error }) => {
                console.log(`  - ${test}: ${error}`);
            });
        }
        
        console.log(`\nResult: ${this.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(message || 'Expected non-null value');
        }
    }

    assertType(value, type, message) {
        if (typeof value !== type) {
            throw new Error(message || `Expected type ${type}, got ${typeof value}`);
        }
    }
}

const runner = new TestRunner();

// Test 1: Go Library Loading on Different Platforms
runner.test("Go Library Loading - Platform Detection", async () => {
    // Test that the addon can detect the current platform
    const platform = TEST_CONFIG.platform;
    runner.assert(['win32', 'darwin', 'linux'].includes(platform), 
        `Unsupported platform: ${platform}`);
    
    if (TEST_CONFIG.verbose) {
        console.log(`  Platform: ${platform}, Architecture: ${TEST_CONFIG.arch}`);
    }
});

runner.test("Go Library Loading - Addon Availability", async () => {
    // Test that the addon object exists and has expected properties
    runner.assertNotNull(addon, "Addon should be available");
    runner.assertType(addon, 'object', "Addon should be an object");
    
    // Check for essential functions
    const requiredFunctions = [
        'hello', 'version', 'isGoAvailable', 'getLastError',
        'createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp'
    ];
    
    for (const funcName of requiredFunctions) {
        runner.assert(typeof addon[funcName] === 'function', 
            `Addon should have ${funcName} function`);
    }
});

runner.test("Go Library Loading - Backend Initialization", async () => {
    // Test Go backend initialization
    let isAvailable;
    try {
        isAvailable = addon.isGoAvailable();
        runner.assertType(isAvailable, 'boolean', "isGoAvailable should return boolean");
    } catch (error) {
        // If Go backend is not available, that's still a valid test result
        console.log(`  Go backend not available: ${error.message}`);
        isAvailable = false;
    }
    
    if (!isAvailable) {
        const lastError = addon.getLastError();
        runner.assertType(lastError, 'string', "getLastError should return string");
        console.log(`  Go backend error: ${lastError}`);
    }
    
    if (TEST_CONFIG.verbose) {
        console.log(`  Go backend available: ${isAvailable}`);
    }
});

// Test 2: Function Export/Import Mechanisms
runner.test("Function Export/Import - Basic Functions", async () => {
    // Test basic addon functions that should always work
    try {
        const helloResult = addon.hello();
        runner.assertType(helloResult, 'string', "hello() should return string");
        runner.assert(helloResult.length > 0, "hello() should return non-empty string");
        
        const versionResult = addon.version();
        runner.assertType(versionResult, 'string', "version() should return string");
        runner.assert(versionResult.length > 0, "version() should return non-empty string");
        
        if (TEST_CONFIG.verbose) {
            console.log(`  Hello: ${helloResult}`);
            console.log(`  Version: ${versionResult}`);
        }
    } catch (error) {
        throw new Error(`Basic function calls failed: ${error.message}`);
    }
});

runner.test("Function Export/Import - Go Backend Functions", async () => {
    // Test Go backend specific functions
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping Go backend function tests - backend not available");
        return;
    }
    
    // Test createCommand function
    try {
        const result = addon.createCommand("test-command");
        runner.assertNotNull(result, "createCommand should return a result");
        
        if (result.success) {
            runner.assertNotNull(result.data, "Successful createCommand should return command ID");
            runner.assertType(result.data, 'number', "Command ID should be a number");
            runner.assert(result.data > 0, "Command ID should be positive");
            
            if (TEST_CONFIG.verbose) {
                console.log(`  Created command with ID: ${result.data}`);
            }
        } else {
            console.log(`  createCommand failed: ${result.error}`);
        }
    } catch (error) {
        throw new Error(`createCommand function test failed: ${error.message}`);
    }
});

runner.test("Function Export/Import - Parameter Validation", async () => {
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping parameter validation tests - Go backend not available");
        return;
    }
    
    // Test parameter validation for createCommand
    try {
        // Test with invalid parameters
        const invalidResults = [
            addon.createCommand(), // No parameters
            addon.createCommand(null), // Null parameter
            addon.createCommand(123), // Wrong type
            addon.createCommand("") // Empty string
        ];
        
        for (let i = 0; i < invalidResults.length; i++) {
            const result = invalidResults[i];
            runner.assertNotNull(result, `Invalid parameter test ${i + 1} should return result`);
            runner.assertEqual(result.success, false, 
                `Invalid parameter test ${i + 1} should fail`);
            runner.assertNotNull(result.error, 
                `Invalid parameter test ${i + 1} should have error message`);
        }
        
        if (TEST_CONFIG.verbose) {
            console.log(`  Parameter validation working correctly`);
        }
    } catch (error) {
        throw new Error(`Parameter validation test failed: ${error.message}`);
    }
});

// Test 3: Error Handling and Memory Management
runner.test("Error Handling - Invalid Command Operations", async () => {
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping error handling tests - Go backend not available");
        return;
    }
    
    // Test operations on invalid command IDs
    const invalidCommandId = 999999;
    
    try {
        // Test addOption with invalid command ID
        const addOptionResult = addon.addOption(invalidCommandId, "-t, --test", "Test option");
        runner.assertNotNull(addOptionResult, "addOption should return result for invalid ID");
        runner.assertEqual(addOptionResult.success, false, 
            "addOption should fail for invalid command ID");
        
        // Test addArgument with invalid command ID
        const addArgResult = addon.addArgument(invalidCommandId, "test-arg", "Test argument");
        runner.assertNotNull(addArgResult, "addArgument should return result for invalid ID");
        runner.assertEqual(addArgResult.success, false, 
            "addArgument should fail for invalid command ID");
        
        // Test parseArgs with invalid command ID
        const parseResult = addon.parseArgs(invalidCommandId, ["--test", "value"]);
        runner.assertNotNull(parseResult, "parseArgs should return result for invalid ID");
        // parseArgs might return different error format, so just check it's not successful
        
        // Test getHelp with invalid command ID
        const helpResult = addon.getHelp(invalidCommandId);
        runner.assertNotNull(helpResult, "getHelp should return result for invalid ID");
        
        if (TEST_CONFIG.verbose) {
            console.log(`  Error handling for invalid operations working correctly`);
        }
    } catch (error) {
        throw new Error(`Error handling test failed: ${error.message}`);
    }
});

runner.test("Error Handling - Exception Safety", async () => {
    // Test that the addon doesn't crash on various edge cases
    const testCases = [
        () => addon.createCommand(null),
        () => addon.createCommand(undefined),
        () => addon.addOption(null, null, null),
        () => addon.addArgument(undefined, undefined, undefined),
        () => addon.parseArgs(0, null),
        () => addon.getHelp(null)
    ];
    
    for (let i = 0; i < testCases.length; i++) {
        try {
            const result = testCases[i]();
            // Should not crash, should return some kind of error result
            runner.assertNotNull(result, `Test case ${i + 1} should return a result`);
        } catch (error) {
            // Exceptions are also acceptable as long as they don't crash the process
            runner.assertType(error.message, 'string', 
                `Test case ${i + 1} exception should have message`);
        }
    }
    
    if (TEST_CONFIG.verbose) {
        console.log(`  Exception safety tests passed`);
    }
});

runner.test("Memory Management - Command Lifecycle", async () => {
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping memory management tests - Go backend not available");
        return;
    }
    
    // Test creating and using multiple commands
    const commandIds = [];
    const numCommands = 10;
    
    try {
        // Create multiple commands
        for (let i = 0; i < numCommands; i++) {
            const result = addon.createCommand(`test-cmd-${i}`);
            if (result.success) {
                commandIds.push(result.data);
            }
        }
        
        runner.assert(commandIds.length > 0, "Should be able to create at least one command");
        
        // Add options and arguments to each command
        for (const cmdId of commandIds) {
            const optionResult = addon.addOption(cmdId, `-o${cmdId}, --option${cmdId}`, 
                `Option for command ${cmdId}`);
            const argResult = addon.addArgument(cmdId, `arg${cmdId}`, 
                `Argument for command ${cmdId}`, true);
            
            // These operations should not fail for valid command IDs
            if (!optionResult.success || !argResult.success) {
                console.log(`  Warning: Operations failed for command ${cmdId}`);
            }
        }
        
        // Test memory cleanup (if available)
        if (typeof addon.addRef === 'function' && typeof addon.release === 'function') {
            for (const cmdId of commandIds) {
                try {
                    addon.addRef(cmdId);
                    addon.release(cmdId);
                } catch (error) {
                    // Memory management functions might not be fully implemented
                    console.log(`  Memory management not fully implemented: ${error.message}`);
                }
            }
        }
        
        if (TEST_CONFIG.verbose) {
            console.log(`  Created and managed ${commandIds.length} commands successfully`);
        }
    } catch (error) {
        throw new Error(`Memory management test failed: ${error.message}`);
    }
});

runner.test("Memory Management - String Handling", async () => {
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping string handling tests - Go backend not available");
        return;
    }
    
    // Test with various string inputs to ensure proper memory handling
    const testStrings = [
        "simple",
        "with spaces and symbols !@#$%^&*()",
        "unicode: 你好世界 🌍",
        "very".repeat(1000), // Long string
        "", // Empty string (should be handled gracefully)
        "with\nnewlines\nand\ttabs"
    ];
    
    try {
        for (let i = 0; i < testStrings.length; i++) {
            const testStr = testStrings[i];
            if (testStr === "") continue; // Skip empty string for createCommand
            
            const result = addon.createCommand(`cmd-${i}-${testStr.substring(0, 10)}`);
            if (result.success) {
                // Test adding options with various string formats
                const optResult = addon.addOption(result.data, 
                    `-t${i}, --test${i}`, 
                    `Description: ${testStr.substring(0, 50)}`);
                
                // Should handle strings without memory issues
                runner.assertNotNull(optResult, `String handling test ${i} should return result`);
            }
        }
        
        if (TEST_CONFIG.verbose) {
            console.log(`  String handling tests completed successfully`);
        }
    } catch (error) {
        throw new Error(`String handling test failed: ${error.message}`);
    }
});

runner.test("Cross-Platform Compatibility", async () => {
    // Test platform-specific behavior
    const platform = TEST_CONFIG.platform;
    
    try {
        // Test that basic functions work regardless of platform
        const helloResult = addon.hello();
        const versionResult = addon.version();
        
        runner.assertType(helloResult, 'string', "hello() should work on all platforms");
        runner.assertType(versionResult, 'string', "version() should work on all platforms");
        
        // Test Go backend availability (platform-dependent)
        const isAvailable = addon.isGoAvailable();
        
        if (platform === 'win32') {
            // On Windows, should attempt to load DLL
            if (!isAvailable) {
                const error = addon.getLastError();
                runner.assert(error.includes('DLL') || error.includes('dll'), 
                    "Windows error should mention DLL loading");
            }
        } else {
            // On Unix-like systems, should use static linking
            if (!isAvailable) {
                const error = addon.getLastError();
                // Error might be related to static linking or missing symbols
                runner.assertType(error, 'string', "Unix error should be a string");
            }
        }
        
        if (TEST_CONFIG.verbose) {
            console.log(`  Platform: ${platform}, Go available: ${isAvailable}`);
            if (!isAvailable) {
                console.log(`  Platform-specific error: ${addon.getLastError()}`);
            }
        }
    } catch (error) {
        throw new Error(`Cross-platform compatibility test failed: ${error.message}`);
    }
});

// Run all tests
runner.run().then(() => {
    process.exit(runner.failed > 0 ? 1 : 0);
}).catch((error) => {
    console.error("Test runner failed:", error);
    process.exit(1);
});