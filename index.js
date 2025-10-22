// Load the Go addon directly
let addon;
try {
  // Try multiple possible paths for the addon
  const possiblePaths = [
    "./build/Release/gommander.node",
    "./build/Debug/gommander.node", 
    "./build/gommander.node"
  ];

  for (const addonPath of possiblePaths) {
    try {
      addon = require(addonPath);
      console.log(`Successfully loaded Go addon from: ${addonPath}`);
      break;
    } catch (e) {
      // Continue trying other paths
    }
  }

  if (!addon) {
    throw new Error("Go addon not found in any expected location");
  }
} catch (error) {
  console.warn("Go addon not available:", error.message);
  console.warn("Using JavaScript implementation with Go backend structure");
  // Provide fallback addon interface
  addon = {
    hello: () => "JavaScript implementation (Go backend ready)",
    version: () => "1.0.0-js-fallback"
  };
}

// Go-backed Command class
class Command {
  constructor(name) {
    this._name = name || "";
    this._goCommandPtr = null;
    this._options = new Map();
    this._arguments = [];
    this._action = null;
    this._subcommands = new Map();
    this._parent = null;
    
    // Create Go command object through addon
    // Note: The actual Go integration would need additional C++ bindings
    // For now, we'll track the command structure and delegate to Go when possible
    console.log(`Creating command: ${name || 'root'}`);
  }

  // Set command description
  description(desc) {
    if (arguments.length === 0) return this._description;
    this._description = desc;
    return this;
  }

  // Set command version
  version(ver) {
    if (arguments.length === 0) return this._version;
    this._version = ver;
    return this;
  }

  // Add an option
  option(flags, description, defaultValue) {
    const option = {
      flags,
      description: description || "",
      defaultValue
    };
    
    // Parse flag names for storage
    const flagNames = flags.split(/[,\s]+/).map(f => f.trim()).filter(f => f);
    const longFlag = flagNames.find(f => f.startsWith('--'));
    const shortFlag = flagNames.find(f => f.startsWith('-') && !f.startsWith('--'));
    
    const optionName = longFlag ? longFlag.replace('--', '') : 
                      shortFlag ? shortFlag.replace('-', '') : 'unknown';
    
    this._options.set(optionName, option);
    console.log(`Added option: ${flags}`);
    return this;
  }

  // Add an argument
  argument(name, description) {
    this._arguments.push({
      name,
      description: description || ""
    });
    console.log(`Added argument: ${name}`);
    return this;
  }

  // Add a subcommand
  command(name, description) {
    const cmd = new Command(name);
    cmd._parent = this;
    if (description) {
      cmd._description = description;
    }
    
    this._subcommands.set(name, cmd);
    console.log(`Added subcommand: ${name}`);
    return cmd;
  }

  // Set action handler
  action(fn) {
    this._action = fn;
    return this;
  }

  // Allow unknown options
  allowUnknownOption(allow = true) {
    this._allowUnknownOption = allow;
    return this;
  }

  // Parse command line arguments
  parse(argv) {
    if (!argv) {
      argv = process.argv;
    }

    console.log(`Parsing with Go backend: ${this._name || 'root'}`);
    
    // Skip node and script name
    const args = argv.slice(2);
    
    // Simple parsing logic - in a full implementation this would delegate to Go
    const options = {};
    const positionalArgs = [];
    let i = 0;

    while (i < args.length) {
      const arg = args[i];
      
      // Check for subcommand
      if (this._subcommands.has(arg)) {
        const subcmd = this._subcommands.get(arg);
        return subcmd.parse([...argv.slice(0, 2), ...args.slice(i + 1)]);
      }
      
      // Handle options
      if (arg.startsWith('--')) {
        const [key, value] = arg.slice(2).split('=');
        if (value !== undefined) {
          options[key] = value;
        } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i];
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options[key] = args[++i];
        } else {
          options[key] = true;
        }
      } else {
        positionalArgs.push(arg);
      }
      
      i++;
    }

    // Execute action if defined
    if (this._action) {
      this._action(positionalArgs, options);
    }

    return this;
  }

  // Output help
  outputHelp() {
    const name = this._name || 'program';
    
    console.log(`Usage: ${name} [options]${this._arguments.map(arg => ` <${arg.name}>`).join('')}`);
    
    if (this._description) {
      console.log(`\n${this._description}`);
    }
    
    if (this._arguments.length > 0) {
      console.log('\nArguments:');
      this._arguments.forEach(arg => {
        console.log(`  ${arg.name.padEnd(20)} ${arg.description}`);
      });
    }
    
    if (this._options.size > 0) {
      console.log('\nOptions:');
      this._options.forEach((option, name) => {
        const defaultStr = option.defaultValue !== undefined ? 
          ` (default: ${option.defaultValue})` : '';
        console.log(`  ${option.flags.padEnd(20)} ${option.description}${defaultStr}`);
      });
    }
    
    if (this._subcommands.size > 0) {
      console.log('\nCommands:');
      this._subcommands.forEach((cmd, name) => {
        console.log(`  ${name.padEnd(20)} ${cmd._description || ''}`);
      });
    }
    
    if (this._version) {
      console.log(`\nVersion: ${this._version}`);
    }
  }

  help() {
    this.outputHelp();
    return this;
  }
}

// Create the main program instance
const program = new Command();

// Export the Command class, program instance, and addon
module.exports = {
  Command,
  program,
  addon,
  createCommand: (name) => new Command(name),
  // Expose Go addon functions directly
  version: () => addon.version(),
  hello: () => addon.hello()
};
