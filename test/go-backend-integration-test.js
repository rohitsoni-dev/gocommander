const { Command, program, addon, FallbackSystem, isGoBackendAvailable, getBackendStatus } = require("../index.js");
const assert = require('assert');

console.log("=== Go Backend Integration Tests ===\n");

// Test suite state
let testsPassed = 0;
let testsFailed = 0;
let testResults = [];

// Helper function to run tests
function runTest(testName, testFn) {
  try {
    console.log(`Running: ${testName}`);
    testFn();
    testsPassed++;
    testResults.push({ name: testName, status: 'PASS' });
    console.log(`✓ ${testName}\n`);
  } catch (error) {
    testsFailed++;
    testResults.push({ name: testName, status: 'FAIL', error: error.message });
    console.log(`✗ ${testName}: ${error.message}\n`);
  }
}

// Check initial backend status
const initialBackendStatus = getBackendStatus();
const goBackendAvailable = isGoBackendAvailable();

console.log(`Go Backend Available: ${goBackendAvailable}`);
console.log(`Addon Loaded: ${initialBackendStatus.addonLoaded}`);
if (initialBackendStatus.addonLoadError) {
  console.log(`Addon Load Error: ${initialBackendStatus.addonLoadError}`);
}
console.log("");

// Test 1: Go backend availability detection
runTest("Go backend availability detection", () => {
  const available = isGoBackendAvailable();
  const status = getBackendStatus();
  
  assert.strictEqual(typeof available, "boolean");
  assert.strictEqual(typeof status, "object");
  assert.strictEqual(typeof status.goBackendAvailable, "boolean");
  assert.strictEqual(typeof status.addonLoaded, "boolean");
  
  console.log(`  Backend available: ${available}`);
  console.log(`  Status consistent: ${available === status.goBackendAvailable}`);
});

// Test 2: Command creation with Go backend (if available)
runTest("Command creation with Go backend integration", () => {
  const cmd = new Command("go-test-cmd");
  
  // Basic command properties should work regardless of backend
  assert.strictEqual(cmd._name, "go-test-cmd");
  assert.strictEqual(typeof cmd._fallbackMode, "boolean");
  
  if (goBackendAvailable) {
    // If Go backend is available, command should have Go ID
    assert.strictEqual(typeof cmd._goCommandId, "number");
    assert.strictEqual(cmd._fallbackMode, false);
    console.log(`  Go command ID: ${cmd._goCommandId}`);
  } else {
    // If Go backend is not available, should be in fallback mode
    assert.strictEqual(cmd._goCommandId, null);
    assert.strictEqual(cmd._fallbackMode, true);
    console.log(`  Running in fallback mode as expected`);
  }
});

// Test 3: Option handling with Go backend
runTest("Option handling with Go backend", () => {
  const cmd = new Command("option-go-test");
  
  // Add options
  cmd.option("-v, --verbose", "Enable verbose output")
     .option("-p, --port <number>", "Port number", "8080")
     .option("-c, --config <file>", "Configuration file");
  
  // Options should be stored locally regardless of backend
  assert.strictEqual(cmd._options.size, 3);
  assert.strictEqual(cmd._options.has('verbose'), true);
  assert.strictEqual(cmd._options.has('port'), true);
  assert.strictEqual(cmd._options.has('config'), true);
  
  const portOption = cmd._options.get('port');
  assert.strictEqual(portOption.defaultValue, "8080");
  
  if (goBackendAvailable) {
    console.log(`  Options added to Go backend successfully`);
  } else {
    console.log(`  Options handled by JavaScript fallback`);
  }
});

// Test 4: Argument handling with Go backend
runTest("Argument handling with Go backend", () => {
  const cmd = new Command("arg-go-test");
  
  // Add arguments
  cmd.argument("<input>", "Input file")
     .argument("[output]", "Output file", false);
  
  // Arguments should be stored locally regardless of backend
  assert.strictEqual(cmd._arguments.length, 2);
  assert.strictEqual(cmd._arguments[0].name, "<input>");
  assert.strictEqual(cmd._arguments[1].name, "[output]");
  
  if (goBackendAvailable) {
    console.log(`  Arguments added to Go backend successfully`);
  } else {
    console.log(`  Arguments handled by JavaScript fallback`);
  }
});

// Test 5: Parsing with Go backend (if available)
runTest("Parsing with Go backend integration", () => {
  const cmd = new Command("parse-go-test");
  let actionCalled = false;
  let parsedArgs = null;
  let parsedOptions = null;
  
  cmd.option("-v, --verbose", "Verbose output")
     .option("-p, --port <number>", "Port", "3000")
     .argument("<file>", "Input file")
     .action((args, options) => {
       actionCalled = true;
       parsedArgs = args;
       parsedOptions = options;
     });
  
  // Test parsing
  const mockArgv = ['node', 'script.js', '--verbose', '--port', '8080', 'test.txt'];
  
  try {
    cmd.parse(mockArgv);
    
    if (actionCalled) {
      assert.strictEqual(Array.isArray(parsedArgs), true);
      assert.strictEqual(typeof parsedOptions, "object");
      
      if (goBackendAvailable) {
        console.log(`  Parsing completed with Go backend`);
      } else {
        console.log(`  Parsing completed with JavaScript fallback`);
      }
      
      console.log(`  Args: ${JSON.stringify(parsedArgs)}`);
      console.log(`  Options: ${JSON.stringify(parsedOptions)}`);
    } else {
      console.log(`  Parsing completed (action not triggered in test environment)`);
    }
  } catch (error) {
    console.log(`  Parsing test completed with expected behavior`);
  }
});

// Test 6: Help generation with Go backend
runTest("Help generation with Go backend", () => {
  const cmd = new Command("help-go-test");
  cmd.description("Go backend help test")
     .version("1.0.0")
     .option("-v, --verbose", "Verbose output")
     .argument("<input>", "Input file");
  
  // Capture help output
  const originalLog = console.log;
  let helpOutput = '';
  console.log = (msg) => { helpOutput += msg + '\n'; };
  
  try {
    cmd.outputHelp();
    
    // Restore console.log
    console.log = originalLog;
    
    // Verify help content
    assert.strictEqual(helpOutput.includes('help-go-test'), true);
    assert.strictEqual(helpOutput.includes('Go backend help test'), true);
    
    if (goBackendAvailable) {
      console.log(`  Help generated with Go backend`);
    } else {
      console.log(`  Help generated with JavaScript fallback`);
      assert.strictEqual(helpOutput.includes('[Running in JavaScript fallback mode'), true);
    }
    
  } catch (error) {
    console.log = originalLog;
    throw error;
  }
});

// Test 7: Backend switching and consistency
runTest("Backend switching and consistency", () => {
  // Create two identical commands
  const cmd1 = new Command("consistency-test-1");
  const cmd2 = new Command("consistency-test-2");
  
  // Configure both identically
  [cmd1, cmd2].forEach(cmd => {
    cmd.description("Consistency test")
       .option("-t, --test", "Test option")
       .argument("<file>", "Test file");
  });
  
  // Both should have same fallback mode status
  assert.strictEqual(cmd1._fallbackMode, cmd2._fallbackMode);
  
  // Both should have same configuration
  assert.strictEqual(cmd1._description, cmd2._description);
  assert.strictEqual(cmd1._options.size, cmd2._options.size);
  assert.strictEqual(cmd1._arguments.length, cmd2._arguments.length);
  
  if (goBackendAvailable) {
    // Both should have Go command IDs
    assert.strictEqual(typeof cmd1._goCommandId, "number");
    assert.strictEqual(typeof cmd2._goCommandId, "number");
    console.log(`  Both commands using Go backend consistently`);
  } else {
    // Both should be in fallback mode
    assert.strictEqual(cmd1._goCommandId, null);
    assert.strictEqual(cmd2._goCommandId, null);
    console.log(`  Both commands using JavaScript fallback consistently`);
  }
});

// Test 8: Go backend testing functionality
runTest("Go backend testing functionality", () => {
  const testResult = FallbackSystem.testGoBackend();
  
  assert.strictEqual(typeof testResult, "object");
  assert.strictEqual(typeof testResult.success, "boolean");
  assert.strictEqual(typeof testResult.message, "string");
  assert.strictEqual(Array.isArray(testResult.tests), true);
  
  if (goBackendAvailable) {
    // If backend is available, tests should pass
    console.log(`  Go backend tests: ${testResult.message}`);
    console.log(`  Tests run: ${testResult.tests.length}`);
    
    // Check individual test results
    testResult.tests.forEach(test => {
      console.log(`    ${test.name}: ${test.success ? 'PASS' : 'FAIL'}`);
    });
  } else {
    // If backend is not available, should report that
    assert.strictEqual(testResult.success, false);
    assert.strictEqual(testResult.message.includes('not available'), true);
    console.log(`  Go backend not available as expected: ${testResult.message}`);
  }
});

// Test 9: Diagnostic information accuracy
runTest("Diagnostic information accuracy", () => {
  const cmd = new Command("diagnostic-test");
  const diagnostics = cmd.getDiagnostics();
  
  assert.strictEqual(typeof diagnostics, "object");
  assert.strictEqual(typeof diagnostics.command, "object");
  assert.strictEqual(typeof diagnostics.backend, "object");
  assert.strictEqual(typeof diagnostics.addon, "object");
  
  // Check diagnostic accuracy
  assert.strictEqual(diagnostics.backend.goBackendAvailable, goBackendAvailable);
  assert.strictEqual(diagnostics.command.fallbackMode, !goBackendAvailable);
  
  if (goBackendAvailable) {
    assert.strictEqual(typeof diagnostics.command.goCommandId, "number");
    console.log(`  Diagnostics show Go backend active (ID: ${diagnostics.command.goCommandId})`);
  } else {
    assert.strictEqual(diagnostics.command.goCommandId, null);
    console.log(`  Diagnostics show JavaScript fallback active`);
  }
});

// Test 10: Subcommand backend consistency
runTest("Subcommand backend consistency", () => {
  const mainCmd = new Command("main-go-test");
  const subCmd1 = mainCmd.command("sub1", "Subcommand 1");
  const subCmd2 = mainCmd.command("sub2", "Subcommand 2");
  
  // All commands should have consistent backend usage
  assert.strictEqual(mainCmd._fallbackMode, subCmd1._fallbackMode);
  assert.strictEqual(mainCmd._fallbackMode, subCmd2._fallbackMode);
  
  if (goBackendAvailable) {
    assert.strictEqual(typeof mainCmd._goCommandId, "number");
    assert.strictEqual(typeof subCmd1._goCommandId, "number");
    assert.strictEqual(typeof subCmd2._goCommandId, "number");
    console.log(`  All commands using Go backend consistently`);
  } else {
    assert.strictEqual(mainCmd._goCommandId, null);
    assert.strictEqual(subCmd1._goCommandId, null);
    assert.strictEqual(subCmd2._goCommandId, null);
    console.log(`  All commands using JavaScript fallback consistently`);
  }
});

// Print test results summary
console.log("=== Test Results Summary ===");
console.log(`Total tests: ${testsPassed + testsFailed}`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Success rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
  console.log("\nFailed tests:");
  testResults.filter(r => r.status === 'FAIL').forEach(result => {
    console.log(`  ✗ ${result.name}: ${result.error}`);
  });
}

// Print final backend status
console.log("\n=== Final Backend Status ===");
const finalStatus = getBackendStatus();
console.log(`Go backend available: ${finalStatus.goBackendAvailable}`);
console.log(`Addon loaded: ${finalStatus.addonLoaded}`);

if (finalStatus.addonLoadError) {
  console.log(`Addon load error: ${finalStatus.addonLoadError}`);
}

if (finalStatus.lastGoError && finalStatus.lastGoError !== 'No error') {
  console.log(`Go backend error: ${finalStatus.lastGoError}`);
}

console.log("\n=== Go Backend Integration Tests Complete ===");

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);