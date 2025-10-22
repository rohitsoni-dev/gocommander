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
                lastError = new Error(`Go backend unavailable: ${goError}`);
              }
            }
          } catch (testError) {
            console.warn(`Error testing Go backend availability: ${testError.message}`);
            lastError = testError;
          }
        } else {
          console.warn('Addon loaded but isGoAvailable function not found');
          lastError = new Error('Addon missing required functions');
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
    if (!goBackendAvailable || !addon.createCommand) {
      this._fallbackMode = true;
      if (this._name) {
        console.log(`Creating command '${this._name}' in JavaScript fallback mode`);
      }
      return;
    }

    try {
      const result = addon.createCommand(this._name || "root");
      
      if (result && result.success && result.data) {
        this._goCommandId = result.data;
        console.log(`Created Go command '${this._name || 'root'}' with ID: ${this._goCommandId}`);
      } else {
        console.warn(`Failed to create Go command: ${result ? result.error : 'Unknown error'}`);
        this._fallbackMode = true;
      }
    } catch (error) {
      console.warn(`Error creating Go command: ${error.message}`);
      this._fallbackMode = true;
    }
  }

  // Check if Go backend is being used
  _isUsingGoBackend() {
    return !this._fallbackMode && this._goCommandId !== null && goBackendAvailable;
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

    // Try to add option to Go backend
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.addOption(this._goCommandId, flags, description || "", defaultValue);
        
        if (result && result.success) {
          console.log(`Added option to Go backend: ${flags}`);
        } else {
          console.warn(`Failed to add option to Go backend: ${result ? result.error : 'Unknown error'}`);
          console.warn("Continuing with JavaScript fallback for this option");
        }
      } catch (error) {
        console.warn(`Error adding option to Go backend: ${error.message}`);
        console.warn("Continuing with JavaScript fallback for this option");
      }
    } else {
      console.log(`Added option (JS fallback): ${flags}`);
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

    // Try to add argument to Go backend
    if (this._isUsingGoBackend()) {
      try {
        const result = addon.addArgument(this._goCommandId, name, description || "", required);
        
        if (result && result.success) {
          console.log(`Added argument to Go backend: ${name}`);
        } else {
          console.warn(`Failed to add argument to Go backend: ${result ? result.error : 'Unknown error'}`);
          console.warn("Continuing with JavaScript fallback for this argument");
        }
      } catch (error) {
        console.warn(`Error adding argument to Go backend: ${error.message}`);
        console.warn("Continuing with JavaScript fallback for this argument");
      }
    } else {
      console.log(`Added argument (JS fallback): ${name}`);
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
    const backendInfo = cmd._isUsingGoBackend() ? 'Go backend' : 'JS fallback';
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
    
    // Try Go backend parsing first
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
              console.warn(`Go parsing failed: ${parseResult.error || 'Unknown error'}`);
              console.warn("Falling back to JavaScript parsing");
            }
          } catch (jsonError) {
            console.warn(`Failed to parse Go result JSON: ${jsonError.message}`);
            console.warn("Falling back to JavaScript parsing");
          }
        } else if (result && result.error) {
          console.warn(`Go parsing error: ${result.error}`);
          console.warn("Falling back to JavaScript parsing");
        }
      } catch (error) {
        console.warn(`Error during Go parsing: ${error.message}`);
        console.warn("Falling back to JavaScript parsing");
      }
    }

    // JavaScript fallback parsing
    console.log(`Parsing with JavaScript fallback: ${this._name || 'root'}`);
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
    const diagnostics = {
      command: {
        name: this._name,
        goCommandId: this._goCommandId,
        fallbackMode: this._fallbackMode,
        optionsCount: this._options.size,
        argumentsCount: this._arguments.length,
        subcommandsCount: this._subcommands.size
      },
      backend: this._getBackendInfo(),
      addon: {
        loaded: addon !== null,
        functions: addon ? Object.keys(addon) : []
      }
    };

    return diagnostics;
  }

  // Print diagnostic information
  printDiagnostics() {
    const diagnostics = this.getDiagnostics();
    
    console.log('\n=== GoCommander Diagnostics ===');
    console.log(`Command: ${diagnostics.command.name || 'root'}`);
    console.log(`Go Backend Available: ${diagnostics.backend.goBackendAvailable}`);
    console.log(`Fallback Mode: ${diagnostics.command.fallbackMode}`);
    console.log(`Go Command ID: ${diagnostics.command.goCommandId || 'N/A'}`);
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
    
    if (status.addonLoadError) {
      console.log(`Addon Load Error: ${status.addonLoadError}`);
    }
    
    if (status.lastGoError && status.lastGoError !== 'No error') {
      console.log(`Go Backend Error: ${status.lastGoError}`);
    }
    
    if (addon) {
      console.log(`Available Functions: ${Object.keys(addon).join(', ')}`);
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
