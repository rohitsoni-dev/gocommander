# GoCommander Documentation

Welcome to the comprehensive documentation for GoCommander, a high-performance Go implementation for command-line interfaces with Node.js compatibility.

## Quick Navigation

### Getting Started
- **[Setup Guide](./SETUP.md)** - Installation and setup instructions for all platforms
- **[Migration Guide](./MIGRATION.md)** - Migrate from commander.js with zero breaking changes
- **[API Documentation](./API.md)** - Complete API reference and examples

### Troubleshooting
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and detailed solutions
- **[Build System Issues](./TROUBLESHOOTING.md#build-system-issues)** - Build and compilation problems
- **[Runtime Issues](./TROUBLESHOOTING.md#runtime-integration-issues)** - Go backend integration problems

### Advanced Topics
- **[Performance Optimization](./API.md#performance-considerations)** - Getting the best performance
- **[Cross-Platform Development](./SETUP.md#platform-specific-setup)** - Platform-specific considerations
- **[Error Handling](./API.md#error-handling)** - Comprehensive error handling strategies

## What is GoCommander?

GoCommander is a drop-in replacement for commander.js that provides:

- **100% API Compatibility**: Works with existing commander.js code without changes
- **High Performance**: Up to 97% faster parsing and command operations
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Automatic Fallback**: Uses JavaScript implementation when Go backend unavailable
- **Zero Dependencies**: No external runtime dependencies

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    JavaScript Layer                         │
│                   (commander.js API)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    C++ Addon Bridge                        │
│                   (N-API Integration)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Go Runtime                             │
│                 (High-Performance Core)                    │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
npm install gocommander
```

### Basic Usage

```javascript
const { Command } = require('gocommander');

const program = new Command();
program
  .version('1.0.0')
  .description('My CLI application')
  .option('-v, --verbose', 'verbose output')
  .argument('<file>', 'file to process')
  .action((file, options) => {
    console.log(`Processing ${file}`);
    if (options.verbose) {
      console.log('Verbose mode enabled');
    }
  });

program.parse();
```

### Migration from commander.js

Simply change your import statement:

```javascript
// Before
const { Command } = require('commander');

// After
const { Command } = require('gocommander');
```

That's it! No other changes needed.

## Documentation Sections

### 1. Setup and Installation

**[Setup Guide](./SETUP.md)** covers:
- System requirements and prerequisites
- Installation methods (npm, build from source)
- Platform-specific setup (Windows, macOS, Linux)
- Build configuration and verification
- Common installation issues

### 2. API Reference

**[API Documentation](./API.md)** includes:
- Complete API reference with examples
- Migration guide from commander.js
- Performance considerations and optimization
- Error handling and debugging
- TypeScript support and definitions

### 3. Migration Guide

**[Migration Guide](./MIGRATION.md)** provides:
- Step-by-step migration process
- Compatibility matrix and version support
- Performance improvements and benchmarks
- Common migration issues and solutions
- Testing and validation strategies

### 4. Troubleshooting

**[Troubleshooting Guide](./TROUBLESHOOTING.md)** offers:
- Quick diagnostic tools and health checks
- Installation and build system issues
- Runtime integration problems
- Platform-specific troubleshooting
- Advanced debugging techniques

## Common Use Cases

### Simple CLI Tool

```javascript
const { Command } = require('gocommander');

const program = new Command();
program
  .name('mytool')
  .description('A simple CLI tool')
  .version('1.0.0')
  .option('-c, --config <file>', 'config file')
  .option('-v, --verbose', 'verbose output')
  .action((options) => {
    console.log('Tool executed with options:', options);
  });

program.parse();
```

### Complex CLI with Subcommands

```javascript
const { Command } = require('gocommander');

const program = new Command();
program.name('git-like').version('1.0.0');

// Clone command
const clone = program.command('clone');
clone
  .description('Clone a repository')
  .argument('<repository>', 'repository URL')
  .option('-b, --branch <name>', 'branch to clone')
  .action((repository, options) => {
    console.log(`Cloning ${repository}`);
    if (options.branch) {
      console.log(`Branch: ${options.branch}`);
    }
  });

// Status command
const status = program.command('status');
status
  .description('Show repository status')
  .option('-s, --short', 'short format')
  .action((options) => {
    console.log('Repository status');
  });

program.parse();
```

### High-Performance Parsing

```javascript
const { Command, isGoBackendAvailable } = require('gocommander');

// Check if Go backend is available for performance benefits
if (isGoBackendAvailable()) {
  console.log('Using high-performance Go backend');
} else {
  console.log('Using JavaScript fallback');
}

// Create reusable command for high-frequency parsing
const parser = new Command();
parser.option('-f, --format <type>', 'output format');
parser.option('-v, --verbose', 'verbose output');

// Parse multiple inputs efficiently
const inputs = [
  ['--format', 'json', '--verbose'],
  ['--format', 'xml'],
  ['--verbose']
];

inputs.forEach(input => {
  const result = parser.parse(input, { from: 'user' });
  console.log('Parsed:', parser.opts());
});
```

## Performance Benefits

GoCommander provides significant performance improvements:

### Benchmark Results

| Operation | commander.js | GoCommander | Improvement |
|-----------|-------------|-------------|-------------|
| Startup Time | 0.0137ms | 0.0026ms | 80.72% faster |
| Command Creation | 0.0479ms | 0.0066ms | 86.18% faster |
| Argument Parsing | 0.0825ms | 0.0060ms | 92.77% faster |
| Help Generation | 0.1497ms | 0.1283ms | 14.29% faster |
| Complex Parsing | 0.1021ms | 0.0021ms | 97.95% faster |

### When Performance Matters

GoCommander's performance benefits are most noticeable in:

- **High-frequency parsing**: Applications that parse arguments repeatedly
- **Large command trees**: Complex CLIs with many subcommands and options
- **Batch processing**: Tools that process many files or inputs
- **Interactive applications**: CLIs with real-time user interaction
- **CI/CD pipelines**: Build tools and automation scripts

## Platform Support

### Supported Platforms

| Platform | Go Backend | JavaScript Fallback | Status |
|----------|------------|-------------------|---------|
| Windows x64 | ✅ | ✅ | Full support |
| Windows ARM64 | ⚠️ | ✅ | Fallback mode |
| macOS Intel | ✅ | ✅ | Full support |
| macOS Apple Silicon | ✅ | ✅ | Full support |
| Linux x64 | ✅ | ✅ | Full support |
| Linux ARM64 | ✅ | ✅ | Full support |
| Alpine Linux | ⚠️ | ✅ | Fallback mode |

### Node.js Version Support

| Node.js Version | Support Level | Go Backend |
|----------------|---------------|------------|
| 20.x | ✅ Full | ✅ |
| 18.x | ✅ Full | ✅ |
| 16.x | ✅ Full | ✅ |
| 14.x | ⚠️ Limited | ❌ |

## Examples and Tutorials

### Working Examples

The [examples directory](../examples/) contains:

- **[Basic CLI](../examples/string-util.js)** - Simple string manipulation tool
- **[Todo Manager](../examples/todo-manager.js)** - Task management CLI with persistence
- **[Boilerplate Generator](../examples/boilerplate-generator.js)** - Project scaffolding tool

### Tutorials

1. **[Building Your First CLI](./API.md#examples)** - Step-by-step tutorial
2. **[Migrating from commander.js](./MIGRATION.md#migration-steps)** - Migration walkthrough
3. **[Performance Optimization](./API.md#performance-considerations)** - Getting the best performance
4. **[Error Handling Best Practices](./API.md#error-handling)** - Robust error handling

## Community and Support

### Getting Help

- **Documentation Issues**: If you find errors or gaps in documentation
- **Usage Questions**: For help using GoCommander in your projects
- **Bug Reports**: For reporting bugs or unexpected behavior
- **Feature Requests**: For suggesting new features or improvements

### Contributing

We welcome contributions to GoCommander:

1. **Documentation**: Improve or expand documentation
2. **Examples**: Add new examples or improve existing ones
3. **Bug Fixes**: Fix issues and improve reliability
4. **Performance**: Optimize performance and add benchmarks
5. **Platform Support**: Improve cross-platform compatibility

### Resources

- **[GitHub Repository](https://github.com/rohitsoni-dev/gocommander)** - Source code and issues
- **[GitHub Discussions](https://github.com/rohitsoni-dev/gocommander/discussions)** - Community discussions
- **[NPM Package](https://www.npmjs.com/package/gocommander)** - Package information
- **[Changelog](../CHANGELOG.md)** - Version history and changes

## License

GoCommander is released under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Need help?** Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) or [open an issue](https://github.com/rohitsoni-dev/gocommander/issues) on GitHub.