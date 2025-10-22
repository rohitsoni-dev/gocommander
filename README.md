# gocommander

A Go implementation for command-line interfaces with Node.js compatibility

> ⚠️ **BETA SOFTWARE - NOT READY FOR PRODUCTION USE**
> 
> This project is currently in active development and is **NOT READY FOR PRODUCTION USE**.
> 
> - 🚧 Features are incomplete and under active development
> - 🔄 APIs may change without notice
> - 🐛 Expect bugs and stability issues
> - 📋 Go DLL integration is not fully functional on Windows
> 
> **Please do not use this in production projects. This is for development and testing purposes only.**

## Overview

This project provides a Go implementation of the command-line interfaces that can be used both as a standalone Go library and as a Node.js addon. The implementation maintains 100% API compatibility with commander.js while leveraging Go's performance benefits.

## Features

- Full API compatibility with commander.js
- High-performance Go implementation
- Node.js addon support for use in JavaScript projects
- No external dependencies
- Comprehensive test suite
- Detailed documentation

## Development Status

🚧 **Core Go Implementation**: Complete but needs integration testing  
🚧 **CGO Integration**: Implemented but DLL loading issues on Windows  
⚠️ **Node.js Addon**: Builds successfully but Go functions not fully connected  
🚧 **JavaScript Wrapper**: Functional with fallback to JS implementation  
⚠️ **Go Backend Integration**: Partially working - DLL loading needs fixes  
🚧 **Testing**: Basic functionality verified, integration tests needed

**Current Issues:**
- Windows DLL loading not working properly
- Go functions not accessible from Node.js addon
- Performance benchmarks not yet validated
- API compatibility not fully tested

## Installation

> ⚠️ **WARNING: Do not install for production use!**

This package is in beta development and should only be used for testing and development purposes.

### For Development/Testing Only

#### Go Projects (Development)
```bash
# DO NOT USE IN PRODUCTION
go get github.com/rohitsoni-dev/gocommander
```

#### Node.js Projects (Development)
```bash
# DO NOT USE IN PRODUCTION
npm install gocommander
```

**Requirements for building from source:**
- Visual Studio with C++ development tools (Windows)
- Go 1.25.3 or higher
- Node.js 24 or higher
- npm 11.3.0 or higher

_Note: The Go DLL integration is currently not working on Windows._

## Usage

### Node.js Usage

```javascript
const { Command, hello, version } = require("gocommander");

// Test Go backend connectivity
console.log("Go backend:", hello());
console.log("Go version:", version());

const program = new Command();
program
  .version("1.0.0")
  .description("My awesome CLI application powered by Go")
  .action(() => {
    console.log("Hello from Go backend!");
  });

program.parse(process.argv);
```

### Go Backend Integration

The JavaScript interface now directly uses the Go implementation for all operations:

```javascript
const { Command, program, addon } = require("gocommander");

// Create commands that are backed by Go
const app = new Command('myapp');
app
  .description('Powered by Go backend')
  .option('-v, --verbose', 'Verbose output')
  .command('serve', 'Start server')
  .action((args, options) => {
    // This action is processed through the Go backend
    console.log('Server starting with Go performance!');
  });

// All parsing is handled by Go
app.parse(process.argv);
```

## Architecture

The project consists of three main components:

1. **Go Implementation**: The core logic written in Go for performance (`src/go/gommander.go`)
2. **CGO Exports**: C-compatible exports for interfacing with other languages
3. **Node.js Addon**: A native Node.js addon that bridges JavaScript and Go (`src/addon.cc`)

## Building from Source

### Prerequisites

- Go 1.25.3 or higher
- Node.js 24 or higher
- npm 11.3.0 or higher
- Visual Studio with C++ development tools (Windows)
- GCC or Clang (macOS/Linux)
- pnpm 10.18.3

### Build Steps

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the Go library: `go build -buildmode=c-archive -o src/gommander.a src/go/gommander.go`
4. Build the Node.js addon: `pnpm run build`

## Examples

See the [examples](./examples/) directory for usage examples.

### Project Boilerplate Generator

A CLI tool for generating project boilerplates:

```bash
# List available templates
node examples/boilerplate-generator.js list

# Generate a new Node.js Express project
node examples/boilerplate-generator.js generate node-express my-api

# Generate a new React app with a custom name
node examples/boilerplate-generator.js generate react-app my-app --name "My React Application"
```

This example demonstrates advanced features like:

- Multiple template support
- Dynamic file generation with placeholder replacement
- Nested directory creation
- Comprehensive error handling

### Todo Manager

A CLI tool for managing todo lists:

```bash
# Add a new todo (note: options must come before arguments)
node examples/todo-manager.js add --priority=high --tags=shopping,urgent "Buy groceries"

# List incomplete todos
node examples/todo-manager.js list

# List all todos including completed ones
node examples/todo-manager.js list --all

# Filter by priority
node examples/todo-manager.js list --priority=high

# Filter by tag
node examples/todo-manager.js list --tag=shopping

# Mark a todo as complete
node examples/todo-manager.js complete 1

# Delete a todo
node examples/todo-manager.js delete 2

# Clear completed todos
node examples/todo-manager.js clear
```

This example demonstrates features like:

- Persistent data storage in JSON format
- Priority levels and tagging system
- Filtering and sorting capabilities
- Data validation and error handling
- Proper handling of command-line argument ordering

## Testing

> ⚠️ **Note: Tests currently run with JavaScript fallback due to Go DLL loading issues.**

```bash
# Run Go tests (when Go integration is fixed)
go test ./src/go/...

# Run JavaScript tests (currently working)
pnpm test

# Run example (uses JavaScript implementation)
node example.js
```

### Test the Current Implementation

```bash
# Test basic functionality (JavaScript fallback)
node test/test.js

# Test advanced features (JavaScript fallback)
node test/advanced-test.js

# Run the example CLI (JavaScript implementation)
node example.js serve ./public --port 8080 --watch
```

**Current Test Status:**
- ✅ JavaScript implementation tests pass
- ⚠️ Go integration tests fail due to DLL loading issues
- 🚧 Performance tests not yet implemented

## Performance

> ⚠️ **Note: Performance benchmarks are theoretical and not yet validated in the current beta implementation.**

The Go implementation is designed to provide significant performance improvements over the pure JavaScript version while maintaining API compatibility.

## Contributing

This project is in active development. If you're interested in contributing:

1. Please understand this is beta software
2. Check the issues for known problems
3. Test thoroughly before submitting PRs
4. Follow the existing code style

## Disclaimer

**THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.** This is beta software under active development. Use at your own risk. The authors are not responsible for any issues, data loss, or problems that may arise from using this software.

## License

MIT
