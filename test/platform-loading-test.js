const { addon } = require("../index.js");
const os = require("os");
const fs = require("fs");
const path = require("path");

/**
 * Platform-specific Go library loading tests
 * Tests different loading mechanisms on Windows (DLL) vs Unix (static linking)
 */

console.log("=== Platform-Specific Go Library Loading Tests ===\n");

const platform = os.platform();
const arch = os.arch();

console.log(`Platform: ${platform}`);
console.log(`Architecture: ${arch}`);
console.log(`Node.js version: ${process.version}\n`);

// Test utilities
function testSection(name, testFn) {
    console.log(`--- ${name} ---`);
    try {
        testFn();
        console.log("✓ PASSED\n");
    } catch (error) {
        console.log(`✗ FAILED: ${error.message}\n`);
        throw error;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// Test 1: Platform Detection and Expected Loading Mechanism
testSection("Platform Detection and Loading Strategy", () => {
    console.log("Testing platform-specific loading expectations...");
    
    if (platform === 'win32') {
        console.log("  Windows detected - expecting DLL loading mechanism");
        
        // Check for expected DLL files
        const dllPaths = [
            'gommander.dll',
            'src/gommander.dll',
            './src/gommander.dll',
            'build/Release/gommander.dll'
        ];
        
        let dllFound = false;
        for (const dllPath of dllPaths) {
            if (fs.existsSync(dllPath)) {
                console.log(`  Found DLL at: ${dllPath}`);
                dllFound = true;
                break;
            }
        }
        
        if (!dllFound) {
            console.log("  No DLL found in expected locations - this may cause loading failures");
        }
        
    } else if (platform === 'darwin' || platform === 'linux') {
        console.log(`  Unix-like system (${platform}) detected - expecting static linking`);
        
        // Check for expected static library files
        const libPaths = [
            'src/gommander.a',
            './src/gommander.a',
            'build/gommander.a'
        ];
        
        let libFound = false;
        for (const libPath of libPaths) {
            if (fs.existsSync(libPath)) {
                console.log(`  Found static library at: ${libPath}`);
                libFound = true;
                break;
            }
        }
        
        if (!libFound) {
            console.log("  No static library found - may use embedded symbols");
        }
        
    } else {
        console.log(`  Unsupported platform: ${platform}`);
        throw new Error(`Platform ${platform} is not supported`);
    }
});

// Test 2: Addon Loading and Basic Functionality
testSection("Addon Loading and Basic Functionality", () => {
    console.log("Testing addon loading...");
    
    assert(typeof addon === 'object', "Addon should be loaded as an object");
    assert(addon !== null, "Addon should not be null");
    
    // Test basic functions that should always be available
    const basicFunctions = ['hello', 'version', 'isGoAvailable', 'getLastError'];
    
    for (const funcName of basicFunctions) {
        assert(typeof addon[funcName] === 'function', 
            `Addon should have ${funcName} function`);
    }
    
    console.log("  Basic addon structure verified");
    
    // Test basic function calls
    try {
        const helloResult = addon.hello();
        assert(typeof helloResult === 'string', "hello() should return string");
        console.log(`  hello(): ${helloResult}`);
        
        const versionResult = addon.version();
        assert(typeof versionResult === 'string', "version() should return string");
        console.log(`  version(): ${versionResult}`);
        
    } catch (error) {
        throw new Error(`Basic function calls failed: ${error.message}`);
    }
});

// Test 3: Go Backend Loading Mechanism
testSection("Go Backend Loading Mechanism", () => {
    console.log("Testing Go backend loading...");
    
    let isAvailable = false;
    let lastError = "";
    
    try {
        isAvailable = addon.isGoAvailable();
        lastError = addon.getLastError();
        
        console.log(`  Go backend available: ${isAvailable}`);
        console.log(`  Last error: ${lastError}`);
        
    } catch (error) {
        console.log(`  Exception during Go backend check: ${error.message}`);
        lastError = error.message;
    }
    
    if (isAvailable) {
        console.log("  ✓ Go backend loaded successfully");
        
        // Test Go-specific functions
        const goFunctions = ['createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp'];
        
        for (const funcName of goFunctions) {
            assert(typeof addon[funcName] === 'function', 
                `Go backend should provide ${funcName} function`);
        }
        
        console.log("  ✓ All Go backend functions available");
        
    } else {
        console.log("  ⚠ Go backend not available");
        
        // Analyze the error based on platform
        if (platform === 'win32') {
            if (lastError.includes('DLL') || lastError.includes('dll')) {
                console.log("  → Windows DLL loading issue detected");
                console.log("  → Check if gommander.dll is built and accessible");
            } else if (lastError.includes('GetProcAddress') || lastError.includes('function')) {
                console.log("  → DLL loaded but functions not exported properly");
                console.log("  → Check Go export function signatures");
            }
        } else {
            if (lastError.includes('symbol') || lastError.includes('undefined')) {
                console.log("  → Static linking issue - Go symbols not found");
                console.log("  → Check if Go library is properly linked");
            } else if (lastError.includes('Initialize')) {
                console.log("  → Go library found but initialization failed");
            }
        }
    }
});

// Test 4: Platform-Specific Error Handling
testSection("Platform-Specific Error Handling", () => {
    console.log("Testing platform-specific error scenarios...");
    
    // Test error handling when Go backend is not available
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Testing error handling with unavailable Go backend...");
        
        // These should return error results, not crash
        const testCases = [
            { name: 'createCommand', fn: () => addon.createCommand('test') },
            { name: 'addOption', fn: () => addon.addOption(1, '-t', 'test') },
            { name: 'addArgument', fn: () => addon.addArgument(1, 'arg', 'test') },
            { name: 'parseArgs', fn: () => addon.parseArgs(1, ['--test']) },
            { name: 'getHelp', fn: () => addon.getHelp(1) }
        ];
        
        for (const testCase of testCases) {
            try {
                const result = testCase.fn();
                console.log(`  ${testCase.name}: ${JSON.stringify(result).substring(0, 100)}...`);
                
                // Should return error result, not crash
                assert(result !== null && result !== undefined, 
                    `${testCase.name} should return a result`);
                
            } catch (error) {
                console.log(`  ${testCase.name}: Exception - ${error.message}`);
                // Exceptions are acceptable as long as they don't crash
            }
        }
        
    } else {
        console.log("  Go backend available - testing with valid backend...");
        
        // Test with valid Go backend
        try {
            const cmdResult = addon.createCommand('platform-test');
            console.log(`  createCommand result: ${JSON.stringify(cmdResult)}`);
            
            if (cmdResult.success) {
                const optResult = addon.addOption(cmdResult.data, '-p, --platform', 
                    `Platform test option for ${platform}`);
                console.log(`  addOption result: ${JSON.stringify(optResult)}`);
            }
            
        } catch (error) {
            throw new Error(`Valid backend test failed: ${error.message}`);
        }
    }
});

// Test 5: Memory and Resource Management
testSection("Memory and Resource Management", () => {
    console.log("Testing memory and resource management...");
    
    const isAvailable = addon.isGoAvailable();
    
    if (!isAvailable) {
        console.log("  Skipping memory tests - Go backend not available");
        return;
    }
    
    // Test creating multiple commands to check for memory leaks
    const commands = [];
    const numCommands = 50;
    
    console.log(`  Creating ${numCommands} commands...`);
    
    for (let i = 0; i < numCommands; i++) {
        try {
            const result = addon.createCommand(`mem-test-${i}`);
            if (result.success) {
                commands.push(result.data);
                
                // Add some options and arguments to each command
                addon.addOption(result.data, `-o${i}`, `Option ${i}`);
                addon.addArgument(result.data, `arg${i}`, `Argument ${i}`);
            }
        } catch (error) {
            console.log(`  Command creation ${i} failed: ${error.message}`);
        }
    }
    
    console.log(`  Successfully created ${commands.length} commands`);
    
    // Test memory management functions if available
    if (typeof addon.addRef === 'function' && typeof addon.release === 'function') {
        console.log("  Testing reference counting...");
        
        for (const cmdId of commands.slice(0, 10)) { // Test first 10
            try {
                const addRefResult = addon.addRef(cmdId);
                const releaseResult = addon.release(cmdId);
                
                console.log(`  Command ${cmdId}: addRef=${JSON.stringify(addRefResult)}, release=${JSON.stringify(releaseResult)}`);
            } catch (error) {
                console.log(`  Reference counting failed for command ${cmdId}: ${error.message}`);
            }
        }
    } else {
        console.log("  Reference counting functions not available");
    }
    
    // Force garbage collection if available
    if (global.gc) {
        console.log("  Running garbage collection...");
        global.gc();
    }
    
    console.log("  Memory management test completed");
});

// Test 6: Cross-Platform Function Export Verification
testSection("Cross-Platform Function Export Verification", () => {
    console.log("Verifying function exports across platforms...");
    
    const expectedFunctions = {
        basic: ['hello', 'version', 'isGoAvailable', 'getLastError'],
        go: ['createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp'],
        memory: ['addRef', 'release'],
        initialization: ['initializeGo', 'cleanupGo']
    };
    
    // Check basic functions (should always be available)
    for (const funcName of expectedFunctions.basic) {
        const available = typeof addon[funcName] === 'function';
        console.log(`  ${funcName}: ${available ? '✓' : '✗'}`);
        assert(available, `Basic function ${funcName} should be available`);
    }
    
    // Check Go functions (availability depends on backend)
    const goAvailable = addon.isGoAvailable();
    console.log(`\n  Go backend available: ${goAvailable}`);
    
    for (const funcName of expectedFunctions.go) {
        const available = typeof addon[funcName] === 'function';
        console.log(`  ${funcName}: ${available ? '✓' : '✗'}`);
        assert(available, `Go function ${funcName} should be exported`);
    }
    
    // Check optional functions
    for (const funcName of expectedFunctions.memory) {
        const available = typeof addon[funcName] === 'function';
        console.log(`  ${funcName}: ${available ? '✓' : '✗ (optional)'}`);
    }
    
    for (const funcName of expectedFunctions.initialization) {
        const available = typeof addon[funcName] === 'function';
        console.log(`  ${funcName}: ${available ? '✓' : '✗ (optional)'}`);
    }
});

console.log("=== Platform Loading Tests Completed ===");
console.log(`\nSummary for ${platform} (${arch}):`);
console.log(`- Addon loaded: ✓`);
console.log(`- Go backend available: ${addon.isGoAvailable() ? '✓' : '✗'}`);
if (!addon.isGoAvailable()) {
    console.log(`- Error: ${addon.getLastError()}`);
}
console.log(`- All tests completed successfully: ✓`);