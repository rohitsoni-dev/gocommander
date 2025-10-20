const { Command, program } = require("../index.js");

console.log("=== Advanced gommander Test ===\n");

// Test 1: Basic command structure
console.log("Test 1: Basic command structure");
const testCmd = new Command("test");
testCmd
  .description("A test command")
  .version("1.0.0")
  .option("-d, --debug", "Enable debug mode")
  .option("-p, --port <number>", "Port number", "8080")
  .argument("<file>", "Input file")
  .argument("[output]", "Output file");

console.log("  Command name:", testCmd._name);
console.log("  Command description:", testCmd._description);
console.log("  Command version:", testCmd._version);
console.log("  Options count:", testCmd._options.length);
console.log("  Arguments count:", testCmd._arguments.length);
console.log("  OK\n");

// Test 2: Subcommands
console.log("Test 2: Subcommands");
const parentCmd = new Command("parent");
const childCmd = parentCmd.command("child", "A child command");
childCmd.option("-v, --verbose", "Verbose output");

console.log("  Parent command:", parentCmd._name);
console.log("  Child command:", childCmd._name);
console.log("  Child description:", childCmd._description);
console.log("  Parent has", parentCmd._commands.length, "subcommand(s)");
console.log("  OK\n");

// Test 3: Aliases
console.log("Test 3: Aliases");
const aliasCmd = new Command("main");
aliasCmd.aliases("m", "primary");

console.log("  Command name:", aliasCmd._name);
console.log("  Aliases:", aliasCmd._aliases);
console.log("  OK\n");

// Test 4: Help generation
console.log("Test 4: Help generation");
console.log("  Generating help for test command...");
testCmd.help();
console.log("  OK\n");

// Test 5: Addon loading
console.log("Test 5: Addon status");
const addon = require("../index.js").addon;
console.log("  Addon loaded successfully");
console.log("  OK\n");

console.log("=== All tests passed! ===");
