# gommander

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
go get github.com/rohitsoni-dev/gommander
```

### For Node.js Projects

```bash
pnpm install gommander
```

_Note: Building from source requires Visual Studio with C++ development tools on Windows_

## Usage

### Node.js Usage

```javascript
const { Command } = require("gommander");

const program = new Command();
program
  .version("1.0.0")
  .description("My awesome CLI application")
  .action(() => {
    console.log("Hello from gommander!");
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

## Testing

Run Go tests: `go test ./src/go/...`
Run JavaScript tests: `pnpm test`

## Performance

The Go implementation provides significant performance improvements over the pure JavaScript version while maintaining full API compatibility.

## License

MIT
