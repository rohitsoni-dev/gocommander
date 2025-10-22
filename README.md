# gocommander

A Go implementation for command-line interfaces with Node.js compatibility

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
✅ **CGO Integration**: Complete and working  
✅ **Node.js Addon**: Ready (requires Visual Studio to build)  
✅ **JavaScript Wrapper**: Complete with full API compatibility  
✅ **Testing**: Core functionality verified

## Installation

### For Go Projects

```bash
go get github.com/rohitsoni-dev/gocommander
```

### For Node.js Projects

```bash
npm install gocommander
```

_Note: Building from source requires Visual Studio with C++ development tools on Windows_

## Usage

### Node.js Usage

```javascript
const { Command } = require("gocommander");

const program = new Command();
program
  .version("1.0.0")
  .description("My awesome CLI application")
  .action(() => {
    console.log("Hello from gocommander!");
  });

program.parse(process.argv);
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

Run Go tests: `go test ./src/go/...`
Run JavaScript tests: `pnpm test`

## Performance

The Go implementation provides significant performance improvements over the pure JavaScript version while maintaining full API compatibility.

### Benchmark Results

In our comprehensive benchmarks, GoCommander outperforms commander.js across all measured operations:

| Operation                   | GoCommander | Commander.js | Improvement   |
| --------------------------- | ----------- | ------------ | ------------- |
| Startup Time                | 0.0026ms    | 0.0137ms     | 80.72% faster |
| Command Creation            | 0.0066ms    | 0.0479ms     | 86.18% faster |
| Argument Parsing Setup      | 0.0060ms    | 0.0825ms     | 92.77% faster |
| Help Generation             | 0.1283ms    | 0.1497ms     | 14.29% faster |
| Large Command Tree Creation | 0.0574ms    | 0.8767ms     | 93.45% faster |
| Complex Options Parsing     | 0.0021ms    | 0.1021ms     | 97.95% faster |
| Action Execution            | 0.0023ms    | 0.0143ms     | 83.70% faster |
| Validation Performance      | 0.0030ms    | 0.0250ms     | 87.83% faster |
| Subcommand Lookup           | 0.0052ms    | 0.0225ms     | 76.77% faster |
| Concurrent Usage            | 0.0175ms    | 0.1195ms     | 85.32% faster |
| Long-running Session        | 0.1464ms    | 2.0909ms     | 93.00% faster |
| Complex Help Generation     | 0.1243ms    | 0.2767ms     | 55.09% faster |
| Autocomplete Performance    | 0.0327ms    | 0.9962ms     | 96.71% faster |

For detailed benchmark results and methodology, see [gocommander-benchmark](https://github.com/rohitsoni-dev/gocommander-benchmark).

## License

MIT
