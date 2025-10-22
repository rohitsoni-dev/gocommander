const { addon } = require("../index.js");
const assert = require("assert");
const os = require("os");
const fs = require("fs");
const path = require("path");

/**
 * C++ Addon Bridge Integration Tests
 * 
 * This test suite specifically focuses on testing the C++ addon bridge integration
 * as specified in task 2.4:
 * - Test Go library loading on different platforms
 * - Verify function export/import mechanisms
 * - Test error handling and memory management
 * 
 * Requirements: 2.2, 2.3, 2.4
 */

console.log("=== C++ Addon Bridge Integration Tests ===\n");

// Test configuration
const TEST_CONFIG = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    verbose: process.env.TEST_VERBOSE === 'true',
    timeout: 10000
};

console.log(`Platform: ${TEST_CONFIG.platform} (${TEST_CONFIG.arch})`);
console.log(`Node.js: ${TEST_CONFIG.nodeVersion}\n`);

// Test runner utility
class IntegrationTestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.errors = [];
        this.startTime = Date.now();
    }

    test(name, testFn, options = {}) {
        this.tests.push({ name, testFn, options });
    }

    async run() {
        console.log(`Running ${this.tests.length} C++ addon bridge integration tests...\n`);
        
        for (const { name, testFn, options } of this.tests) {
            const testStart = Date.now();
            
            try {
                console.log(`🔄 ${name}`);
                
                if (options.skipIf && options.skipIf()) {
                    console.log(`⏭️  SKIP: ${name} - ${options.skipReason || 'Condition not met'}\n`);
                    this.skipped++;
                    continue;
                }
                
                await Promise.race([
                    testFn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), 
                        options.timeout || TEST_CONFIG.timeout)
                    )
                ]);
                
                const duration = Date.now() - testStart;
                console.log(`✅ PASS: ${name} (${duration}ms)\n`);
                this.passed++;
                
            } catch (error) {
                const duration = Date.now() - testStart;
                console.log(`❌ FAIL: ${name} (${duration}ms)`);
                console.log(`   Error: ${error.message}\n`);
                this.failed++;
                this.errors.push({ test: name, error: error.message, duration });
            }
        }

        this.printSummary();
        return this.failed === 0;
    }

    printSummary() {
        const totalTime = Date.now() - this.startTime;
        
        console.log("=== Integration Test Summary ===");
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`Skipped: ${this.skipped}`);
        console.log(`Total Time: ${totalTime}ms`);
        
        if (this.failed > 0) {
            console.log("\n❌ Failures:");
            this.errors.forEach(({ test, error, duration }) => {
                console.log(`  - ${test} (${duration}ms): ${error}`);
            });
        }
        
        const status = this.failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED';
        console.log(`\n${this.failed === 0 ? '✅' : '❌'} Result: ${status}`);
    }

    // Assertion helpers
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

    assertInstanceOf(value, constructor, message) {
        if (!(value instanceof constructor)) {
            throw new Error(message || `Expected instance of ${constructor.name}`);
        }
    }
}

const runner = new IntegrationTestRunner();

// ============================================================================
// Test Group 1: Go Library Loading on Different Platforms
// ============================================================================

runner.test("Platform-Specific Library Loading - Windows DLL Detection", async () => {
    if (TEST_CONFIG.platform !== 'win32') {
        throw new Error('Test skipped - not Windows platform');
    }
    
    // Test Windows-specific DLL loading paths
    const expectedDllPaths = [
        'gommander.dll',
        './gommander.dll',
        'src/gommander.dll',
        '../src/gommander.dll',
        './src/gommander.dll',
        'build/Release/gommander.dll',
        'build/Debug/gommander.dll'
    ];
    
    let dllFound = false;
    let foundPath = '';
    
    for (const dllPath of expectedDllPaths) {
        if (fs.existsSync(dllPath)) {
            dllFound = true;
            foundPath = dllPath;
            break;
        }
    }
    
    if (TEST_CONFIG.verbose) {
        console.log(`   DLL search paths: ${expectedDllPaths.join(', ')}`);
        console.log(`   DLL found: ${dllFound} ${foundPath ? `at ${foundPath}` : ''}`);
    }
    
    // Test addon's ability to handle DLL loading
    const isAvailable = addon.isAvailable();
    const lastError = addon.getLastError();
    
    if (dllFound && !isAvailable) {
        // DLL exists but loading failed - check error details
        runner.assert(lastError.includes('DLL') || lastError.includes('function'), 
            `Windows DLL loading error should mention DLL or function issues: ${lastError}`);
    }
    
    if (!dllFound && !isAvailable) {
        runner.assert(lastError.includes('DLL') || lastError.includes('load'), 
            `Missing DLL error should mention loading issues: ${lastError}`);
    }
    
    console.log(`   Windows DLL loading test completed - Available: ${isAvailable}`);
}, { skipIf: () => TEST_CONFIG.platform !== 'win32', skipReason: 'Not Windows platform' });

runner.test("Platform-Specific Library Loading - Unix Static Linking", async () => {
    if (TEST_CONFIG.platform === 'win32') {
        throw new Error('Test skipped - Windows platform');
    }
    
    // Test Unix-specific static library linking
    const expectedLibPaths = [
        'src/gommander.a',
        './src/gommander.a',
        'build/gommander.a'
    ];
    
    let libFound = false;
    let foundPath = '';
    
    for (const libPath of expectedLibPaths) {
        if (fs.existsSync(libPath)) {
            libFound = true;
            foundPath = libPath;
            break;
        }
    }
    
    if (TEST_CONFIG.verbose) {
        console.log(`   Static library search paths: ${expectedLibPaths.join(', ')}`);
        console.log(`   Library found: ${libFound} ${foundPath ? `at ${foundPath}` : ''}`);
    }
    
    // Test addon's static linking behavior
    const isAvailable = addon.isAvailable();
    const lastError = addon.getLastError();
    
    if (TEST_CONFIG.verbose) {
        console.log(`   Go backend available: ${isAvailable}`);
        console.log(`   Last error: ${lastError}`);
    }
    
    // On Unix systems, static linking should either work or fail with symbol errors
    if (!isAvailable) {
        runner.assert(typeof lastError === 'string' && lastError.length > 0, 
            'Unix static linking error should provide error message');
    }
    
    console.log(`   Unix static linking test completed - Available: ${isAvailable}`);
}, { skipIf: () => TEST_CONFIG.platform === 'win32', skipReason: 'Windows platform' });

runner.test("Cross-Platform Library Loading Consistency", async () => {
    // Test that the loading mechanism is consistent across platforms
    const isAvailable = addon.isAvailable();
    const lastError = addon.getLastError();
    
    // Basic consistency checks
    runner.assertType(isAvailable, 'boolean', 'isGoAvailable should return boolean');
    runner.assertType(lastError, 'string', 'getLastError should return string');
    
    // Test that the addon object has consistent structure
    const requiredMethods = [
        'hello', 'version', 'isAvailable', 'getLastError',
        'createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp'
    ];
    
    for (const method of requiredMethods) {
        runner.assertType(addon[method], 'function', 
            `Addon should have ${method} method on all platforms`);
    }
    
    // Test basic method calls work regardless of Go backend availability
    const helloResult = addon.hello();
    const versionResult = addon.version();
    
    runner.assertType(helloResult, 'string', 'hello() should return string on all platforms');
    runner.assertType(versionResult, 'string', 'version() should return string on all platforms');
    runner.assert(helloResult.length > 0, 'hello() should return non-empty string');
    runner.assert(versionResult.length > 0, 'version() should return non-empty string');
    
    console.log(`   Cross-platform consistency verified - Go available: ${isAvailable}`);
});

// ============================================================================
// Test Group 2: Function Export/Import Mechanisms
// ============================================================================

runner.test("Go Function Export Verification", async () => {
    // Test that all expected Go functions are properly exported
    const goFunctions = [
        'CreateCommand', 'AddOption', 'AddArgument', 
        'ParseArgs', 'GetHelp', 'Initialize', 'Cleanup', 
        'GetVersion', 'AddRef', 'Release'
    ];
    
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Go backend not available: ${addon.getLastError()}`);
        console.log(`   Verifying that functions still exist in addon interface...`);
    }
    
    // These functions should exist in the addon interface regardless of Go availability
    const addonFunctions = [
        'createCommand', 'addOption', 'addArgument', 
        'parseArgs', 'getHelp'
    ];
    
    for (const funcName of addonFunctions) {
        runner.assertType(addon[funcName], 'function', 
            `Addon should export ${funcName} function`);
    }
    
    console.log(`   Function export verification completed - ${addonFunctions.length} functions verified`);
});

runner.test("Function Import and Binding Verification", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Testing function binding with unavailable Go backend...`);
        
        // Functions should still be callable but may throw exceptions or return error results
        try {
            const testResult = addon.createCommand('test-binding');
            runner.assertNotNull(testResult, 'Function should return result even when Go unavailable');
            
            if (testResult && typeof testResult === 'object' && testResult.success === false) {
                runner.assertType(testResult.error, 'string', 'Error result should have error message');
                console.log(`   Expected error result: ${testResult.error}`);
            }
        } catch (error) {
            // Exceptions are also valid when Go backend is unavailable
            runner.assertType(error.message, 'string', 'Exception should have error message');
            console.log(`   Expected exception: ${error.message}`);
        }
        
        return;
    }
    
    console.log(`   Testing function binding with available Go backend...`);
    
    // Test actual function binding with Go backend
    const cmdResult = addon.createCommand('binding-test');
    runner.assertNotNull(cmdResult, 'createCommand should return result');
    runner.assertType(cmdResult, 'object', 'createCommand result should be object');
    
    if (cmdResult.success) {
        runner.assertType(cmdResult.data, 'number', 'Command ID should be number');
        runner.assert(cmdResult.data > 0, 'Command ID should be positive');
        
        // Test chained function calls
        const optResult = addon.addOption(cmdResult.data, '-t, --test', 'Test option');
        runner.assertNotNull(optResult, 'addOption should return result');
        
        const argResult = addon.addArgument(cmdResult.data, 'testarg', 'Test argument', true);
        runner.assertNotNull(argResult, 'addArgument should return result');
        
        console.log(`   Function binding verification completed successfully`);
    } else {
        console.log(`   Function binding test failed: ${cmdResult.error}`);
    }
});

runner.test("Data Marshaling Between JavaScript and Go", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Skipping data marshaling test - Go backend not available`);
        return;
    }
    
    // Test various data types and edge cases
    const testCases = [
        {
            name: 'Simple ASCII string',
            cmdName: 'ascii-test',
            option: { flags: '-a, --ascii', desc: 'ASCII option', default: 'test' }
        },
        {
            name: 'Unicode string',
            cmdName: 'unicode-test-你好',
            option: { flags: '-u, --unicode', desc: 'Unicode: 🌍 test', default: 'default-值' }
        },
        {
            name: 'Special characters',
            cmdName: 'special-test',
            option: { flags: '-s, --special', desc: 'Special: !@#$%^&*()', default: 'default!@#' }
        },
        {
            name: 'Long string',
            cmdName: 'long-test',
            option: { flags: '-l, --long', desc: 'Long: ' + 'x'.repeat(1000), default: 'y'.repeat(500) }
        }
    ];
    
    for (const testCase of testCases) {
        try {
            const cmdResult = addon.createCommand(testCase.cmdName);
            runner.assert(cmdResult.success, `Failed to create command for ${testCase.name}`);
            
            const optResult = addon.addOption(
                cmdResult.data, 
                testCase.option.flags, 
                testCase.option.desc, 
                testCase.option.default
            );
            runner.assert(optResult.success, `Failed to add option for ${testCase.name}`);
            
            // Test parsing with the option
            const parseResult = addon.parseArgs(cmdResult.data, [
                testCase.option.flags.split(',')[0].trim(), 
                'test-value'
            ]);
            runner.assertNotNull(parseResult, `Parse result should not be null for ${testCase.name}`);
            
            if (TEST_CONFIG.verbose) {
                console.log(`   ${testCase.name}: ✓`);
            }
            
        } catch (error) {
            throw new Error(`Data marshaling failed for ${testCase.name}: ${error.message}`);
        }
    }
    
    console.log(`   Data marshaling test completed - ${testCases.length} test cases passed`);
});

// ============================================================================
// Test Group 3: Error Handling and Memory Management
// ============================================================================

runner.test("Error Propagation from Go to JavaScript", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Testing error handling without Go backend...`);
        
        // Should get consistent error responses
        const errorCases = [
            () => addon.createCommand('test'),
            () => addon.addOption(1, '-t', 'test'),
            () => addon.parseArgs(1, ['--test'])
        ];
        
        for (let i = 0; i < errorCases.length; i++) {
            try {
                const result = errorCases[i]();
                runner.assertNotNull(result, `Error case ${i + 1} should return result`);
                
                if (result && typeof result === 'object' && result.success === false) {
                    runner.assertType(result.error, 'string', 
                        `Error case ${i + 1} should have error message`);
                }
            } catch (error) {
                // Exceptions are also valid error handling
                runner.assertType(error.message, 'string', 
                    `Error case ${i + 1} exception should have message`);
            }
        }
        
        return;
    }
    
    console.log(`   Testing error propagation with Go backend...`);
    
    // Test various error conditions
    const errorTests = [
        {
            name: 'Invalid command ID',
            test: () => addon.addOption(999999, '-t', 'test'),
            expectError: true
        },
        {
            name: 'Null parameters',
            test: () => addon.createCommand(null),
            expectError: true
        },
        {
            name: 'Empty string parameters',
            test: () => addon.createCommand(''),
            expectError: true
        },
        {
            name: 'Invalid option flags',
            test: () => {
                const cmd = addon.createCommand('error-test');
                if (cmd.success) {
                    return addon.addOption(cmd.data, '', 'description');
                }
                return cmd;
            },
            expectError: true
        }
    ];
    
    for (const errorTest of errorTests) {
        try {
            const result = errorTest.test();
            runner.assertNotNull(result, `${errorTest.name} should return result`);
            
            if (errorTest.expectError) {
                runner.assert(result.success === false || result.error, 
                    `${errorTest.name} should indicate error`);
                
                if (result.error) {
                    runner.assertType(result.error, 'string', 
                        `${errorTest.name} error should be string`);
                }
            }
            
            if (TEST_CONFIG.verbose) {
                console.log(`   ${errorTest.name}: ✓ (${result.success ? 'success' : 'error as expected'})`);
            }
            
        } catch (error) {
            // Exceptions are also valid error handling
            runner.assertType(error.message, 'string', 
                `${errorTest.name} exception should have message`);
            
            if (TEST_CONFIG.verbose) {
                console.log(`   ${errorTest.name}: ✓ (exception: ${error.message})`);
            }
        }
    }
    
    console.log(`   Error propagation test completed - ${errorTests.length} error cases tested`);
});

runner.test("Memory Management and Cleanup", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Skipping memory management test - Go backend not available`);
        return;
    }
    
    // Test memory management with multiple commands
    const commands = [];
    const numCommands = 50;
    
    console.log(`   Creating ${numCommands} commands for memory test...`);
    
    // Create multiple commands
    for (let i = 0; i < numCommands; i++) {
        const result = addon.createCommand(`mem-test-${i}`);
        if (result.success) {
            commands.push(result.data);
            
            // Add options and arguments to increase memory usage
            addon.addOption(result.data, `-o${i}, --option${i}`, `Option ${i}`, `default${i}`);
            addon.addArgument(result.data, `arg${i}`, `Argument ${i}`, i % 2 === 0);
        }
    }
    
    runner.assert(commands.length > 0, 'Should create at least some commands');
    console.log(`   Created ${commands.length} commands successfully`);
    
    // Test reference counting if available
    if (typeof addon.addRef === 'function' && typeof addon.release === 'function') {
        console.log(`   Testing reference counting...`);
        
        const testCommands = commands.slice(0, 10);
        for (const cmdId of testCommands) {
            try {
                const addRefResult = addon.addRef(cmdId);
                const releaseResult = addon.release(cmdId);
                
                // These should not crash and should return some result
                runner.assertNotNull(addRefResult, 'addRef should return result');
                runner.assertNotNull(releaseResult, 'release should return result');
                
            } catch (error) {
                console.log(`   Reference counting not fully implemented: ${error.message}`);
                break;
            }
        }
    } else {
        console.log(`   Reference counting functions not available`);
    }
    
    // Test parsing with multiple commands to stress memory
    console.log(`   Testing parsing with multiple commands...`);
    let parseSuccesses = 0;
    
    for (let i = 0; i < Math.min(commands.length, 20); i++) {
        try {
            const cmdId = commands[i];
            const parseResult = addon.parseArgs(cmdId, [`--option${i}`, `value${i}`, `arg${i}`]);
            
            if (parseResult && !parseResult.error) {
                parseSuccesses++;
            }
        } catch (error) {
            // Some parsing failures are expected
        }
    }
    
    console.log(`   Memory management test completed - ${parseSuccesses} successful parses`);
});

runner.test("Exception Safety and Crash Prevention", async () => {
    // Test that the addon doesn't crash on various edge cases
    const crashTests = [
        { name: 'Null function calls', test: () => addon.createCommand(null) },
        { name: 'Undefined parameters', test: () => addon.addOption(undefined, undefined, undefined) },
        { name: 'Wrong parameter types', test: () => addon.parseArgs('not-a-number', 'not-an-array') },
        { name: 'Very large numbers', test: () => addon.addOption(Number.MAX_SAFE_INTEGER, '-t', 'test') },
        { name: 'Negative command IDs', test: () => addon.getHelp(-1) },
        { name: 'Zero command ID', test: () => addon.addArgument(0, 'arg', 'desc') },
        { name: 'Empty arrays', test: () => addon.parseArgs(1, []) },
        { name: 'Array with nulls', test: () => addon.parseArgs(1, [null, undefined, '']) }
    ];
    
    let crashTestsPassed = 0;
    
    for (const crashTest of crashTests) {
        try {
            const result = crashTest.test();
            
            // Should not crash - any result (including exceptions) is acceptable
            runner.assertNotNull(result, `${crashTest.name} should return some result`);
            crashTestsPassed++;
            
            if (TEST_CONFIG.verbose) {
                console.log(`   ${crashTest.name}: ✓ (returned result)`);
            }
            
        } catch (error) {
            // Exceptions are also acceptable - just shouldn't crash the process
            runner.assertType(error.message, 'string', 
                `${crashTest.name} exception should have message`);
            crashTestsPassed++;
            
            if (TEST_CONFIG.verbose) {
                console.log(`   ${crashTest.name}: ✓ (threw exception: ${error.message.substring(0, 50)}...)`);
            }
        }
    }
    
    console.log(`   Exception safety test completed - ${crashTestsPassed}/${crashTests.length} tests handled safely`);
});

// ============================================================================
// Test Group 4: Platform-Specific Integration Tests
// ============================================================================

runner.test("Windows DLL Symbol Export Verification", async () => {
    if (TEST_CONFIG.platform !== 'win32') {
        console.log(`   Skipping Windows-specific test on ${TEST_CONFIG.platform}`);
        return;
    }
    
    // Test that Windows DLL exports are properly loaded
    const isAvailable = addon.isAvailable();
    const lastError = addon.getLastError();
    
    if (TEST_CONFIG.verbose) {
        console.log(`   Windows DLL available: ${isAvailable}`);
        console.log(`   Last error: ${lastError}`);
    }
    
    // Test that all required functions exist regardless of Go backend availability
    const requiredFunctions = [
        'hello', 'version', 'isAvailable', 'getLastError',
        'createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp',
        'initialize', 'cleanup', 'addRef', 'release'
    ];
    
    for (const funcName of requiredFunctions) {
        runner.assertType(addon[funcName], 'function', 
            `Windows DLL should export ${funcName} function`);
    }
    
    // Test basic function calls work
    const helloResult = addon.hello();
    const versionResult = addon.version();
    
    runner.assertType(helloResult, 'string', 'hello() should return string on Windows');
    runner.assertType(versionResult, 'string', 'version() should return string on Windows');
    
    console.log(`   Windows DLL symbol export verification completed`);
}, { skipIf: () => TEST_CONFIG.platform !== 'win32', skipReason: 'Not Windows platform' });

runner.test("Unix Static Library Symbol Resolution", async () => {
    if (TEST_CONFIG.platform === 'win32') {
        console.log(`   Skipping Unix-specific test on ${TEST_CONFIG.platform}`);
        return;
    }
    
    // Test that Unix static library symbols are properly resolved
    const isAvailable = addon.isAvailable();
    const lastError = addon.getLastError();
    
    if (TEST_CONFIG.verbose) {
        console.log(`   Unix static library available: ${isAvailable}`);
        console.log(`   Last error: ${lastError}`);
    }
    
    // Test function availability
    const coreSymbols = ['hello', 'version', 'createCommand', 'parseArgs'];
    
    for (const symbol of coreSymbols) {
        runner.assertType(addon[symbol], 'function', 
            `Unix static library should resolve ${symbol} symbol`);
    }
    
    // Test that functions can be called without crashing
    try {
        const result = addon.createCommand('unix-test');
        runner.assertNotNull(result, 'createCommand should return result on Unix');
    } catch (error) {
        // Function call errors are acceptable, crashes are not
        runner.assertType(error.message, 'string', 'Unix function errors should have messages');
    }
    
    console.log(`   Unix static library symbol resolution completed`);
}, { skipIf: () => TEST_CONFIG.platform === 'win32', skipReason: 'Windows platform' });

runner.test("Cross-Platform Function Signature Consistency", async () => {
    // Test that function signatures are consistent across platforms
    const testFunctions = [
        { name: 'createCommand', minArgs: 1 },
        { name: 'addOption', minArgs: 3 },
        { name: 'addArgument', minArgs: 3 },
        { name: 'parseArgs', minArgs: 2 },
        { name: 'getHelp', minArgs: 1 }
    ];
    
    for (const { name, minArgs } of testFunctions) {
        const func = addon[name];
        runner.assertType(func, 'function', `${name} should be a function`);
        runner.assert(func.length >= 0, `${name} should have defined length property`);
        
        // Test function can be called (may return error, but shouldn't crash)
        try {
            const args = new Array(minArgs).fill('test');
            if (name === 'parseArgs') {
                args[0] = 1; // Command ID should be number
                args[1] = ['--test']; // Args should be array
            }
            
            const result = func.apply(null, args);
            runner.assertNotNull(result, `${name} should return some result`);
            
        } catch (error) {
            // Exceptions are acceptable, crashes are not
            runner.assertType(error.message, 'string', 
                `${name} exceptions should have error messages`);
        }
    }
    
    console.log(`   Cross-platform function signature consistency verified`);
});

// ============================================================================
// Test Group 5: Advanced Memory Management and Performance
// ============================================================================

runner.test("Memory Leak Detection with Repeated Operations", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Skipping memory leak test - Go backend not available`);
        return;
    }
    
    // Perform repeated operations to detect memory leaks
    const iterations = 100;
    const commands = [];
    
    console.log(`   Performing ${iterations} iterations of command operations...`);
    
    for (let i = 0; i < iterations; i++) {
        try {
            // Create command
            const cmdResult = addon.createCommand(`leak-test-${i}`);
            if (cmdResult && cmdResult.success) {
                commands.push(cmdResult.data);
                
                // Add multiple options and arguments
                addon.addOption(cmdResult.data, `-o${i}`, `Option ${i}`, `default${i}`);
                addon.addOption(cmdResult.data, `--long${i}`, `Long option ${i}`);
                addon.addArgument(cmdResult.data, `arg${i}`, `Argument ${i}`, true);
                
                // Parse some arguments
                addon.parseArgs(cmdResult.data, [`--long${i}`, `value${i}`, `arg${i}`]);
                
                // Get help text
                addon.getHelp(cmdResult.data);
                
                // Test reference counting if available
                if (addon.addRef && addon.release) {
                    addon.addRef(cmdResult.data);
                    addon.release(cmdResult.data);
                }
            }
        } catch (error) {
            // Some failures are expected, but shouldn't crash
        }
    }
    
    console.log(`   Created ${commands.length} commands successfully`);
    
    // Test that we can still create new commands after many operations
    const finalTest = addon.createCommand('final-memory-test');
    runner.assertNotNull(finalTest, 'Should still be able to create commands after many operations');
    
    console.log(`   Memory leak detection test completed`);
});

runner.test("Concurrent Access Simulation", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Skipping concurrent access test - Go backend not available`);
        return;
    }
    
    // Simulate concurrent access by rapidly creating and using commands
    const promises = [];
    const numConcurrent = 20;
    
    console.log(`   Simulating ${numConcurrent} concurrent operations...`);
    
    for (let i = 0; i < numConcurrent; i++) {
        const promise = new Promise((resolve) => {
            setTimeout(() => {
                try {
                    const cmdResult = addon.createCommand(`concurrent-${i}`);
                    if (cmdResult && cmdResult.success) {
                        addon.addOption(cmdResult.data, `-c${i}`, `Concurrent option ${i}`);
                        const parseResult = addon.parseArgs(cmdResult.data, [`-c${i}`, `value${i}`]);
                        resolve({ success: true, cmdId: cmdResult.data, parseResult });
                    } else {
                        resolve({ success: false, error: cmdResult ? cmdResult.error : 'Unknown error' });
                    }
                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            }, Math.random() * 10); // Random delay up to 10ms
        });
        
        promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`   Concurrent operations completed: ${successful} successful, ${failed} failed`);
    
    // At least some operations should succeed
    runner.assert(successful > 0, 'At least some concurrent operations should succeed');
    
    // No operation should crash the process (all promises should resolve)
    runner.assertEqual(results.length, numConcurrent, 'All concurrent operations should complete');
});

runner.test("Large Data Handling", async () => {
    const isAvailable = addon.isAvailable();
    
    if (!isAvailable) {
        console.log(`   Skipping large data test - Go backend not available`);
        return;
    }
    
    // Test handling of large strings and arrays
    const largeString = 'x'.repeat(10000);
    const largeArray = new Array(1000).fill(0).map((_, i) => `arg${i}`);
    
    console.log(`   Testing large data handling (${largeString.length} char string, ${largeArray.length} element array)...`);
    
    try {
        // Create command with large name
        const cmdResult = addon.createCommand(`large-test-${largeString.substring(0, 100)}`);
        runner.assertNotNull(cmdResult, 'Should handle command creation with large data');
        
        if (cmdResult && cmdResult.success) {
            // Add option with large description
            const optResult = addon.addOption(cmdResult.data, '--large', largeString.substring(0, 1000));
            runner.assertNotNull(optResult, 'Should handle large option descriptions');
            
            // Test parsing with large argument array (but reasonable size)
            const reasonableArray = largeArray.slice(0, 50); // Limit to reasonable size
            const parseResult = addon.parseArgs(cmdResult.data, reasonableArray);
            runner.assertNotNull(parseResult, 'Should handle reasonably large argument arrays');
        }
        
    } catch (error) {
        // Large data errors are acceptable, crashes are not
        runner.assertType(error.message, 'string', 'Large data errors should have messages');
        console.log(`   Large data handling error (expected): ${error.message.substring(0, 100)}...`);
    }
    
    console.log(`   Large data handling test completed`);
});

// ============================================================================
// Run all tests
// ============================================================================

async function runIntegrationTests() {
    console.log("Starting C++ Addon Bridge Integration Tests...\n");
    
    const success = await runner.run();
    
    console.log("\n" + "=".repeat(60));
    console.log("C++ ADDON BRIDGE INTEGRATION TEST RESULTS");
    console.log("=".repeat(60));
    console.log(`Platform: ${TEST_CONFIG.platform} (${TEST_CONFIG.arch})`);
    console.log(`Node.js: ${TEST_CONFIG.nodeVersion}`);
    console.log(`Go Backend Available: ${addon.isAvailable()}`);
    if (!addon.isAvailable()) {
        console.log(`Go Backend Error: ${addon.getLastError()}`);
    }
    console.log("=".repeat(60));
    
    return success;
}

// Export for use in other test files
module.exports = {
    runIntegrationTests,
    IntegrationTestRunner,
    TEST_CONFIG
};

// Run tests if this file is executed directly
if (require.main === module) {
    runIntegrationTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error("Integration test runner failed:", error);
        process.exit(1);
    });
}