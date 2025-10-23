// Enhanced addon loading with comprehensive fallback system
let addon = null;
let goBackendAvailable = false;
let addonLoadError = null;

function loadAddon() {
  const loadAttempts = [];
  let lastError = null;

  try {
    // Comprehensive list of possible addon paths
    const possiblePaths = [
      // Standard build locations
      "./build/Release/gommander.node",
      "./build/Debug/gommander.node", 
      "./build/gommander.node",
      
      // Alternative locations
      "./gommander.node",
      "./lib/gommander.node",
      "./dist/gommander.node",
      
      // Relative to node_modules (for installed packages)
      "./node_modules/gocommander/build/Release/gommander.node",
      "./node_modules/gocommander/build/Debug/gommander.node",
      
      // Platform-specific paths
      process.platform === 'win32' ? "./build/Release/gommander.dll" : null,
      process.platform === 'win32' ? "./build/Debug/gommander.dll" : null,
    ].filter(Boolean); // Remove null entries

    console.log(`Attempting to load Go addon from ${possiblePaths.length} possible locations...`);

    for (const addonPath of possiblePaths) {
      try {
        console.log(`Trying: ${addonPath}`);
        addon = require(addonPath);
        
        loadAttempts.push({
          path: addonPath,
          success: true,
          error: null
        });

        // Validate addon has expected functions
        const requiredFunctions = ['isGoAvailable', 'getLastError'];
        const missingFunctions = requiredFunctions.filter(fn => typeof addon[fn] !== 'function');
        
        if (missingFunctions.length > 0) {
          console.warn(`Addon loaded but missing functions: ${missingFunctions.join(', ')}`);
          console.warn('This may indicate an incomplete or corrupted build');
          
          // Check for common function name mismatches
          if (missingFunctions.includes('isGoAvailable') && typeof addon['isAvailable'] === 'function') {
            console.warn('⚠️  Found "isAvailable" function instead of "isGoAvailable"');
            console.warn('   This indicates a function name mismatch between C++ addon and JavaScript');
            console.warn('   The C++ addon should export "isGoAvailable", not "isAvailable"');
            lastError = new Error('Function name mismatch: C++ addon exports "isAvailable" but JavaScript expects "isGoAvailable"');
          }
        }
        
        // Test if Go backend is actually available
        if (addon.isGoAvailable && typeof addon.isGoAvailable === 'function') {
          try {
            if (addon.isGoAvailable()) {
              goBackendAvailable = true;
              console.log(`✅ Successfully loaded Go addon with backend from: ${addonPath}`);
            } else {
              console.log(`⚠️  Loaded addon from ${addonPath} but Go backend unavailable`);
              if (addon.getLastError) {
                const goError = addon.getLastError();
                console.log(`   Go backend error: ${goError}`);
                
                // Provide specific guidance based on error type
                if (goError.includes('DLL') || goError.includes('dll')) {
                  console.log(`   💡 This appears to be a DLL loading issue`);
                  console.log(`      Check if gommander.dll exists in the root directory`);
                } else if (goError.includes('function') || goError.includes('symbol')) {
                  console.log(`   💡 This appears to be a function export issue`);
                  console.log(`      The Go library may not be exporting required functions`);
                }
                
                lastError = new Error(`Go backend unavailable: ${goError}`);
              } else {
                lastError = new Error('Go backend unavailable: No error details available');
              }
            }
          } catch (testError) {
            console.warn(`Error testing Go backend availability: ${testError.message}`);
            console.warn(`   This may indicate a function call or parameter mismatch`);
            lastError = testError;
          }
        } else {
          console.warn('Addon loaded but isGoAvailable function not found');
          
          // Enhanced function name mismatch detection
          const availableFunctions = Object.keys(addon).filter(key => typeof addon[key] === 'function');
          
          if (typeof addon.isAvailable === 'function') {
            console.warn('⚠️  FUNCTION NAME MISMATCH DETECTED');
            console.warn('   Found "isAvailable" function instead of "isGoAvailable"');
            console.warn('   This indicates the C++ addon exports the wrong function name');
            console.warn('   💡 Solution: Update C++ addon to export "isGoAvailable" instead of "isAvailable"');
            lastError = new Error('Function name mismatch: C++ addon exports "isAvailable" but JavaScript expects "isGoAvailable"');
          } else {
            console.warn('⚠️  MISSING REQUIRED FUNCTION');
            console.warn(`   Expected function "isGoAvailable" not found in addon`);
            console.warn(`   Available functions: ${availableFunctions.join(', ')}`);
            console.warn('   💡 This may indicate an incomplete or corrupted addon build');
            lastError = new Error(`Addon missing required isGoAvailable function. Available: ${availableFunctions.join(', ')}`);
          }
          
          // Add enhanced diagnostic information to addon
          addon.getErrorCategory = () => "function-missing";
          addon.getDetailedDiagnostics = () => ({
            errorCategory: "function-missing",
            addonLoaded: true,
            goBackendAvailable: false,
            availableFunctions: availableFunctions,
            expectedFunction: "isGoAvailable",
            foundMismatch: typeof addon.isAvailable === 'function' ? "isAvailable" : null,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            errorMessage: lastError.message,
            troubleshooting: [
              "Check C++ addon function exports in src/addon.cc",
              "Ensure 'isGoAvailable' is exported, not 'isAvailable'",
              "Rebuild the addon with correct function names",
              "Verify binding.gyp configuration is correct"
            ]
          });
        }
        
        break; // Successfully loaded addon, exit loop
        
      } catch (e) {
        loadAttempts.push({
          path: addonPath,
          success: false,
          error: e.message
        });
        lastError = e;
        // Continue trying other paths
      }
    }

    if (!addon) {
      // Create detailed error message
      const errorDetails = loadAttempts.map(attempt => 
        `  ${attempt.path}: ${attempt.success ? 'SUCCESS' : attempt.error}`
      ).join('\n');
      
      throw new Error(`Go addon not found in any expected location.\n\nAttempted paths:\n${errorDetails}\n\nTroubleshooting:\n  1. Run 'npm run build' to build the addon\n  2. Check if Go is installed and accessible\n  3. Verify node-gyp dependencies are installed\n  4. Check platform compatibility (${process.platform}-${process.arch})`);
    }
  } catch (error) {
    addonLoadError = error;
    
    // Enhanced error logging
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.warn("⚠️  Go addon loading failed - using JavaScript fallback implementation");
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.warn(`Error: ${error.message}`);
    
    if (loadAttempts.length > 0) {
      console.warn("\nLoad attempts:");
      loadAttempts.forEach(attempt => {
        const status = attempt.success ? "✅" : "❌";
        console.warn(`  ${status} ${attempt.path}${attempt.error ? ` - ${attempt.error}` : ''}`);
      });
    }
    
    console.warn("\nThis means:");
    console.warn("  • Commands will be parsed using JavaScript (slower performance)");
    console.warn("  • All functionality remains available");
    console.warn("  • No action required unless you need Go performance benefits");
    console.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Provide comprehensive fallback addon interface with enhanced error reporting
    addon = {
      // Basic functions
      hello: () => "JavaScript fallback implementation",
      version: () => "1.0.0-js-fallback",
      
      // Go backend status functions
      isGoAvailable: () => false,
      getLastError: () => {
        if (addonLoadError) {
          return `Addon load failed: ${addonLoadError.message}`;
        }
        return "Addon not loaded";
      },
      
      // Enhanced diagnostic functions
      getErrorCategory: () => {
        if (!addonLoadError) return "no-addon";
        
        const errorMsg = addonLoadError.message.toLowerCase();
        if (errorMsg.includes('dll') || errorMsg.includes('library')) {
          return "dll-not-found";
        } else if (errorMsg.includes('function') || errorMsg.includes('symbol')) {
          return "function-missing";
        } else if (errorMsg.includes('build') || errorMsg.includes('compile')) {
          return "build-error";
        } else if (errorMsg.includes('platform') || errorMsg.includes('arch')) {
          return "platform-incompatible";
        }
        return "unknown-error";
      },
      
      getDetailedDiagnostics: () => ({
        errorCategory: addon.getErrorCategory(),
        addonLoaded: false,
        goBackendAvailable: false,
        loadAttempts: loadAttempts,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        errorMessage: addonLoadError ? addonLoadError.message : "No error",
        troubleshooting: {
          "dll-not-found": [
            "Run 'npm run build' to build the addon",
            "Check if gommander.dll exists in the root directory",
            "Verify Go is installed and accessible"
          ],
          "function-missing": [
            "Check if C++ addon exports the correct function names",
            "Verify function name mapping between C++ and JavaScript",
            "Rebuild the addon with 'npm run build'"
          ],
          "build-error": [
            "Install build dependencies: npm install -g node-gyp",
            "Check if Go compiler is available",
            "Verify platform build tools are installed"
          ],
          "platform-incompatible": [
            "Check Node.js version compatibility (>=16.0.0 recommended)",
            "Verify platform-specific build configuration",
            "Check if pre-built binaries are available for your platform"
          ]
        }
      }),
      
      // Enhanced command functions with detailed error messages
      createCommand: (name) => ({ 
        success: false, 
        error: "Go backend not available - addon loading failed",
        details: {
          requestedCommand: name,
          fallbackAvailable: true,
          reason: addonLoadError ? addonLoadError.message : "Unknown error"
        }
      }),
      
      addOption: (cmdId, flags, desc, defaultVal) => ({ 
        success: false, 
        error: "Go backend not available - addon loading failed",
        details: {
          requestedOption: flags,
          fallbackAvailable: true
        }
      }),
      
      addArgument: (cmdId, name, desc, required) => ({ 
        success: false, 
        error: "Go backend not available - addon loading failed",
        details: {
          requestedArgument: name,
          fallbackAvailable: true
        }
      }),
      
      parseArgs: (cmdId, args) => ({ 
        success: false, 
        error: "Go backend not available - addon loading failed",
        details: {
          argumentCount: args ? args.length : 0,
          fallbackAvailable: true
        }
      }),
      
      getHelp: (cmdId) => ({ 
        success: false, 
        error: "Go backend not available - addon loading failed",
        details: {
          fallbackAvailable: true
        }
      }),
      
      // Management functions
      initializeGo: () => false,
      cleanupGo: () => false,
      addRef: (cmdId) => ({ success: false, error: "Go backend not available" }),
      release: (cmdId) => ({ success: false, error: "Go backend not available" }),
      
      // Diagnostic functions
      getLoadAttempts: () => loadAttempts,
      getDetailedError: () => ({
        error: addonLoadError ? addonLoadError.message : "Unknown error",
        attempts: loadAttempts,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      })
    };
  }
}

// Load the addon
loadAddon();

// Enhanced Command class with Go backend integration
class Command {
  constructor(name) {
    this._name = name || "";
    this._goCommandId = null;
    this._fallbackMode = false;
    this._options = new Map();
    this._arguments = [];
    this._action = null;
    this._subcommands = new Map();
    this._parent = null;
    this._description = "";
    this._version = "";
    this._allowUnknownOption = false;
    
    // Initialize Go backend if available
    this._initializeGoBackend();
  }

  // Initialize Go backend for this command
  _initializeGoBackend() {
    // Only fallback if addon completely failed to load
    if (!addon) {
      this._fallbackMode = true;
      if (this._name) {
        console.log(`Creating command '${this._name}' in JavaScript fallback mode (addon not loaded)`);
      }
      return;
    }

    // If addon loaded but Go backend is unavailable, still try to use addon functions
    // but expect them to return error responses rather than falling back immediately
    if (!goBackendAvailable) {
      if (this._name) {
        console.log(`Creating command '${this._name}' with addon loaded but Go backend unavailable`);
      }
      // Don't set fallback mode - let individual operations handle Go backend unavailability
    }

    // Check if createCommand function exists
    if (!addon.createCommand || typeof addon.createCommand !== 'function') {
      this._fallbackMode = true;
      if (this._name) {
        console.log(`Creating command '${this._name}' in JavaScript fallback mode (createCommand function missing)`);
      }
      return;
    }

    try {
      const result = addon.createCommand(this._name || "root");
      
      if (result && result.success && result.data) {
        this._goCommandId = result.data;
        console.log(`Created Go command '${this._name || 'root'}' with ID: ${this._goCommandId}`);
      } else {
        // Don't fallback immediately - the addon is loaded, just the Go backend has issues
        console.warn(`Go backend command creation failed: ${result ? result.error : 'Unknown error'}`);
        console.warn(`Addon is loaded but Go backend is not functional - operations will return errors`);
        // Keep this._fallbackMode = false so we still try to use addon functions
      }
    } catch (error) {
      console.warn(`Error creating Go command: ${error.message}`);
      console.warn(`This indicates an issue with the addon interface, not complete failure`);
      // Keep this._fallbackMode = false so we still try to use addon functions
    }
  }

  // Check if Go backend is being used
  _isUsingGoBackend() {
    // We're using Go backend if:
    // 1. We're not in fallback mode (addon loaded successfully)
    // 2. We have a valid Go command ID (command creation succeeded)
    // 3. The addon has the required functions
    return !this._fallbackMode && 
           this._goCommandId !== null && 
           addon && 
           typeof addon.createCommand === 'function';
  }

  // Get diagnostic information about backend usage
  _getBackendInfo() {
    return {
      goBackendAvailable,
      fallbackMode: this._fallbackMode,
      goCommandId: this._goCommandId,
      addonLoadError: addonLoadError ? addonLoadError.message : null
    };
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

  // Add an option with Go backend support
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
    
    // Store option locally for fallback
    this._options.set(optionName, option);

    // Try to add option to Go backend if available
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.addOption(this._goCommandId, flags, description || "", defaultValue);
        
        if (result && result.success) {
          console.log(`Added option to Go backend: ${flags}`);
        } else {
          console.warn(`Go backend option creation failed: ${result ? result.error : 'Unknown error'}`);
          console.warn(`Option '${flags}' stored locally - will use JavaScript parsing`);
        }
      } catch (error) {
        console.warn(`Error calling Go backend addOption: ${error.message}`);
        console.warn(`Option '${flags}' stored locally - will use JavaScript parsing`);
      }
    } else if (this._fallbackMode) {
      console.log(`Added option (JavaScript fallback - addon not loaded): ${flags}`);
    } else {
      // Addon loaded but Go backend not functional
      console.log(`Added option (JavaScript parsing - Go backend unavailable): ${flags}`);
    }
    
    return this;
  }

  // Add an argument with Go backend support
  argument(name, description, required = true) {
    const argument = {
      name,
      description: description || "",
      required
    };
    
    // Store argument locally for fallback
    this._arguments.push(argument);

    // Try to add argument to Go backend if available
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.addArgument(this._goCommandId, name, description || "", required);
        
        if (result && result.success) {
          console.log(`Added argument to Go backend: ${name}`);
        } else {
          console.warn(`Go backend argument creation failed: ${result ? result.error : 'Unknown error'}`);
          console.warn(`Argument '${name}' stored locally - will use JavaScript parsing`);
        }
      } catch (error) {
        console.warn(`Error calling Go backend addArgument: ${error.message}`);
        console.warn(`Argument '${name}' stored locally - will use JavaScript parsing`);
      }
    } else if (this._fallbackMode) {
      console.log(`Added argument (JavaScript fallback - addon not loaded): ${name}`);
    } else {
      // Addon loaded but Go backend not functional
      console.log(`Added argument (JavaScript parsing - Go backend unavailable): ${name}`);
    }
    
    return this;
  }

  // Add a subcommand with Go backend support
  command(name, description) {
    const cmd = new Command(name);
    cmd._parent = this;
    if (description) {
      cmd._description = description;
    }
    
    this._subcommands.set(name, cmd);
    
    // Log creation with backend information
    let backendInfo;
    if (cmd._isUsingGoBackend()) {
      backendInfo = 'Go backend';
    } else if (cmd._fallbackMode) {
      backendInfo = 'JavaScript fallback - addon not loaded';
    } else {
      backendInfo = 'JavaScript parsing - Go backend unavailable';
    }
    console.log(`Added subcommand '${name}' (${backendInfo})`);
    
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

  // Parse command line arguments with Go backend support
  parse(argv) {
    if (!argv) {
      argv = process.argv;
    }

    // Skip node and script name
    const args = argv.slice(2);
    
    // Try Go backend parsing first if available
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.parseArgs(this._goCommandId, args);
        
        if (result && typeof result === 'string') {
          // Parse JSON result from Go
          try {
            const parseResult = JSON.parse(result);
            
            if (parseResult.success) {
              console.log(`Successfully parsed with Go backend: ${this._name || 'root'}`);
              
              // Execute action if defined
              if (this._action && parseResult.options && parseResult.arguments) {
                this._action(parseResult.arguments, parseResult.options);
              }
              
              return this;
            } else {
              console.warn(`Go backend parsing failed: ${parseResult.error || 'Unknown error'}`);
              console.warn("Using JavaScript parsing instead");
            }
          } catch (jsonError) {
            console.warn(`Failed to parse Go result JSON: ${jsonError.message}`);
            console.warn("Using JavaScript parsing instead");
          }
        } else if (result && result.error) {
          console.warn(`Go backend parsing error: ${result.error}`);
          console.warn("Using JavaScript parsing instead");
        } else {
          console.warn(`Unexpected Go backend result format`);
          console.warn("Using JavaScript parsing instead");
        }
      } catch (error) {
        console.warn(`Error calling Go backend parseArgs: ${error.message}`);
        console.warn("Using JavaScript parsing instead");
      }
    }

    // JavaScript parsing (either fallback or primary when Go backend unavailable)
    let parseMode;
    if (this._fallbackMode) {
      parseMode = 'JavaScript fallback (addon not loaded)';
    } else if (!this._isUsingGoBackend()) {
      parseMode = 'JavaScript parsing (Go backend unavailable)';
    } else {
      parseMode = 'JavaScript parsing (Go backend failed)';
    }
    console.log(`Parsing with ${parseMode}: ${this._name || 'root'}`);
    return this._parseWithJavaScript(args, argv);
  }

  // JavaScript fallback parsing implementation
  _parseWithJavaScript(args, originalArgv) {
    const options = {};
    const positionalArgs = [];
    let i = 0;

    while (i < args.length) {
      const arg = args[i];
      
      // Check for subcommand
      if (this._subcommands.has(arg)) {
        const subcmd = this._subcommands.get(arg);
        return subcmd.parse([...originalArgv.slice(0, 2), ...args.slice(i + 1)]);
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

    // Apply default values from stored options
    this._options.forEach((option, name) => {
      if (!(name in options) && option.defaultValue !== undefined) {
        options[name] = option.defaultValue;
      }
    });

    // Execute action if defined
    if (this._action) {
      this._action(positionalArgs, options);
    }

    return this;
  }

  // Output help with Go backend support
  outputHelp() {
    // Try Go backend help generation first
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.getHelp(this._goCommandId);
        
        if (result && result.success && result.data) {
          console.log(result.data);
          return;
        } else if (result && result.error) {
          console.warn(`Go help generation failed: ${result.error}`);
          console.warn("Using JavaScript fallback for help");
        }
      } catch (error) {
        console.warn(`Error generating Go help: ${error.message}`);
        console.warn("Using JavaScript fallback for help");
      }
    }

    // JavaScript fallback help generation
    this._generateJavaScriptHelp();
  }

  // JavaScript fallback help generation
  _generateJavaScriptHelp() {
    const name = this._name || 'program';
    
    console.log(`Usage: ${name} [options]${this._arguments.map(arg => ` <${arg.name}>`).join('')}`);
    
    if (this._description) {
      console.log(`\n${this._description}`);
    }
    
    if (this._arguments.length > 0) {
      console.log('\nArguments:');
      this._arguments.forEach(arg => {
        const requiredStr = arg.required === false ? ' (optional)' : '';
        console.log(`  ${arg.name.padEnd(20)} ${arg.description}${requiredStr}`);
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

    // Add backend information in fallback mode
    if (this._fallbackMode) {
      console.log('\n[Running in JavaScript fallback mode - Go backend unavailable]');
    }
  }

  help() {
    this.outputHelp();
    return this;
  }

  // Get diagnostic information about the command and backend
  getDiagnostics() {
    const backendInfo = this._getBackendInfo();
    
    // Get detailed diagnostics from addon if available
    let addonDiagnostics = null;
    if (addon && typeof addon.getDetailedDiagnostics === 'function') {
      try {
        addonDiagnostics = addon.getDetailedDiagnostics();
      } catch (error) {
        // Ignore errors in diagnostic collection
      }
    }
    
    const diagnostics = {
      command: {
        name: this._name,
        goCommandId: this._goCommandId,
        fallbackMode: this._fallbackMode,
        usingGoBackend: this._isUsingGoBackend(),
        optionsCount: this._options.size,
        argumentsCount: this._arguments.length,
        subcommandsCount: this._subcommands.size
      },
      backend: backendInfo,
      addon: {
        loaded: addon !== null,
        functions: addon ? Object.keys(addon).filter(key => typeof addon[key] === 'function') : [],
        hasIsGoAvailable: addon && typeof addon.isGoAvailable === 'function',
        hasIsAvailable: addon && typeof addon.isAvailable === 'function', // Check for mismatch
        errorCategory: addon && typeof addon.getErrorCategory === 'function' ? addon.getErrorCategory() : 'unknown'
      },
      detailed: addonDiagnostics,
      troubleshooting: this._getTroubleshootingSteps()
    };

    return diagnostics;
  }
  
  // Get troubleshooting steps based on current state
  _getTroubleshootingSteps() {
    const steps = [];
    
    if (!addon) {
      steps.push("1. Build the addon: npm run build");
      steps.push("2. Check build output for errors");
      steps.push("3. Verify Node.js version compatibility (>=16.0.0)");
      steps.push("4. Install build dependencies if missing");
    } else if (this._fallbackMode) {
      steps.push("1. Check addon loading errors in console output");
      steps.push("2. Verify addon file exists in build/Release/ or build/Debug/");
      steps.push("3. Test addon loading manually");
    } else if (!this._isUsingGoBackend()) {
      if (addon && typeof addon.isAvailable === 'function') {
        steps.push("1. FUNCTION NAME MISMATCH: Update C++ addon to export 'isGoAvailable' instead of 'isAvailable'");
        steps.push("2. Rebuild the addon after fixing function names");
        steps.push("3. Verify all function exports match JavaScript expectations");
      } else if (!goBackendAvailable) {
        steps.push("1. Check if gommander.dll exists in the root directory");
        steps.push("2. Verify Go library was built correctly: npm run build-go");
        steps.push("3. Check for DLL loading errors in console output");
        steps.push("4. Ensure all runtime dependencies are available");
      } else {
        steps.push("1. Check Go command creation errors in console output");
        steps.push("2. Verify Go backend initialization completed successfully");
        steps.push("3. Test individual Go functions manually");
      }
    }
    
    return steps;
  }

  // Print diagnostic information
  printDiagnostics() {
    const diagnostics = this.getDiagnostics();
    
    console.log('\n=== GoCommander Diagnostics ===');
    console.log(`Command: ${diagnostics.command.name || 'root'}`);
    console.log(`Addon Loaded: ${diagnostics.addon.loaded}`);
    console.log(`Go Backend Available: ${diagnostics.backend.goBackendAvailable}`);
    console.log(`Using Go Backend: ${diagnostics.command.usingGoBackend}`);
    console.log(`Fallback Mode: ${diagnostics.command.fallbackMode}`);
    console.log(`Go Command ID: ${diagnostics.command.goCommandId || 'N/A'}`);
    
    // Show function availability
    if (diagnostics.addon.loaded) {
      console.log(`Has isGoAvailable: ${diagnostics.addon.hasIsGoAvailable}`);
      if (diagnostics.addon.hasIsAvailable && !diagnostics.addon.hasIsGoAvailable) {
        console.log(`⚠️  FUNCTION NAME MISMATCH: Found 'isAvailable' instead of 'isGoAvailable'`);
      }
      console.log(`Available Functions: ${diagnostics.addon.functions.join(', ')}`);
    }
    
    // Show error category if available
    if (diagnostics.addon.errorCategory && diagnostics.addon.errorCategory !== 'unknown') {
      console.log(`Error Category: ${diagnostics.addon.errorCategory}`);
    }
    
    console.log(`Options: ${diagnostics.command.optionsCount}`);
    console.log(`Arguments: ${diagnostics.command.argumentsCount}`);
    console.log(`Subcommands: ${diagnostics.command.subcommandsCount}`);
    
    if (diagnostics.backend.addonLoadError) {
      console.log(`Addon Load Error: ${diagnostics.backend.addonLoadError}`);
    }
    
    if (addon && addon.getLastError) {
      const lastError = addon.getLastError();
      if (lastError && lastError !== 'No error') {
        console.log(`Go Backend Error: ${lastError}`);
      }
    }
    
    // Show troubleshooting steps if there are issues
    if (diagnostics.troubleshooting.length > 0) {
      console.log('\nTroubleshooting Steps:');
      diagnostics.troubleshooting.forEach(step => {
        console.log(`  ${step}`);
      });
    }
    
    // Show detailed diagnostics if available
    if (diagnostics.detailed) {
      console.log('\nDetailed Information:');
      console.log(`  Platform: ${diagnostics.detailed.platform} (${diagnostics.detailed.arch})`);
      console.log(`  Node.js: ${diagnostics.detailed.nodeVersion}`);
      if (diagnostics.detailed.troubleshooting && diagnostics.detailed.errorCategory) {
        const categorySteps = diagnostics.detailed.troubleshooting[diagnostics.detailed.errorCategory];
        if (categorySteps) {
          console.log(`\nCategory-Specific Steps (${diagnostics.detailed.errorCategory}):`);
          categorySteps.forEach(step => {
            console.log(`  • ${step}`);
          });
        }
      }
    }
    
    console.log('===============================\n');
    
    return this;
  }
}

// Comprehensive fallback system utilities
const FallbackSystem = {
  // Check if Go backend is available
  isGoBackendAvailable() {
    return goBackendAvailable;
  },

  // Get detailed backend status
  getBackendStatus() {
    return {
      goBackendAvailable,
      addonLoaded: addon !== null,
      addonLoadError: addonLoadError ? addonLoadError.message : null,
      lastGoError: addon && addon.getLastError ? addon.getLastError() : null
    };
  },

  // Print comprehensive diagnostic information
  printSystemDiagnostics() {
    const status = this.getBackendStatus();
    
    console.log('\n=== GoCommander System Diagnostics ===');
    console.log(`Go Backend Available: ${status.goBackendAvailable}`);
    console.log(`Addon Loaded: ${status.addonLoaded}`);
    
    // Enhanced error categorization
    if (addon && typeof addon.getErrorCategory === 'function') {
      const errorCategory = addon.getErrorCategory();
      console.log(`Error Category: ${errorCategory}`);
    }
    
    // Function availability check
    if (addon) {
      const functions = Object.keys(addon).filter(key => typeof addon[key] === 'function');
      console.log(`Available Functions: ${functions.join(', ')}`);
      
      // Check for function name mismatches
      if (typeof addon.isAvailable === 'function' && typeof addon.isGoAvailable !== 'function') {
        console.log(`⚠️  FUNCTION NAME MISMATCH: Found 'isAvailable' instead of 'isGoAvailable'`);
      }
    }
    
    // Detailed error information
    if (status.addonLoadError) {
      console.log(`Addon Load Error: ${status.addonLoadError}`);
      
      // Provide specific guidance based on error type
      const errorMsg = status.addonLoadError.toLowerCase();
      if (errorMsg.includes('dll') || errorMsg.includes('library')) {
        console.log(`💡 This appears to be a DLL/library loading issue`);
      } else if (errorMsg.includes('function') || errorMsg.includes('symbol')) {
        console.log(`💡 This appears to be a function export/import issue`);
      } else if (errorMsg.includes('build') || errorMsg.includes('compile')) {
        console.log(`💡 This appears to be a build/compilation issue`);
      }
    }
    
    if (status.lastGoError && status.lastGoError !== 'No error') {
      console.log(`Go Backend Error: ${status.lastGoError}`);
    }
    
    // Platform information
    console.log(`Platform: ${process.platform} (${process.arch})`);
    console.log(`Node.js: ${process.version}`);
    
    // Get detailed diagnostics if available
    if (addon && typeof addon.getDetailedDiagnostics === 'function') {
      try {
        const detailed = addon.getDetailedDiagnostics();
        if (detailed.troubleshooting && detailed.errorCategory) {
          const steps = detailed.troubleshooting[detailed.errorCategory];
          if (steps) {
            console.log(`\nRecommended Actions (${detailed.errorCategory}):`);
            steps.forEach(step => {
              console.log(`  • ${step}`);
            });
          }
        }
      } catch (error) {
        // Ignore diagnostic collection errors
      }
    }
    
    console.log('=====================================\n');
    
    return status;
  },

  // Show warning about fallback mode
  showFallbackWarning(context = '') {
    const contextStr = context ? ` (${context})` : '';
    console.warn(`⚠️  GoCommander is running in JavaScript fallback mode${contextStr}`);
    console.warn('   Performance may be reduced compared to Go backend');
    
    if (addonLoadError) {
      console.warn(`   Reason: ${addonLoadError.message}`);
    }
    
    console.warn('   To enable Go backend, ensure the addon is properly built and installed');
  },

  // Attempt to reinitialize Go backend with enhanced error handling
  reinitializeGoBackend() {
    console.log('🔄 Attempting to reinitialize Go backend...');
    
    // Store previous state for rollback if needed
    const previousAddon = addon;
    const previousAvailable = goBackendAvailable;
    const previousError = addonLoadError;
    
    // Reset state
    goBackendAvailable = false;
    addonLoadError = null;
    addon = null;
    
    try {
      // Try to reload addon
      loadAddon();
      
      const status = this.getBackendStatus();
      
      if (goBackendAvailable) {
        console.log('✅ Go backend successfully reinitialized');
        return { success: true, message: 'Go backend reinitialized successfully' };
      } else {
        console.log('❌ Go backend reinitialization failed');
        if (status.addonLoadError) {
          console.log(`   Error: ${status.addonLoadError}`);
        }
        return { 
          success: false, 
          message: 'Go backend reinitialization failed',
          error: status.addonLoadError 
        };
      }
    } catch (error) {
      console.error('💥 Critical error during reinitialization:', error.message);
      
      // Rollback to previous state to maintain stability
      addon = previousAddon;
      goBackendAvailable = previousAvailable;
      addonLoadError = previousError;
      
      console.log('🔄 Rolled back to previous state to maintain stability');
      
      return { 
        success: false, 
        message: 'Reinitialization failed, rolled back to previous state',
        error: error.message 
      };
    }
  },

  // Test Go backend functionality
  testGoBackend() {
    if (!goBackendAvailable) {
      return {
        success: false,
        message: 'Go backend not available',
        tests: []
      };
    }

    const tests = [];
    let allPassed = true;

    // Test basic functions
    const basicTests = [
      { name: 'version', fn: () => addon.version() },
      { name: 'hello', fn: () => addon.hello() },
      { name: 'isGoAvailable', fn: () => addon.isGoAvailable() },
      { name: 'getLastError', fn: () => addon.getLastError() }
    ];

    basicTests.forEach(test => {
      try {
        const result = test.fn();
        tests.push({
          name: test.name,
          success: true,
          result: typeof result === 'string' ? result.substring(0, 100) : result
        });
      } catch (error) {
        tests.push({
          name: test.name,
          success: false,
          error: error.message
        });
        allPassed = false;
      }
    });

    // Test command creation if basic tests pass
    if (allPassed) {
      try {
        const cmdResult = addon.createCommand('test-cmd');
        tests.push({
          name: 'createCommand',
          success: cmdResult && cmdResult.success,
          result: cmdResult
        });
      } catch (error) {
        tests.push({
          name: 'createCommand',
          success: false,
          error: error.message
        });
        allPassed = false;
      }
    }

    return {
      success: allPassed,
      message: allPassed ? 'All Go backend tests passed' : 'Some Go backend tests failed',
      tests
    };
  },

  // Get comprehensive troubleshooting guidance
  getTroubleshootingGuidance() {
    const guidance = {
      steps: [],
      commonIssues: [],
      platformSpecific: [],
      quickFixes: [],
      diagnosticCommands: []
    };

    // Get detailed error information
    const detailedError = addon && addon.getDetailedError ? addon.getDetailedError() : null;
    const loadAttempts = addon && addon.getLoadAttempts ? addon.getLoadAttempts() : [];

    if (!addon || addonLoadError) {
      guidance.steps.push('1. Build the Go addon: npm run build');
      guidance.steps.push('2. Check build output for errors');
      guidance.steps.push('3. Verify gommander.node exists in build/Release/ or build/Debug/');
      guidance.steps.push('4. Test Node.js version compatibility (>=16.0.0 recommended)');
      guidance.steps.push('5. Check system dependencies (Go, node-gyp, build tools)');

      guidance.commonIssues.push('Missing build dependencies (node-gyp, Go compiler, build tools)');
      guidance.commonIssues.push('Platform-specific build configuration issues');
      guidance.commonIssues.push('Node.js version incompatibility');
      guidance.commonIssues.push('Corrupted or incomplete build artifacts');

      guidance.quickFixes.push('npm install -g node-gyp');
      guidance.quickFixes.push('npm run clean && npm run build');
      guidance.quickFixes.push('npm rebuild');

      guidance.diagnosticCommands.push('node --version');
      guidance.diagnosticCommands.push('npm run build 2>&1');
      guidance.diagnosticCommands.push('ls -la build/Release/ || dir build\\Release\\');
    }

    if (addon && !goBackendAvailable) {
      guidance.steps.push('1. Check if Go library (DLL/static lib) is present in src/');
      guidance.steps.push('2. Verify Go functions are properly exported');
      guidance.steps.push('3. Test Go library loading manually');
      guidance.steps.push('4. Check for missing runtime dependencies');

      guidance.commonIssues.push('Go library not found or corrupted');
      guidance.commonIssues.push('Symbol export/import issues');
      guidance.commonIssues.push('Runtime library dependencies missing');
      guidance.commonIssues.push('Platform-specific linking problems');

      guidance.quickFixes.push('npm run build-go');
      guidance.quickFixes.push('Check src/gommander.dll or src/gommander.a exists');

      guidance.diagnosticCommands.push('go version');
      guidance.diagnosticCommands.push('npm run build-go 2>&1');
    }

    // Platform-specific guidance
    switch (process.platform) {
      case 'win32':
        guidance.platformSpecific.push('Ensure Visual Studio Build Tools are installed');
        guidance.platformSpecific.push('Check that gommander.dll is in src/ directory');
        guidance.platformSpecific.push('Verify Windows SDK is available');
        guidance.diagnosticCommands.push('where cl.exe');
        break;
      
      case 'darwin':
        guidance.platformSpecific.push('Ensure Xcode Command Line Tools are installed');
        guidance.platformSpecific.push('Check that gommander.a is in src/ directory');
        guidance.diagnosticCommands.push('xcode-select --print-path');
        break;
      
      case 'linux':
        guidance.platformSpecific.push('Ensure build-essential is installed');
        guidance.platformSpecific.push('Check that gommander.a is in src/ directory');
        guidance.platformSpecific.push('Verify GCC version compatibility');
        guidance.diagnosticCommands.push('gcc --version');
        break;
    }

    // Add load attempt details if available
    if (loadAttempts.length > 0) {
      guidance.loadAttempts = loadAttempts;
    }

    if (detailedError) {
      guidance.detailedError = detailedError;
    }

    return guidance;
  },

  // Print troubleshooting guidance
  printTroubleshootingGuidance() {
    const guidance = this.getTroubleshootingGuidance();
    
    console.log('\n=== Troubleshooting Guidance ===');
    
    if (guidance.steps.length > 0) {
      console.log('Recommended steps:');
      guidance.steps.forEach(step => console.log(`  ${step}`));
    }
    
    if (guidance.commonIssues.length > 0) {
      console.log('\nCommon issues:');
      guidance.commonIssues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    console.log('===============================\n');
    
    return guidance;
  }
};

// Show initial fallback warning if needed
if (!goBackendAvailable && process.env.NODE_ENV !== 'test') {
  FallbackSystem.showFallbackWarning('initialization');
}

// Create the main program instance
const program = new Command();

// Enhanced module exports with comprehensive fallback system
module.exports = {
  // Core classes and instances
  Command,
  program,
  
  // Factory function
  createCommand: (name) => new Command(name),
  
  // Fallback system
  FallbackSystem,
  
  // Backend status functions
  isGoBackendAvailable: () => FallbackSystem.isGoBackendAvailable(),
  getBackendStatus: () => FallbackSystem.getBackendStatus(),
  printDiagnostics: () => FallbackSystem.printSystemDiagnostics(),
  showFallbackWarning: (context) => FallbackSystem.showFallbackWarning(context),
  getTroubleshootingGuidance: () => FallbackSystem.getTroubleshootingGuidance(),
  
  // Direct addon access (for advanced users)
  addon,
  
  // Utility functions with fallback handling
  version: () => {
    try {
      return addon.version();
    } catch (error) {
      console.warn('Error getting version from addon, using fallback');
      return '1.0.0-js-fallback';
    }
  },
  
  hello: () => {
    try {
      return addon.hello();
    } catch (error) {
      console.warn('Error calling hello from addon, using fallback');
      return 'JavaScript fallback implementation';
    }
  },

  // Enhanced recovery and testing functions
  reinitialize: () => FallbackSystem.reinitializeGoBackend(),
  testGoBackend: () => FallbackSystem.testGoBackend(),
  
  // Advanced diagnostic functions
  getLoadAttempts: () => addon && addon.getLoadAttempts ? addon.getLoadAttempts() : [],
  getDetailedError: () => addon && addon.getDetailedError ? addon.getDetailedError() : null
};
