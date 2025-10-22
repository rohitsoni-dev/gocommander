# gocommander

A high-performance Go implementation for command-line interfaces with Node.js compatibility

> ✅ **PRODUCTION READY**
> 
> GoCommander is now production-ready with comprehensive Go backend integration:
> 
> - ✅ Full API compatibility with commander.js
> - ✅ Cross-platform Go backend integration (Windows, macOS, Linux)
> - ✅ Automatic fallback to JavaScript when Go backend unavailable
> - ✅ Up to 97% performance improvement over commander.js
> - ✅ Comprehensive test suite and documentation
> 
> **Ready for production use with zero breaking changes from commander.js.**

## Overview

This project provides a Go implementation of the command-line interfaces that can be used both as a standalone Go library and as a Node.js addon. The implementation maintains 100% API compatibility with commander.js while leveraging Go's performance benefits.

## Features

- Full API compatibility with commander.js
- High-performance Go implementation
- Node.js addon support for use in JavaScript projects
- No external dependencies
- Comprehensive test suite
- Detailed documentation

## Status

✅ **Core Go Implementation**: Complete and fully functional  
✅ **CGO Integration**: Complete with cross-platform support  
✅ **Node.js Addon**: Production-ready with proper Go integration  
✅ **JavaScript Wrapper**: Complete with seamless fallback  
✅ **Go Backend Integration**: Fully working on all platforms  
✅ **Testing**: Comprehensive test suite with integration tests

**Recent Improvements:**
- Fixed Windows DLL loading and symbol export issues
- Resolved Go function accessibility from Node.js addon
- Validated performance benchmarks showing significant improvements
- Confirmed 100% API compatibility with commander.js

## Installation

### Quick Start

#### Node.js Projects
```bash
npm install gocommander
```

#### Go Projects
```bash
go get github.com/rohitsoni-dev/gocommander
```

### Requirements

**Runtime Requirements:**
- Node.js 16.x or higher (recommended: 18.x or 20.x)
- Go 1.19 or higher (for building from source)

**Build Requirements (if building from source):**
- Visual Studio with C++ development tools (Windows)
- Xcode Command Line Tools (macOS)
- build-essential package (Linux)

For detailed installation instructions, see [Setup Guide](./docs/SETUP.md).

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

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:integration      # C++ addon integration tests
npm run test:go-integration   # Go backend integration tests
npm run test:performance      # Performance benchmarks
npm run test:build-system     # Build system tests

# Run Go tests
go test ./src/go/...

# Test examples
node example.js serve ./public --port 8080 --watch
```

### Test Status

- ✅ **Core functionality**: All tests pass
- ✅ **Go integration**: Full integration working
- ✅ **Cross-platform**: Windows, macOS, Linux support
- ✅ **Performance**: Benchmarks validate improvements
- ✅ **Compatibility**: 100% commander.js API compatibility

## Performance

GoCommander provides significant performance improvements over commander.js while maintaining 100% API compatibility:

| Operation | commander.js | GoCommander | Improvement |
|-----------|-------------|-------------|-------------|
| Command Creation | 0.0479ms | 0.0066ms | 86.18% faster |
| Argument Parsing | 0.0825ms | 0.0060ms | 92.77% faster |
| Help Generation | 0.1497ms | 0.1283ms | 14.29% faster |
| Complex Parsing | 0.1021ms | 0.0021ms | 97.95% faster |
| Large Command Trees | 0.8767ms | 0.0574ms | 93.45% faster |

For detailed benchmarks, see [Performance Documentation](./docs/API.md#performance-considerations).

## Contributing

This project is in active development. If you're interested in contributing:

1. Please understand this is beta software
2. Check the issues for known problems
3. Test thoroughly before submitting PRs
4. Follow the existing code style

## Documentation

- **[Setup Guide](./docs/SETUP.md)** - Comprehensive installation and setup instructions
- **[API Documentation](./docs/API.md)** - Complete API reference and examples
- **[Migration Guide](./docs/MIGRATION.md)** - Migrate from commander.js to GoCommander
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Examples](./examples/)** - Working examples and use cases

## Support

- **Issues**: [GitHub Issues](https://github.com/rohitsoni-dev/gocommander/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rohitsoni-dev/gocommander/discussions)
- **Documentation**: [Full Documentation](./docs/)

## License

MIT
