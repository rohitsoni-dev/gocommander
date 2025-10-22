// src/Command.js
const goBridge = require("./GoCommandBridge");

class Command {
  constructor(name) {
    this._name = name || "";
    this._description = "";
    this._version = "";
    this._commands = [];
    this._options = [];
    this._arguments = [];
    this._action = null;
    this._parent = null;
    this._aliases = [];
    this._allowUnknownOption = false;

    // Create the actual command using the bridge
    this._goCommand = goBridge.createCommand(this._name);
  }

  name(name) {
    if (arguments.length === 0) return this._name;
    this._name = name;
    return this;
  }

  description(desc) {
    if (arguments.length === 0) return this._description;
    this._description = desc;
    return this;
  }

  version(ver) {
    if (arguments.length === 0) return this._version;
    this._version = ver;
    return this;
  }

  option(flags, description, defaultValue) {
    this._options.push({
      flags: flags,
      description: description || "",
      defaultValue: defaultValue,
    });
    return this;
  }

  argument(name, description) {
    this._arguments.push({
      name: name,
      description: description || "",
    });
    return this;
  }

  command(name, description) {
    const cmd = new Command(name);
    cmd._parent = this;
    if (description) {
      cmd._description = description;
    }
    this._commands.push(cmd);

    // Add the command using the bridge
    goBridge.addCommand(this, cmd);

    return cmd;
  }

  alias(alias) {
    this._aliases.push(alias);
    return this;
  }

  aliases(...aliases) {
    this._aliases = aliases;
    return this;
  }

  action(fn) {
    this._action = fn;
    return this;
  }

  allowUnknownOption(allow = true) {
    this._allowUnknownOption = allow;
    return this;
  }

  parseArgs(argv) {
    // Parse using the bridge
    return goBridge.parse(this, argv);
  }

  outputHelp() {
    // Try to generate help using the bridge
    const goHelp = goBridge.generateHelp(this);

    // If Go help generation is not implemented, use JavaScript
    let name = this._name;
    if (this._parent) {
      name = `${this._parent._name} ${name}`;
    }

    console.log(
      `Usage: ${name} [options]${this._arguments
        .map((arg) => ` ${arg.name}`)
        .join("")}\n`
    );

    if (this._description) {
      console.log(`${this._description}\n`);
    }

    if (this._arguments.length > 0) {
      console.log("Arguments:");
      this._arguments.forEach((arg) => {
        console.log(`  ${arg.name}  ${arg.description}`);
      });
      console.log();
    }

    if (this._options.length > 0) {
      console.log("Options:");
      this._options.forEach((opt) => {
        const defaultValue =
          opt.defaultValue !== undefined
            ? ` (default: ${opt.defaultValue})`
            : "";
        console.log(`  ${opt.flags}  ${opt.description}${defaultValue}`);
      });
      console.log();
    }

    if (this._version) {
      console.log(`Version: ${this._version}\n`);
    }
  }

  help() {
    this.outputHelp();
    return this;
  }

  usage(str) {
    return this;
  }

  exitOverride(fn) {
    return this;
  }

  parse(argv) {
    if (!argv) {
      argv = process.argv;
    }

    // Use the bridge to parse
    const parsed = goBridge.parse(this, argv);

    // Skip node and script name
    const args = argv.slice(2);

    // Handle help command
    if (args[0] === "help") {
      const helpTarget = args[1];
      if (helpTarget) {
        // Show help for specific command
        const targetCmd = this._commands.find((c) => c._name === helpTarget);
        if (targetCmd) {
          targetCmd.outputHelp();
          process.exit(0);
        }
      }
      // If no specific command or command not found, show general help
      this.outputHelp();
      process.exit(0);
    }

    // Find the command
    const cmdName = args[0];
    const cmd = this._commands.find((c) => c._name === cmdName);

    if (cmd) {
      const cmdArgs = args.slice(1);
      const options = {};
      const positionalArgs = [];
      let collectingArgs = false;

      // Parse options and arguments
      for (let i = 0; i < cmdArgs.length; i++) {
        const arg = cmdArgs[i];

        // If we're already collecting args or this isn't an option flag, add to positional args
        if (collectingArgs || (!arg.startsWith("--") && !arg.startsWith("-"))) {
          positionalArgs.push(arg);
          collectingArgs = true;
          continue;
        }

        if (arg.startsWith("--")) {
          const [key, value] = arg.slice(2).split("=");
          options[key] = value || true;
        } else if (arg.startsWith("-")) {
          const key = arg.slice(1);
          const opt = cmd._options.find((o) => o.flags.includes(`-${key}`));
          if (opt) {
            // Extract the long name from the flags (e.g., "-s, --separator" -> "separator")
            const longName = opt.flags.match(/--([a-zA-Z0-9-]+)/)[1];
            options[longName] = cmdArgs[++i] || true;
          }
        } else {
          positionalArgs.push(arg);
        }
      }

      // Execute the command's action if it exists
      if (cmd._action) {
        // For commands that expect multiple arguments (like join), pass them as an array
        if (cmd._name === "join") {
          cmd._action(positionalArgs, options);
        } else {
          // For other commands, spread the positional args
          cmd._action(...positionalArgs, options);
        }
      }
    }

    return this;
  }
}

module.exports = Command;
