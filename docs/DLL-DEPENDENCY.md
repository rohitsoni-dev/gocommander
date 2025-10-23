# GoCommander DLL Dependency and Fallback Behavior

## Overview

GoCommander is a Node.js command-line interface library that leverages Go's performance through a native addon. The library uses a dual-backend architecture with automatic fallback to ensure functionality even when the Go backend is unavailable.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    JavaScript Layer                         │
│  • Command parsing and execution                            │
│  • Automatic backend detection                              │
│  • Seamless fallback handling                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    C++ Addon Bridge                        │
│  • Native Node.js addon (gommander.node)                   │
│  • Bridges JavaScript and Go                               │
│  • Handles DLL loading and function exports                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Go DLL Backend                        │
│  • High-performance command parsing (gommander.dll)        │
│  • Advanced argument validation                             │
│  • Optimized help generation                               │
└─────────────────────────────────────────────────────────────┘
```

## DLL Dependency

### Required Files

GoCommander requires the following files for full Go backend functionality:

1. **gommander.node** - The compiled Node.js addon (located in `build/Release/` or `build/Debug/`)
2. **gommander.dll** - The Go library (should be in the root directory)

### DLL Search Paths

The C++ addon searches for `gommander.dll` in the following locations (in order of priority):

1. `./gommander.dll` (root directory - **recommended location**)
2. `gommander.dll` (current directory)
3. `build/Release/gommander.dll`
4. `build/Debug/gommander.dll`
5. `src/gommander.dll`
6. `src/go/gommander.dll`
7. `../gommander.dll`
8. `../src/go/gommander.dll`
9. `./src/go/gommander.dll`

**Note**: The exact search paths may vary based on the build configuration and platform. Use the diagnostic functions to see which paths are actually being searched in your environment.

### Building the DLL

To build the required DLL:

```bash
# Build both the Go library and Node.js addon
npm run build

# Or build components separately
npm run build-go    # Builds gommander.dll
npm run build-addon # Builds gommander.node
```

## Fallback Behavior

### Automatic Detection

GoCommander automatically detects the availability of the Go backend during initialization:

1. **Addon Loading**: Attempts to load the Node.js addon (`gommander.node`)
2. **DLL Loading**: If addon loads, attempts to load the Go DLL (`gommander.dll`)
3. **Function Validation**: Verifies that required Go functions are exported
4. **Backend Selection**: Uses Go backend if available, otherwise falls back to JavaScript

### Fallback Scenarios

The library falls back to JavaScript implementation in these cases:

| Scenario | Addon Loaded | Go Backend | Behavior |
|----------|--------------|------------|----------|
| **Full Go Backend** | ✅ | ✅ | Uses Go for all operations (optimal performance) |
| **Missing DLL** | ✅ | ❌ | Uses JavaScript parsing (reduced performance) |
| **Missing Addon** | ❌ | ❌ | Uses JavaScript parsing (reduced performance) |
| **Build Error** | ❌ | ❌ | Uses JavaScript parsing (reduced performance) |

### Performance Impact

| Operation | Go Backend | JavaScript Fallback | Performance Difference |
|-----------|------------|---------------------|----------------------|
| Command Creation | ~0.1ms | ~0.5ms | 5x slower |
| Argument Parsing | ~0.2ms | ~2ms | 10x slower |
| Help Generation | ~0.5ms | ~5ms | 10x slower |
| Complex Commands | ~1ms | ~20ms | 20x slower |

## Error Messages and Diagnostics

### Common Error Messages

#### Missing DLL
```
⚠️  Loaded addon from ./build/Release/gommander.node but Go backend unavailable
   Go backend error: Go backend initialization failed: Failed to load gommander.dll from any path
   💡 This appears to be a DLL loading issue
      Check if gommander.dll exists in the root directory
```

#### Missing Addon
```
⚠️  Go addon loading failed - using JavaScript fallback implementation
Error: Go addon not found in any expected location.
```

#### Function Name Mismatch
```
⚠️  FUNCTION NAME MISMATCH DETECTED
   Found "isAvailable" function instead of "isGoAvailable"
   💡 Solution: Update C++ addon to export "isGoAvailable" instead of "isAvailable"
```

### Diagnostic Functions

GoCommander provides several diagnostic functions to help troubleshoot issues:

```javascript
const { FallbackSystem, isGoBackendAvailable } = require('gocommander');

// Check if Go backend is available
console.log('Go Backend Available:', isGoBackendAvailable());

// Get detailed backend status
const status = FallbackSystem.getBackendStatus();
console.log('Backend Status:', status);

// Print comprehensive diagnostics
FallbackSystem.printSystemDiagnostics();

// Get troubleshooting guidance
const guidance = FallbackSystem.getTroubleshootingGuidance();
console.log('Troubleshooting Steps:', guidance.steps);
```

## Troubleshooting Guide

### Step 1: Verify Installation

```bash
# Check if files exist
ls -la gommander.dll                    # Should exist in root directory
ls -la build/Release/gommander.node     # Should exist after build

# On Windows
dir gommander.dll
dir build\Release\gommander.node
```

### Step 2: Build Dependencies

```bash
# Install build dependencies
npm install -g node-gyp

# Clean and rebuild
npm run clean
npm run build

# Check build output for errors
npm run build 2>&1 | grep -i error
```

### Step 3: Platform-Specific Issues

#### Windows
- Ensure Visual Studio Build Tools are installed
- Verify Windows SDK is available
- Check that `gommander.dll` is in the root directory

```bash
# Check Visual Studio tools
where cl.exe

# Verify DLL dependencies
dumpbin /dependents gommander.dll
```

#### macOS
- Ensure Xcode Command Line Tools are installed
- Check that `gommander.a` is built correctly

```bash
# Check Xcode tools
xcode-select --print-path

# Verify static library
file src/gommander.a
```

#### Linux
- Ensure build-essential is installed
- Verify GCC version compatibility

```bash
# Check build tools
gcc --version
make --version
```

### Step 4: Runtime Diagnostics

```javascript
// Test Go backend functionality
const { FallbackSystem } = require('gocommander');

const testResult = FallbackSystem.testGoBackend();
console.log('Go Backend Test:', testResult);

// Get detailed error information
if (!testResult.success) {
  const guidance = FallbackSystem.getTroubleshootingGuidance();
  console.log('Recommended Actions:', guidance.steps);
}
```

## Best Practices

### Development

1. **Always test both backends** during development
2. **Use diagnostic functions** to verify backend status
3. **Handle fallback gracefully** in your application code
4. **Monitor performance** differences between backends

### Deployment

1. **Include both files** in your deployment package:
   - `build/Release/gommander.node`
   - `gommander.dll` (in root directory)

2. **Verify file permissions** on Unix systems:
   ```bash
   chmod +x build/Release/gommander.node
   chmod +r gommander.dll
   ```

3. **Test fallback behavior** in your deployment environment

### Error Handling

```javascript
const { Command, isGoBackendAvailable, FallbackSystem } = require('gocommander');

// Check backend status at startup
if (!isGoBackendAvailable()) {
  console.warn('Running in JavaScript fallback mode');
  console.warn('Performance may be reduced');
  
  // Optionally show troubleshooting guidance
  const guidance = FallbackSystem.getTroubleshootingGuidance();
  console.log('To enable Go backend:', guidance.quickFixes);
}

// Your application code works the same regardless of backend
const program = new Command('myapp');
program
  .description('My CLI application')
  .option('-v, --verbose', 'Verbose output')
  .parse(process.argv);
```

## FAQ

### Q: Is the JavaScript fallback fully functional?
**A:** Yes, the JavaScript fallback provides 100% feature compatibility. The only difference is performance - operations will be slower but all functionality remains available.

### Q: Can I force JavaScript mode for testing?
**A:** Yes, temporarily rename or move `gommander.dll` to test fallback behavior. The library will automatically detect the missing DLL and use JavaScript parsing.

### Q: How do I know which backend is being used?
**A:** Use the diagnostic functions:
```javascript
const { isGoBackendAvailable, FallbackSystem } = require('gocommander');
console.log('Using Go Backend:', isGoBackendAvailable());
FallbackSystem.printSystemDiagnostics(); // Detailed information
```

### Q: What if the DLL is corrupted?
**A:** The library will detect DLL loading failures and automatically fall back to JavaScript. Rebuild the DLL with `npm run build-go` to fix corruption issues.

### Q: Can I deploy without the DLL?
**A:** Yes, the application will work in JavaScript fallback mode. However, you'll lose the performance benefits of the Go backend.

### Q: How do I update the Go backend?
**A:** Run `npm run build` to rebuild both the Go library and Node.js addon. This ensures compatibility between components.

## Support

If you encounter issues not covered in this guide:

1. **Run diagnostics**: Use `FallbackSystem.printSystemDiagnostics()`
2. **Check build logs**: Review output from `npm run build`
3. **Verify platform compatibility**: Ensure your system meets the build requirements
4. **Test fallback mode**: Verify that JavaScript fallback works correctly

The library is designed to be resilient - even if the Go backend fails completely, your application will continue to function using the JavaScript implementation.