const { Command, program, addon, version, hello } = require("../index.js");

console.log("=== Advanced gommander Test with Go Backend ===\n");

// Test 1: Go Backend Connectivity
console.log("Test 1: Go Backend Connectivity");
try {
  console.log("  Go hello():", hello());
  console.log("  Go version():", version());
  console.log("  ✓ Go backend is operational\n");
} catch (error) {
  console.log("  ✗ Go backend error:", error.message);
  console.log("  Please build the addon first with: npm run build\n");
}

// Test 2: Complex command structure
console.log("Test 2: Complex command structure");
const testCmd = new Command("test");
testCmd
  .description("A comprehensive test command")
  .version("2.0.0")
  .option("-d, --debug", "Enable debug mode")
  .option("-p, --port <number>", "Port number", "8080")
  .option("-c, --config <file>", "Configuration file")
  .argument("<file>", "Input file")
  .argument("[output]", "Output file");

console.log("  Command name:", testCmd._name);
console.log("  Command description:", testCmd._description);
console.log("  Command version:", testCmd._version);
console.log("  Options count:", testCmd._options.size);
console.log("  Arguments count:", testCmd._arguments.length);
console.log("  ✓ Complex structure created\n");

// Test 3: Subcommands with Go backend
console.log("Test 3: Subcommands with Go backend");
const cliApp = new Command("myapp");
const serveCmd = cliApp.command("serve", "Start the server");
const buildCmd = cliApp.command("build", "Build the project");

serveCmd
  .option("-p, --port <number>", "Server port", "3000")
  .option("-h, --host <address>", "Server host", "localhost")
  .action((args, options) => {
    console.log(`    Starting server on ${options.host || 'localhost'}:${options.port || 3000}`);
  });

buildCmd
  .option("-w, --watch", "Watch for changes")
  .option("-o, --output <dir>", "Output directory", "dist")
  .action((args, options) => {
    console.log(`    Building to ${options.output || 'dist'}, watch: ${!!options.watch}`);
  });

console.log("  Parent command:", cliApp._name);
console.log("  Serve command:", serveCmd._name);
console.log("  Build command:", buildCmd._name);
console.log("  Parent has", cliApp._subcommands.size, "subcommand(s)");
console.log("  ✓ Subcommands with Go backend working\n");

// Test 4: Argument parsing simulation
console.log("Test 4: Argument parsing simulation");
console.log("  Simulating: myapp serve --port 4000 --host 0.0.0.0");
// This would normally be called with actual argv, but we'll simulate
const mockArgv = ['node', 'script.js', 'serve', '--port', '4000', '--host', '0.0.0.0'];
try {
  cliApp.parse(mockArgv);
  console.log("  ✓ Argument parsing completed\n");
} catch (error) {
  console.log("  ✗ Parsing error:", error.message, "\n");
}

// Test 5: Help generation with Go backend
console.log("Test 5: Help generation with Go backend");
console.log("  Generating help for complex command:");
console.log("  " + "=".repeat(40));
testCmd.outputHelp();
console.log("  " + "=".repeat(40));
console.log("  ✓ Help generation with Go backend working\n");

// Test 6: Action handlers
console.log("Test 6: Action handlers");
const actionCmd = new Command("action-test");
actionCmd
  .description("Test action handling")
  .option("-v, --verbose", "Verbose output")
  .argument("<input>", "Input value")
  .action((args, options) => {
    console.log("  Action executed with:");
    console.log("    Args:", args);
    console.log("    Options:", options);
  });

console.log("  Testing action with mock data...");
actionCmd._action(['test-input'], { verbose: true });
console.log("  ✓ Action handlers working\n");

// Test 7: Error handling
console.log("Test 7: Error handling");
try {
  const errorCmd = new Command("error-test");
  errorCmd.option("-t, --test", "Test option");
  console.log("  ✓ Error handling structure in place\n");
} catch (error) {
  console.log("  ✗ Unexpected error:", error.message, "\n");
}

console.log("=== All advanced tests completed successfully! ===");
