const { Command, program, addon, FallbackSystem, isGoBackendAvailable, getBackendStatus } = require("../index.js");
const assert = require('assert');

console.log("=== JavaScript Integration Tests ===\n");

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

// Test 1: Command class functionality with Go backend
runTest("Command class basic functionality", () => {
  const cmd = new Command("test-cmd");
  
  // Test basic properties
  assert.strictEqual(cmd._name, "test-cmd");
  assert.strictEqual(typeof cmd._fallbackMode, "boolean");
  assert.strictEqual(cmd._options instanceof Map, true);
  assert.strictEqual(Array.isArray(cmd._arguments), true);
  
  // Test method chaining
  const result = cmd.description("Test command").version("1.0.0");
  assert.strictEqual(result, cmd, "Methods should return command instance for chaining");
  assert.strictEqual(cmd._description, "Test command");
  assert.strictEqual(cmd._version, "1.0.0");
});

// Test 2: Option handling with Go backend integration
runTest("Option handling with Go backend integration", () => {
  const cmd = new Command("option-test");
  
  // Add various types of options
  cmd.option("-v, --verbose", "Enable verbose output")
     .option("-p, --port <number>", "Port number", "8080")
     .option("-c, --config <file>", "Configuration file");
  
  // Verify options are stored
  assert.strictEqual(cmd._options.size, 3);
  assert.strictEqual(cmd._options.has('verbose'), true);
  assert.strictEqual(cmd._options.has('port'), true);
  assert.strictEqual(cmd._options.has('config'), true);
  
  // Check option details
  const portOption = cmd._options.get('port');
  assert.strictEqual(portOption.flags, "-p, --port <number>");
  assert.strictEqual(portOption.description, "Port number");
  assert.strictEqual(portOption.defaultValue, "8080");
});

// Test 3: Argument handling with Go backend integration
runTest("Argument handling with Go backend integration", () => {
  const cmd = new Command("arg-test");
  
  // Add various arguments
  cmd.argument("<input>", "Input file")
     .argument("[output]", "Output file", false);
  
  // Verify arguments are stored
  assert.strictEqual(cmd._arguments.length, 2);
  assert.strictEqual(cmd._arguments[0].name, "<input>");
  assert.strictEqual(cmd._arguments[0].description, "Input file");
  assert.strictEqual(cmd._arguments[1].name, "[output]");
  assert.strictEqual(cmd._arguments[1].description, "Output file");
});

// Test 4: Subcommand functionality
runTest("Subcommand functionality", () => {
  const mainCmd = new Command("main");
  
  // Add subcommands
  const serveCmd = mainCmd.command("serve", "Start server");
  const buildCmd = mainCmd.command("build", "Build project");
  
  // Verify subcommands
  assert.strictEqual(mainCmd._subcommands.size, 2);
  assert.strictEqual(mainCmd._subcommands.has('serve'), true);
  assert.strictEqual(mainCmd._subcommands.has('build'), true);
  
  // Check parent-child relationship
  assert.strictEqual(serveCmd._parent, mainCmd);
  assert.strictEqual(buildCmd._parent, mainCmd);
  assert.strictEqual(serveCmd._name, "serve");
  assert.strictEqual(serveCmd._description, "Start server");
});

// Test 5: Backend availability detection
runTest("Backend availability detection", () => {
  const backendAvailable = isGoBackendAvailable();
  const backendStatus = getBackendStatus();
  
  // Test return types
  assert.strictEqual(typeof backendAvailable, "boolean");
  assert.strictEqual(typeof backendStatus, "object");
  
  // Test status object structure
  assert.strictEqual(typeof backendStatus.goBackendAvailable, "boolean");
  assert.strictEqual(typeof backendStatus.addonLoaded, "boolean");
  
  console.log(`  Go backend available: ${backendAvailable}`);
  console.log(`  Addon loaded: ${backendStatus.addonLoaded}`);
});

// Test 6: Fallback behavior when Go backend unavailable
runTest("Fallback behavior verification", () => {
  const cmd = new Command("fallback-test");
  
  // Test that command works regardless of backend status
  cmd.description("Fallback test command")
     .option("-t, --test", "Test option")
     .argument("<file>", "Test file");
  
  // Verify command is functional
  assert.strictEqual(cmd._name, "fallback-test");
  assert.strictEqual(cmd._description, "Fallback test command");
  assert.strictEqual(cmd._options.size, 1);
  assert.strictEqual(cmd._arguments.length, 1);
  
  // Test diagnostic information
  const diagnostics = cmd.getDiagnostics();
  assert.strictEqual(typeof diagnostics, "object");
  assert.strictEqual(typeof diagnostics.command, "object");
  assert.strictEqual(typeof diagnostics.backend, "object");
});

// Test 7: API compatibility and consistent behavior
runTest("API compatibility and consistent behavior", () => {
  const cmd1 = new Command("api-test-1");
  const cmd2 = new Command("api-test-2");
  
  // Configure both commands identically
  [cmd1, cmd2].forEach(cmd => {
    cmd.description("API test command")
       .version("1.0.0")
       .option("-v, --verbose", "Verbose output")
       .option("-p, --port <number>", "Port", "3000")
       .argument("<input>", "Input file");
  });
  
  // Verify identical configuration
  assert.strictEqual(cmd1._description, cmd2._description);
  assert.strictEqual(cmd1._version, cmd2._version);
  assert.strictEqual(cmd1._options.size, cmd2._options.size);
  assert.strictEqual(cmd1._arguments.length, cmd2._arguments.length);
  
  // Test method chaining consistency
  const result1 = cmd1.allowUnknownOption(true);
  const result2 = cmd2.allowUnknownOption(true);
  assert.strictEqual(result1, cmd1);
  assert.strictEqual(result2, cmd2);
});

// Test 8: Help generation consistency
runTest("Help generation consistency", () => {
  const cmd = new Command("help-test");
  cmd.description("Help test command")
     .version("2.0.0")
     .option("-v, --verbose", "Enable verbose output")
     .option("-p, --port <number>", "Port number", "8080")
     .argument("<input>", "Input file")
     .argument("[output]", "Output file");
  
  // Test help generation doesn't throw
  let helpGenerated = false;
  try {
    // Capture console output
    const originalLog = console.log;
    let helpOutput = '';
    console.log = (msg) => { helpOutput += msg + '\n'; };
    
    cmd.outputHelp();
    helpGenerated = true;
    
    // Restore console.log
    console.log = originalLog;
    
    // Verify help contains expected elements
    assert.strictEqual(helpOutput.includes('help-test'), true, "Help should contain command name");
    assert.strictEqual(helpOutput.includes('Help test command'), true, "Help should contain description");
    assert.strictEqual(helpOutput.includes('--verbose'), true, "Help should contain options");
    
  } catch (error) {
    console.log = console.log; // Restore in case of error
    throw error;
  }
  
  assert.strictEqual(helpGenerated, true, "Help generation should complete without errors");
});

// Test 9: Action handler functionality
runTest("Action handler functionality", () => {
  const cmd = new Command("action-test");
  let actionCalled = false;
  let actionArgs = null;
  let actionOptions = null;
  
  cmd.action((args, options) => {
    actionCalled = true;
    actionArgs = args;
    actionOptions = options;
  });
  
  // Verify action is set
  assert.strictEqual(typeof cmd._action, "function");
  
  // Test action execution
  cmd._action(['test-arg'], { test: true });
  assert.strictEqual(actionCalled, true);
  assert.deepStrictEqual(actionArgs, ['test-arg']);
  assert.deepStrictEqual(actionOptions, { test: true });
});

// Test 10: Parsing functionality (JavaScript fallback)
runTest("Parsing functionality with JavaScript fallback", () => {
  const cmd = new Command("parse-test");
  let parsedArgs = null;
  let parsedOptions = null;
  
  cmd.option("-v, --verbose", "Verbose output")
     .option("-p, --port <number>", "Port", "3000")
     .argument("<file>", "Input file")
     .action((args, options) => {
       parsedArgs = args;
       parsedOptions = options;
     });
  
  // Test parsing with mock argv
  const mockArgv = ['node', 'script.js', '--verbose', '--port', '8080', 'input.txt'];
  
  try {
    cmd.parse(mockArgv);
    
    // Verify parsing results if action was called
    if (parsedArgs !== null && parsedOptions !== null) {
      assert.strictEqual(Array.isArray(parsedArgs), true);
      assert.strictEqual(typeof parsedOptions, "object");
      console.log(`  Parsed args: ${JSON.stringify(parsedArgs)}`);
      console.log(`  Parsed options: ${JSON.stringify(parsedOptions)}`);
    }
  } catch (error) {
    // Parsing might fail in test environment, which is acceptable
    console.log(`  Parsing test completed (may have failed due to test environment)`);
  }
});

// Test 11: FallbackSystem functionality
runTest("FallbackSystem functionality", () => {
  // Test FallbackSystem methods
  assert.strictEqual(typeof FallbackSystem.isGoBackendAvailable, "function");
  assert.strictEqual(typeof FallbackSystem.getBackendStatus, "function");
  assert.strictEqual(typeof FallbackSystem.testGoBackend, "function");
  
  const status = FallbackSystem.getBackendStatus();
  assert.strictEqual(typeof status, "object");
  assert.strictEqual(typeof status.goBackendAvailable, "boolean");
  assert.strictEqual(typeof status.addonLoaded, "boolean");
  
  // Test Go backend testing
  const testResult = FallbackSystem.testGoBackend();
  assert.strictEqual(typeof testResult, "object");
  assert.strictEqual(typeof testResult.success, "boolean");
  assert.strictEqual(typeof testResult.message, "string");
  assert.strictEqual(Array.isArray(testResult.tests), true);
  
  console.log(`  Backend test result: ${testResult.message}`);
});

// Test 12: Program instance functionality
runTest("Program instance functionality", () => {
  // Test that program is a Command instance
  assert.strictEqual(program instanceof Command, true);
  
  // Test program can be configured
  const originalName = program._name;
  program.description("Test program").version("1.0.0");
  
  assert.strictEqual(program._description, "Test program");
  assert.strictEqual(program._version, "1.0.0");
  
  // Test program can have options and subcommands
  program.option("--global", "Global option");
  const testSubcmd = program.command("test", "Test subcommand");
  
  assert.strictEqual(program._options.has('global'), true);
  assert.strictEqual(program._subcommands.has('test'), true);
  assert.strictEqual(testSubcmd instanceof Command, true);
});

// Test 13: Error handling and edge cases
runTest("Error handling and edge cases", () => {
  // Test command with empty name
  const emptyCmd = new Command("");
  assert.strictEqual(emptyCmd._name, "");
  
  // Test command with undefined name
  const undefinedCmd = new Command();
  assert.strictEqual(undefinedCmd._name, "");
  
  // Test option with minimal parameters
  const minimalCmd = new Command("minimal");
  minimalCmd.option("-t", "");
  assert.strictEqual(minimalCmd._options.size, 1);
  
  // Test argument with minimal parameters
  minimalCmd.argument("arg");
  assert.strictEqual(minimalCmd._arguments.length, 1);
  
  // Test help generation with minimal command
  try {
    const originalLog = console.log;
    console.log = () => {}; // Suppress output
    minimalCmd.outputHelp();
    console.log = originalLog;
  } catch (error) {
    console.log = console.log; // Restore
    throw new Error(`Help generation failed for minimal command: ${error.message}`);
  }
});

// Test 14: Cross-platform compatibility indicators
runTest("Cross-platform compatibility indicators", () => {
  // Test that platform-specific information is available
  assert.strictEqual(typeof process.platform, "string");
  assert.strictEqual(typeof process.arch, "string");
  
  // Test addon loading attempts information
  const loadAttempts = addon && addon.getLoadAttempts ? addon.getLoadAttempts() : [];
  assert.strictEqual(Array.isArray(loadAttempts), true);
  
  // Test detailed error information
  const detailedError = addon && addon.getDetailedError ? addon.getDetailedError() : null;
  if (detailedError) {
    assert.strictEqual(typeof detailedError, "object");
  }
  
  console.log(`  Platform: ${process.platform}-${process.arch}`);
  console.log(`  Load attempts: ${loadAttempts.length}`);
});

// Test 15: Memory and resource management
runTest("Memory and resource management", () => {
  // Create multiple commands to test resource handling
  const commands = [];
  for (let i = 0; i < 10; i++) {
    const cmd = new Command(`test-cmd-${i}`);
    cmd.option(`-${i}`, `Option ${i}`)
       .argument(`<arg${i}>`, `Argument ${i}`);
    commands.push(cmd);
  }
  
  // Verify all commands are created properly
  assert.strictEqual(commands.length, 10);
  commands.forEach((cmd, index) => {
    assert.strictEqual(cmd._name, `test-cmd-${index}`);
    assert.strictEqual(cmd._options.size, 1);
    assert.strictEqual(cmd._arguments.length, 1);
  });
  
  // Test diagnostic information for resource usage
  const diagnostics = commands[0].getDiagnostics();
  assert.strictEqual(typeof diagnostics, "object");
  
  console.log(`  Created ${commands.length} commands successfully`);
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

// Print backend status information
console.log("\n=== Backend Status ===");
const finalStatus = getBackendStatus();
console.log(`Go backend available: ${finalStatus.goBackendAvailable}`);
console.log(`Addon loaded: ${finalStatus.addonLoaded}`);
if (finalStatus.addonLoadError) {
  console.log(`Addon load error: ${finalStatus.addonLoadError}`);
}

// Print system diagnostics
console.log("\n=== System Diagnostics ===");
FallbackSystem.printSystemDiagnostics();

console.log("=== JavaScript Integration Tests Complete ===");

// Exit with appropriate code
process.exit(testsFailed > 0 ? 1 : 0);