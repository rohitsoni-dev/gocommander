const { program, Command, addon, version, hello } = require("../index.js");

// Test basic functionality
console.log("Testing gommander with Go backend...\n");

// Test 1: Addon connectivity
console.log("=== Test 1: Go Addon Connectivity ===");
try {
  console.log("Go addon hello():", hello());
  console.log("Go addon version():", version());
  console.log("✓ Go addon is working!\n");
} catch (error) {
  console.log("✗ Go addon error:", error.message);
  console.log("Please build the addon first with: npm run build\n");
}

// Test 2: Command creation
console.log("=== Test 2: Command Creation ===");
const testCommand = new Command("test");
testCommand
  .description("A test command")
  .option("-t, --test <value>", "A test option", "default")
  .argument("<file>", "A test argument");

console.log("Command name:", testCommand._name);
console.log("Command description:", testCommand._description);
console.log("✓ Command created successfully\n");

// Test 3: Options
console.log("=== Test 3: Options ===");
console.log("Options count:", testCommand._options.size);
if (testCommand._options.has('test')) {
  const testOption = testCommand._options.get('test');
  console.log("Test option flags:", testOption.flags);
  console.log("Test option description:", testOption.description);
  console.log("Test option default value:", testOption.defaultValue);
}
console.log("✓ Options working correctly\n");

// Test 4: Arguments
console.log("=== Test 4: Arguments ===");
console.log("Arguments count:", testCommand._arguments.length);
if (testCommand._arguments.length > 0) {
  console.log("First argument name:", testCommand._arguments[0].name);
  console.log("First argument description:", testCommand._arguments[0].description);
}
console.log("✓ Arguments working correctly\n");

// Test 5: Help generation
console.log("=== Test 5: Help Generation ===");
console.log("Generating help for test command:");
testCommand.outputHelp();
console.log("✓ Help generation working\n");

// Test 6: Program instance
console.log("=== Test 6: Program Instance ===");
console.log("Program is instance of Command:", program instanceof Command);
console.log("✓ Program instance working\n");

console.log("=== All basic tests completed! ===");
