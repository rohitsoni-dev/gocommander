const Command = require("./src/Command");
const goBridge = require("./src/GoCommandBridge");

// Create the main program instance
const program = new Command();

// Export the Command class, program instance, and addon
module.exports = {
  Command,
  program,
  addon: goBridge.getAddon(),
  createCommand: (name) => new Command(name),
};
