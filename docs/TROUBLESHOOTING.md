# GoCommander Troubleshooting Guide

This guide helps you diagnose and resolve common issues with GoCommander installation, build process, and runtime integration.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Installation Issues](#installation-issues)
- [Build System Issues](#build-system-issues)
- [Runtime Integration Issues](#runtime-integration-issues)
- [Platform-Specific Issues](#platform-specific-issues)
- [Performance Issues](#performance-issues)
- [Advanced Debugging](#advanced-debugging)

## Quick Diagnostics

### Run Diagnostic Tool

```bash
# Run comprehensive diagnostics
npm run test:diagnostics

# Check build system status
npm run test:build-system

# Verify Go backend integration
npm run test:go-integration
```

### Manual Health Check

```javascript
// health-check.js
const path = require('path');
const fs = require('fs');

console.log('=== GoCommander Health Check ===');

// Check Node.js environment
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Check Go installation
try {
  const { execSync } = require('child_process');
  const goVersion = execSync('go version', { encoding: 'utf8' });
  console.log('Go version:', goVersion.trim());
} catch (error) {
  console.log('Go not found:', error.message);
}

// Check build artifacts
const artifacts = [
  'build/Release/gommander.node',
  'src/gommander.dll',
  'src/gommander.a',
  'src/gommander.h'
];

artifacts.forEach(artifact => {
  const exists = fs.existsSync(artifact);
  console.log(`${artifact}: ${exists ? '✓' : '✗'}`);
});

// Test GoCommander loading
try {
  const gocommander = require('./index.js');
  console.log('GoCommander loaded: ✓');
  
  try {
    const version = gocommander.version();
    console.log('Go backend version:', version);
    console.log('Go backend status: ✓');
  } catch (error) {
    console.log('Go backend status: ✗ (fallback mode)');
    console.log('Error:', error.message);
  }
} catch (error) {
  console.log('GoCommander loading: ✗');
  console.log('Error:', error.message);
}
```

## Installation Issues

### Issue: NPM Install Fails

#### Symptoms
```
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! gocommander@1.0.2 install: `node scripts/install.js`
```

#### Diagnosis
```bash
# Check npm configuration
npm config list
npm config get registry

# Check network connectivity
npm ping

# Check permissions
npm config get prefix
ls -la $(npm config get prefix)
```

#### Solutions

**Solution 1: Clear npm cache**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2: Use different registry**
```bash
npm install --registry https://registry.npmjs.org/
```

**Solution 3: Install with different flags**
```bash
# Skip optional dependencies
npm install --no-optional

# Force rebuild
npm install --build-from-source

# Ignore scripts
npm install --ignore-scripts
```

### Issue: Permission Denied Errors

#### Symptoms
```
EACCES: permission denied, mkdir '/usr/local/lib/node_modules'
```

#### Solutions

**Solution 1: Use node version manager**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js
nvm install 18
nvm use 18
npm install gocommander
```

**Solution 2: Configure npm prefix**
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

**Solution 3: Use sudo (not recommended)**
```bash
sudo npm install -g gocommander --unsafe-perm=true --allow-root
```

## Build System Issues

### Issue: Go Build Fails

#### Symptoms
```
Error: Go compiler not found
Error: CGO_ENABLED is not set
Error: cannot find package "C"
```

#### Diagnosis
```bash
# Check Go installation
go version
go env GOROOT
go env GOPATH
go env CGO_ENABLED

# Check C compiler
gcc --version  # Linux/macOS
cl            # Windows
```

#### Solutions

**Solution 1: Install/Configure Go**
```bash
# Linux (Ubuntu/Debian)
sudo apt install golang-go

# macOS
brew install go

# Windows - Download from https://golang.org/dl/
```

**Solution 2: Enable CGO**
```bash
export CGO_ENABLED=1
npm run go:build
```

**Solution 3: Install C compiler**
```bash
# Linux
sudo apt install build-essential

# macOS
xcode-select --install

# Windows - Install Visual Studio with C++ tools
```

### Issue: C++ Addon Build Fails

#### Symptoms
```
gyp ERR! build error
gyp ERR! stack Error: `make` failed with exit code: 2
node-gyp ERR! build error
```

#### Diagnosis
```bash
# Check node-gyp
node-gyp --version
npm list node-gyp

# Check Python
python --version
python3 --version

# Check build tools
make --version    # Linux/macOS
msbuild /version  # Windows
```

#### Solutions

**Solution 1: Install build tools**
```bash
# Linux
sudo apt install build-essential

# macOS
xcode-select --install

# Windows
npm install --global windows-build-tools
```

**Solution 2: Configure Python**
```bash
# Set Python version for node-gyp
npm config set python python3
# or
npm install --python=python3
```

**Solution 3: Clean and rebuild**
```bash
npm run clean
rm -rf build/
npm run build
```

### Issue: Linking Errors

#### Symptoms
```
ld: library not found for -lgommander
LINK : fatal error LNK1181: cannot open input file 'gommander.lib'
```

#### Diagnosis
```bash
# Check if Go library was built
ls -la src/gommander.*

# Check library format
file src/gommander.a    # Should show "ar archive"
file src/gommander.dll  # Should show "PE32+ executable"
```

#### Solutions

**Solution 1: Rebuild Go library**
```bash
npm run go:build-clean
npm run go:build
```

**Solution 2: Check binding.gyp configuration**
```bash
# Verify library paths in binding.gyp match actual files
cat binding.gyp | grep -A5 -B5 libraries
```

**Solution 3: Platform-specific fixes**
```bash
# Windows - ensure DLL is in correct location
copy src\gommander.dll build\Release\

# Linux/macOS - check static library
ar t src/gommander.a  # Should list object files
```

## Runtime Integration Issues

### Issue: Go Backend Not Available

#### Symptoms
```
Warning: Go backend not available, using JavaScript fallback
Go backend status: Hello from JavaScript fallback!
```

#### Diagnosis
```javascript
// Check addon loading
try {
  const addon = require('./build/Release/gommander.node');
  console.log('Addon loaded successfully');
  console.log('Available functions:', Object.keys(addon));
} catch (error) {
  console.log('Addon loading failed:', error.message);
}
```

#### Solutions

**Solution 1: Rebuild everything**
```bash
npm run clean
npm run go:build-clean
npm install
npm run build
```

**Solution 2: Check library dependencies**
```bash
# Linux
ldd build/Release/gommander.node

# macOS
otool -L build/Release/gommander.node

# Windows
dumpbin /dependents build\Release\gommander.node
```

**Solution 3: Verify Go exports**
```bash
# Check if Go functions are exported
nm src/gommander.a | grep -E "(CreateCommand|AddOption|ParseArgs)"

# Windows
dumpbin /exports src\gommander.dll
```

### Issue: Function Call Failures

#### Symptoms
```
Error: Go function 'CreateCommand' failed with code: -1
TypeError: Cannot read property 'parse' of undefined
```

#### Diagnosis
```javascript
// Test individual functions
const { addon } = require('./index.js');

try {
  console.log('Testing createCommand...');
  const cmdId = addon.createCommand('test');
  console.log('Command ID:', cmdId);
  
  console.log('Testing addOption...');
  const result = addon.addOption(cmdId, '-v, --verbose', 'Verbose output', '');
  console.log('Add option result:', result);
} catch (error) {
  console.log('Function test failed:', error.message);
  console.log('Stack trace:', error.stack);
}
```

#### Solutions

**Solution 1: Check function signatures**
```cpp
// Verify N-API function signatures match Go exports
// Check src/addon.cc for correct parameter types
```

**Solution 2: Enable debug logging**
```bash
export DEBUG=gocommander:*
node your-script.js
```

**Solution 3: Test with minimal example**
```javascript
const { Command } = require('gocommander');

const cmd = new Command('test');
cmd.option('-v, --verbose', 'Verbose output');
cmd.parse(['node', 'test', '--verbose']);
```

### Issue: Memory Leaks or Crashes

#### Symptoms
```
Segmentation fault (core dumped)
Process finished with exit code 139
Memory usage keeps increasing
```

#### Diagnosis
```bash
# Run with memory debugging
valgrind --tool=memcheck --leak-check=full node your-script.js

# Monitor memory usage
top -p $(pgrep node)

# Check for core dumps
ls -la core*
gdb node core
```

#### Solutions

**Solution 1: Update to latest version**
```bash
npm update gocommander
```

**Solution 2: Reduce memory pressure**
```javascript
// Explicitly clean up commands
const cmd = new Command('test');
// ... use command
cmd = null;  // Allow garbage collection
```

**Solution 3: Report bug with minimal reproduction**
```javascript
// Create minimal test case that reproduces the issue
// Include system information and stack trace
```

## Platform-Specific Issues

### Windows Issues

#### Issue: Visual Studio Not Found

**Symptoms**:
```
gyp ERR! find VS msvs_version not set from command line or npm config
```

**Solutions**:
```cmd
# Install Visual Studio Build Tools
npm install --global windows-build-tools

# Or set VS version manually
npm config set msvs_version 2019
npm install
```

#### Issue: DLL Loading Fails

**Symptoms**:
```
Error: The specified module could not be found.
```

**Solutions**:
```cmd
# Check DLL dependencies
dumpbin /dependents build\Release\gommander.node

# Install Visual C++ Redistributable
# Download from Microsoft website

# Copy required DLLs to build directory
copy "C:\Program Files\Microsoft Visual Studio\...\vcruntime140.dll" build\Release\
```

### macOS Issues

#### Issue: Xcode Tools Missing

**Symptoms**:
```
xcrun: error: invalid active developer path
```

**Solutions**:
```bash
# Install Xcode command line tools
xcode-select --install

# Reset Xcode path
sudo xcode-select --reset
```

#### Issue: Architecture Mismatch

**Symptoms**:
```
ld: warning: ignoring file src/gommander.a, building for macOS-arm64 but attempting to link with file built for macOS-x86_64
```

**Solutions**:
```bash
# Build for correct architecture
export GOARCH=arm64  # or amd64
npm run go:build-clean
npm run go:build

# Or build universal binary
lipo -create src/gommander_amd64.a src/gommander_arm64.a -output src/gommander.a
```

### Linux Issues

#### Issue: Missing Build Dependencies

**Symptoms**:
```
make: gcc: Command not found
/bin/sh: 1: python: not found
```

**Solutions**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential python3 python3-dev

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install python3 python3-devel

# Alpine
apk add build-base python3 python3-dev
```

## Performance Issues

### Issue: Slow Performance

#### Diagnosis
```bash
# Run performance benchmarks
npm run test:performance

# Compare with JavaScript implementation
npm run test:performance-comparison
```

#### Solutions

**Solution 1: Verify Go backend is active**
```javascript
const { Command } = require('gocommander');
const cmd = new Command('test');
console.log('Using Go backend:', !cmd._fallbackMode);
```

**Solution 2: Check for debug builds**
```bash
# Rebuild in release mode
npm run go:build -- --release
npm run build --release
```

**Solution 3: Profile the application**
```bash
# Profile with Node.js built-in profiler
node --prof your-script.js
node --prof-process isolate-*.log > profile.txt
```

## Advanced Debugging

### Enable Verbose Logging

```bash
# Environment variables for debugging
export DEBUG=gocommander:*
export NODE_DEBUG=module
export npm_config_loglevel=verbose

# Run with debugging enabled
node your-script.js
```

### Debug C++ Addon

```bash
# Build debug version
node-gyp configure --debug
node-gyp build

# Debug with gdb (Linux/macOS)
gdb --args node your-script.js

# Debug with Visual Studio (Windows)
devenv build\binding.sln
```

### Debug Go Backend

```go
// Add debug prints to Go code
package main

import "C"
import "fmt"

//export CreateCommand
func CreateCommand(name *C.char) C.uintptr_t {
    fmt.Printf("DEBUG: CreateCommand called with name: %s\n", C.GoString(name))
    // ... rest of function
}
```

### Memory Debugging

```bash
# Linux - Valgrind
valgrind --tool=memcheck --leak-check=full --show-leak-kinds=all node your-script.js

# macOS - Instruments
instruments -t "Allocations" node your-script.js

# Windows - Application Verifier
# Use Visual Studio Diagnostic Tools
```

### Network and System Debugging

```bash
# Check system resources
htop
iostat 1
netstat -tulpn

# Check file descriptors
lsof -p $(pgrep node)

# Check shared libraries
ldconfig -p | grep gommander
```

## Getting Help

### Before Reporting Issues

1. **Run diagnostics**: `npm run test:diagnostics`
2. **Check logs**: Look for error messages and stack traces
3. **Minimal reproduction**: Create smallest possible test case
4. **System information**: Include OS, Node.js, Go versions
5. **Build logs**: Include full build output if build fails

### Reporting Template

```markdown
**Environment:**
- OS: [e.g., Ubuntu 20.04, Windows 10, macOS 12.0]
- Node.js: [e.g., v18.17.0]
- npm: [e.g., 9.6.7]
- Go: [e.g., go1.20.5]
- GoCommander: [e.g., 1.0.2]

**Issue Description:**
[Clear description of the problem]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]

**Expected Behavior:**
[What you expected to happen]

**Actual Behavior:**
[What actually happened]

**Error Messages:**
```
[Paste error messages here]
```

**Additional Context:**
[Any other relevant information]
```

### Community Resources

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/rohitsoni-dev/gocommander/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/rohitsoni-dev/gocommander/discussions)
- **Documentation**: [Full documentation](./README.md)
- **Examples**: [Working examples](../examples/)

### Professional Support

For enterprise users requiring professional support, please contact the maintainers through GitHub or the project website.