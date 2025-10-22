# GoCommander Setup and Installation Guide

This guide provides comprehensive instructions for setting up and installing GoCommander across different platforms and environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Platform-Specific Setup](#platform-specific-setup)
- [Build from Source](#build-from-source)
- [Verification](#verification)
- [Common Issues](#common-issues)

## Prerequisites

### System Requirements

- **Node.js**: Version 16.x or higher (recommended: 18.x or 20.x)
- **npm**: Version 7.x or higher (or pnpm 8.x+)
- **Go**: Version 1.19 or higher (required for building from source)

### Platform-Specific Requirements

#### Windows
- **Visual Studio 2019 or 2022** with C++ development tools
- **Windows SDK** (usually included with Visual Studio)
- **Git for Windows** (recommended)

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **Homebrew** (recommended for dependency management)

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install build-essential git golang-go nodejs npm
```

#### Linux (CentOS/RHEL/Fedora)
```bash
# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install git golang nodejs npm

# Fedora
sudo dnf groupinstall "Development Tools"
sudo dnf install git golang nodejs npm
```

## Installation Methods

### Method 1: NPM Package (Recommended)

```bash
npm install gocommander
```

**Note**: This method includes pre-built binaries for common platforms. If binaries are not available for your platform, it will automatically fall back to building from source.

### Method 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/rohitsoni-dev/gocommander.git
cd gocommander

# Install dependencies
npm install

# Build the Go backend and C++ addon
npm run build
```

### Method 3: Development Installation

```bash
# Clone and install in development mode
git clone https://github.com/rohitsoni-dev/gocommander.git
cd gocommander
npm install
npm run go:build
npm run build
npm test
```

## Platform-Specific Setup

### Windows Setup

#### Visual Studio Configuration

1. **Install Visual Studio 2019 or 2022**
   - Include "Desktop development with C++" workload
   - Ensure Windows SDK is selected

2. **Verify Installation**
   ```cmd
   # Check if Visual Studio is properly configured
   where cl
   where link
   ```

3. **Environment Variables**
   ```cmd
   # These should be set automatically by Visual Studio installer
   echo %VCINSTALLDIR%
   echo %WindowsSDKDir%
   ```

#### Go Configuration on Windows

```cmd
# Verify Go installation
go version

# Set CGO environment (if needed)
set CGO_ENABLED=1
set CC=gcc
```

#### Build Process on Windows

```cmd
# Build Go library as DLL
npm run go:build

# Build C++ addon
npm run build

# Verify installation
node -e "console.log(require('./index.js'))"
```

### macOS Setup

#### Xcode Tools Installation

```bash
# Install Xcode command line tools
xcode-select --install

# Verify installation
xcode-select -p
gcc --version
```

#### Go Installation on macOS

```bash
# Using Homebrew (recommended)
brew install go

# Or download from https://golang.org/dl/
# Verify installation
go version
```

#### Build Process on macOS

```bash
# Build Go library
npm run go:build

# Build C++ addon
npm run build

# Verify installation
node -e "console.log(require('./index.js'))"
```

### Linux Setup

#### Ubuntu/Debian

```bash
# Install build dependencies
sudo apt update
sudo apt install build-essential git golang-go nodejs npm python3

# Verify installations
gcc --version
go version
node --version
npm --version
```

#### CentOS/RHEL

```bash
# Install build dependencies
sudo yum groupinstall "Development Tools"
sudo yum install git golang nodejs npm python3

# For newer versions, use dnf instead of yum
```

#### Build Process on Linux

```bash
# Build Go library
npm run go:build

# Build C++ addon
npm run build

# Verify installation
node -e "console.log(require('./index.js'))"
```

## Build from Source

### Step-by-Step Build Process

1. **Clone Repository**
   ```bash
   git clone https://github.com/rohitsoni-dev/gocommander.git
   cd gocommander
   ```

2. **Install Node.js Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Build Go Backend**
   ```bash
   # Standard build
   npm run go:build
   
   # Clean build (removes previous artifacts)
   npm run go:build-clean
   
   # Verbose build (shows detailed output)
   npm run go:build-verbose
   ```

4. **Build C++ Addon**
   ```bash
   # Configure and build
   npm run build
   
   # Or manually
   node-gyp configure build
   ```

5. **Verify Build**
   ```bash
   # Run tests
   npm test
   
   # Test specific functionality
   node example.js --help
   ```

### Build Configuration

#### Environment Variables

```bash
# Go build configuration
export CGO_ENABLED=1
export GOOS=linux    # or windows, darwin
export GOARCH=amd64  # or arm64, 386

# Node.js build configuration
export npm_config_build_from_source=true
export npm_config_cache=/tmp/.npm
```

#### Custom Build Flags

```bash
# Go build with custom flags
go build -buildmode=c-archive -ldflags="-s -w" -o src/gommander.a src/go/gommander.go

# Node.js build with custom configuration
node-gyp configure --debug
node-gyp build --verbose
```

## Verification

### Basic Functionality Test

```javascript
// test-installation.js
const { Command, hello, version } = require('gocommander');

console.log('GoCommander Version:', version());
console.log('Go Backend Status:', hello());

const program = new Command();
program
  .version('1.0.0')
  .description('Test installation')
  .option('-v, --verbose', 'Verbose output')
  .action((options) => {
    console.log('Installation successful!');
    if (options.verbose) {
      console.log('Go backend is working properly.');
    }
  });

program.parse(['node', 'test', '--verbose']);
```

### Run Verification

```bash
# Basic test
node test-installation.js

# Run full test suite
npm test

# Run integration tests
npm run test:integration

# Performance benchmark
npm run test:performance
```

### Expected Output

```
GoCommander Version: 1.0.2
Go Backend Status: Hello from Go backend!
Installation successful!
Go backend is working properly.
```

## Common Issues

### Issue: "Go backend not available"

**Symptoms**: JavaScript fallback is used instead of Go backend

**Solutions**:
1. Rebuild Go library: `npm run go:build`
2. Check Go installation: `go version`
3. Verify build artifacts exist in `src/` directory

### Issue: "Cannot find module './build/Release/gommander.node'"

**Symptoms**: C++ addon not found

**Solutions**:
1. Rebuild addon: `npm run build`
2. Check build directory: `ls build/Release/`
3. Install build tools for your platform

### Issue: Build fails on Windows

**Symptoms**: Visual Studio or Windows SDK errors

**Solutions**:
1. Install Visual Studio with C++ tools
2. Run from "Developer Command Prompt"
3. Set environment variables manually if needed

### Issue: Permission errors on Linux/macOS

**Symptoms**: EACCES or permission denied errors

**Solutions**:
1. Use `sudo` for global installation
2. Configure npm to use different directory
3. Use node version manager (nvm)

For more detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Next Steps

After successful installation:

1. Read the [API Documentation](./API.md)
2. Check out [Examples](../examples/)
3. Review [Migration Guide](./MIGRATION.md) if upgrading
4. Join our [Community](https://github.com/rohitsoni-dev/gocommander/discussions)

## Support

- **Issues**: [GitHub Issues](https://github.com/rohitsoni-dev/gocommander/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rohitsoni-dev/gocommander/discussions)
- **Documentation**: [Full Documentation](./README.md)