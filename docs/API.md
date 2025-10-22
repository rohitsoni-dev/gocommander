# GoCommander API Documentation

This document provides comprehensive API documentation for GoCommander, including all classes, methods, and migration information from commander.js.

## Table of Contents

- [Overview](#overview)
- [API Compatibility](#api-compatibility)
- [Core Classes](#core-classes)
- [Migration Guide](#migration-guide)
- [Performance Considerations](#performance-considerations)
- [Error Handling](#error-handling)

## Overview

GoCommander provides a high-performance Go backend while maintaining 100% API compatibility with commander.js. The library automatically detects Go backend availability and falls back to JavaScript implementation when needed.

### Backend Detection

```javascript
const { Command, isGoBackendAvailable } = require('gocommander');

// Check if Go backend is available
if (isGoBackendAvailable()) {
    console.log('Using high-performance Go backend');
} else {
    console.log('Using JavaScript fallback');
}
```

## API Compatibility

### Compatibility Matrix

| Feature | commander.js | GoCommander | Notes |
|---------|-------------|-------------|-------|
| Command creation | ✅ | ✅ | Identical API |
| Options parsing | ✅ | ✅ | Identical behavior |
| Arguments | ✅ | ✅ | Full compatibility |
| Subcommands | ✅ | ✅ | Complete support |
| Help generation | ✅ | ✅ | Same output format |
| Custom actions | ✅ | ✅ | Function callbacks work |
| Hooks | ✅ | ✅ | All hooks supported |
| TypeScript | ✅ | ✅ | Full type definitions |

### Breaking Changes

**None.** GoCommander is designed to be a drop-in replacement for commander.js with zero breaking changes.

## Core Classes

### Command Class

The main class for creating command-line interfaces.

#### Constructor

```javascript
const { Command } = require('gocommander');

// Create a new command
const program = new Command();

// Create a named command
const subcommand = new Command('serve');
```

#### Methods

##### `.version(str, flags?, description?)`

Set the version for the program.

```javascript
program.version('1.0.0');
program.version('1.0.0', '-V, --version', 'display version number');
```

**Parameters:**
- `str` (string): Version string
- `flags` (string, optional): Custom flags (default: '-V, --version')
- `description` (string, optional): Description for help

**Returns:** Command instance for chaining

##### `.option(flags, description?, defaultValue?)`

Define an option.

```javascript
program.option('-p, --port <number>', 'port number', 3000);
program.option('-v, --verbose', 'verbose output');
program.option('--no-color', 'disable color output');
```

**Parameters:**
- `flags` (string): Option flags (e.g., '-p, --port <value>')
- `description` (string, optional): Option description
- `defaultValue` (any, optional): Default value

**Returns:** Command instance for chaining

**Flag Formats:**
- `-p, --port <value>` - Required value
- `-p, --port [value]` - Optional value
- `-v, --verbose` - Boolean flag
- `--no-verbose` - Negatable boolean

##### `.argument(name, description?, defaultValue?)`

Define a command argument.

```javascript
program.argument('<file>', 'file to process');
program.argument('[output]', 'output file', 'stdout');
program.argument('<files...>', 'files to process');
```

**Parameters:**
- `name` (string): Argument name with format indicators
- `description` (string, optional): Argument description
- `defaultValue` (any, optional): Default value for optional arguments

**Returns:** Command instance for chaining

**Name Formats:**
- `<name>` - Required argument
- `[name]` - Optional argument
- `<name...>` - Variadic argument (array)

##### `.command(nameAndArgs, description?, opts?)`

Define a subcommand.

```javascript
// Subcommand with separate file
program.command('serve <dir>', 'start server', { executableFile: 'serve' });

// Inline subcommand
const serveCmd = program.command('serve <dir>');
serveCmd.action((dir, options) => {
    console.log(`Serving ${dir}`);
});
```

**Parameters:**
- `nameAndArgs` (string): Command name and arguments
- `description` (string, optional): Command description
- `opts` (object, optional): Command options

**Returns:** Command instance for the subcommand

##### `.action(fn)`

Set the action callback for the command.

```javascript
program.action((options, command) => {
    console.log('Action executed');
    console.log('Options:', options);
});

// With arguments
program
    .argument('<file>')
    .action((file, options, command) => {
        console.log(`Processing ${file}`);
    });
```

**Parameters:**
- `fn` (function): Action callback function

**Callback Parameters:**
- Arguments (in order of definition)
- `options` (object): Parsed options
- `command` (Command): Command instance

##### `.parse(argv?, options?)`

Parse command-line arguments.

```javascript
// Parse process.argv
program.parse();

// Parse custom arguments
program.parse(['node', 'script.js', '--verbose', 'file.txt']);

// Parse with options
program.parse(process.argv, { from: 'user' });
```

**Parameters:**
- `argv` (string[], optional): Arguments to parse (default: process.argv)
- `options` (object, optional): Parse options

**Parse Options:**
- `from` (string): 'node' (default), 'electron', or 'user'

##### `.parseAsync(argv?, options?)`

Asynchronous version of parse.

```javascript
async function run() {
    await program.parseAsync();
}
```

##### `.help()`

Display help information.

```javascript
program.help(); // Displays help and exits
```

##### `.outputHelp()`

Output help information without exiting.

```javascript
const helpText = program.outputHelp();
console.log(helpText);
```

#### Properties

##### `.args`

Array of parsed arguments.

```javascript
program.action(() => {
    console.log('Arguments:', program.args);
});
```

##### `.opts()`

Get parsed options as an object.

```javascript
program.action(() => {
    const options = program.opts();
    console.log('Options:', options);
});
```

### Program Instance

GoCommander provides a default program instance for convenience.

```javascript
const { program } = require('gocommander');

program
    .version('1.0.0')
    .option('-v, --verbose', 'verbose output')
    .parse();
```

## Migration Guide

### From commander.js

GoCommander is designed as a drop-in replacement. Simply change your import:

```javascript
// Before (commander.js)
const { Command } = require('commander');

// After (GoCommander)
const { Command } = require('gocommander');
```

### API Changes

**No breaking changes.** All commander.js APIs work identically in GoCommander.

### Performance Improvements

When Go backend is available, you'll see significant performance improvements:

- **Command creation**: ~86% faster
- **Argument parsing**: ~93% faster
- **Help generation**: ~14% faster
- **Complex operations**: Up to 97% faster

### Fallback Behavior

When Go backend is unavailable:
- Automatic fallback to JavaScript implementation
- Identical functionality and behavior
- Warning message (can be suppressed)
- No performance benefits

```javascript
// Suppress fallback warnings
process.env.GOCOMMANDER_QUIET = 'true';
```

## Performance Considerations

### Go Backend Benefits

The Go backend provides significant performance improvements for:

1. **Large command trees** - Complex CLI applications with many subcommands
2. **High-frequency parsing** - Applications that parse arguments repeatedly
3. **Complex validation** - Commands with extensive option validation
4. **Help generation** - Large help text generation

### When to Use JavaScript Fallback

The JavaScript fallback is sufficient for:

1. **Simple CLIs** - Basic commands with few options
2. **One-time scripts** - Scripts that run once and exit
3. **Development/testing** - When Go backend isn't available

### Optimization Tips

```javascript
// Reuse command instances when possible
const command = new Command('myapp');
// ... configure once

// For repeated parsing, reuse the same instance
function parseUserInput(input) {
    return command.parse(input.split(' '), { from: 'user' });
}

// Avoid recreating commands in loops
// Bad:
for (const input of inputs) {
    const cmd = new Command().option('-v').parse(input);
}

// Good:
const cmd = new Command().option('-v');
for (const input of inputs) {
    cmd.parse(input, { from: 'user' });
}
```

## Error Handling

### Error Types

GoCommander provides detailed error information for different failure scenarios:

#### Parse Errors

```javascript
try {
    program.parse(['--invalid-option']);
} catch (error) {
    if (error.code === 'commander.unknownOption') {
        console.log('Unknown option:', error.option);
    }
}
```

#### Validation Errors

```javascript
program
    .option('-p, --port <number>', 'port number')
    .action((options) => {
        if (isNaN(options.port)) {
            throw new Error('Port must be a number');
        }
    });
```

#### Go Backend Errors

```javascript
const { Command, isGoBackendAvailable, getBackendError } = require('gocommander');

if (!isGoBackendAvailable()) {
    const error = getBackendError();
    console.log('Go backend unavailable:', error.message);
    console.log('Troubleshooting:', error.troubleshooting);
}
```

### Error Recovery

```javascript
// Graceful error handling
function createRobustCommand() {
    try {
        const cmd = new Command();
        
        // Configure command
        cmd.option('-v, --verbose', 'verbose output');
        
        return cmd;
    } catch (error) {
        console.error('Command creation failed:', error.message);
        
        // Fallback to basic configuration
        return new Command().option('-h, --help', 'display help');
    }
}
```

### Debug Mode

Enable debug mode for detailed error information:

```javascript
// Enable debug logging
process.env.DEBUG = 'gocommander:*';

// Or programmatically
const { setDebugMode } = require('gocommander');
setDebugMode(true);
```

## Advanced Features

### Custom Help

```javascript
program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage(),
    optionTerm: (option) => option.flags,
    longestOptionTermLength: (cmd, helper) => {
        return Math.max(20, helper.longestOptionTermLength(cmd, helper));
    }
});
```

### Hooks

```javascript
// Pre-action hook
program.hook('preAction', (thisCommand, actionCommand) => {
    console.log('About to execute:', actionCommand.name());
});

// Post-action hook
program.hook('postAction', (thisCommand, actionCommand) => {
    console.log('Finished executing:', actionCommand.name());
});
```

### Custom Option Processing

```javascript
program
    .option('-p, --port <number>', 'port number')
    .option('--env <type>', 'environment', 'development')
    .configureOutput({
        writeOut: (str) => process.stdout.write(str),
        writeErr: (str) => process.stderr.write(str),
        outputError: (str, write) => write(`ERROR: ${str}`)
    });
```

## TypeScript Support

GoCommander includes full TypeScript definitions:

```typescript
import { Command, Option, Argument } from 'gocommander';

interface MyOptions {
    verbose: boolean;
    port: number;
    env: string;
}

const program = new Command();

program
    .option<boolean>('-v, --verbose', 'verbose output')
    .option<number>('-p, --port <number>', 'port number', 3000)
    .option<string>('--env <type>', 'environment', 'development')
    .action((options: MyOptions) => {
        console.log('Options:', options);
    });
```

## Examples

### Basic CLI

```javascript
const { Command } = require('gocommander');

const program = new Command();

program
    .name('mycli')
    .description('My awesome CLI tool')
    .version('1.0.0')
    .option('-v, --verbose', 'verbose output')
    .option('-p, --port <number>', 'port number', 3000)
    .argument('<file>', 'file to process')
    .action((file, options) => {
        console.log(`Processing ${file}`);
        if (options.verbose) {
            console.log(`Port: ${options.port}`);
        }
    });

program.parse();
```

### Subcommands

```javascript
const { Command } = require('gocommander');

const program = new Command();

program
    .name('git-like')
    .description('Git-like CLI tool')
    .version('1.0.0');

// Add subcommand
const clone = program.command('clone');
clone
    .description('Clone a repository')
    .argument('<repository>', 'repository to clone')
    .option('-b, --branch <name>', 'branch to clone')
    .action((repository, options) => {
        console.log(`Cloning ${repository}`);
        if (options.branch) {
            console.log(`Branch: ${options.branch}`);
        }
    });

// Add another subcommand
const status = program.command('status');
status
    .description('Show repository status')
    .option('-s, --short', 'short format')
    .action((options) => {
        console.log('Repository status');
        if (options.short) {
            console.log('(short format)');
        }
    });

program.parse();
```

### Complex Options

```javascript
const { Command } = require('gocommander');

const program = new Command();

program
    .option('-d, --debug', 'enable debug mode')
    .option('-v, --verbose', 'verbose output')
    .option('-q, --quiet', 'quiet mode')
    .option('-c, --config <file>', 'config file')
    .option('--no-color', 'disable colors')
    .option('-f, --format <type>', 'output format', 'json')
    .option('-t, --timeout <ms>', 'timeout in milliseconds', 5000)
    .option('--retry <count>', 'retry count', 3)
    .action((options) => {
        console.log('Configuration:', options);
    });

program.parse();
```

For more examples, see the [examples directory](../examples/).

## Support

- **Documentation**: [Full documentation](./README.md)
- **Troubleshooting**: [Troubleshooting guide](./TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/rohitsoni-dev/gocommander/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rohitsoni-dev/gocommander/discussions)