const { program, Command } = require("../index.js");

// Test basic functionality
console.log("Testing gommander...");

// Test program creation
console.log("Program name:", program.name());
console.log("Program description:", program.description());

// Test command creation
const testCommand = new Command("test");
testCommand
  .description("A test command")
  .option("-t, --test <value>", "A test option", "default")
  .argument("<file>", "A test argument");

console.log("Command name:", testCommand.name());
console.log("Command description:", testCommand.description());

// Test option addition
console.log("Options count:", testCommand._options.length);
if (testCommand._options.length > 0) {
  console.log("First option flags:", testCommand._options[0].flags);
  console.log("First option description:", testCommand._options[0].description);
  console.log(
    "First option default value:",
    testCommand._options[0].defaultValue
  );
}

// Test argument addition
console.log("Arguments count:", testCommand._arguments.length);
if (testCommand._arguments.length > 0) {
  console.log("First argument name:", testCommand._arguments[0].name);
  console.log(
    "First argument description:",
    testCommand._arguments[0].description
  );
}

// Test addon loading
try {
  const addon = require("../build/Release/gommander.node");
  console.log("Addon successfully loaded!");
  console.log("Test passed!");
} catch (error) {
  console.log("Addon not yet built or not available:", error.message);
  console.log("This is expected if you haven't built the addon yet.");
}

console.log("Basic tests completed.");
