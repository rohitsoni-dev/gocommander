#!/usr/bin/env node

// Example usage of gommander with Go backend
const { Command, program, hello, version } = require('./index.js');

console.log('=== Gommander with Go Backend Example ===\n');

// Test Go connectivity
console.log('Go Backend Status:');
console.log('  Hello from Go:', hello());
console.log('  Go Version:', version());
console.log('');

// Create a CLI application
const app = new Command('myapp');
app
  .description('A sample CLI application powered by Go')
  .version('1.0.0');

// Add a serve command
const serveCmd = app.command('serve', 'Start the development server');
serveCmd
  .option('-p, --port <number>', 'Port to listen on', '3000')
  .option('-h, --host <address>', 'Host address', 'localhost')
  .option('-w, --watch', 'Watch for file changes')
  .argument('<directory>', 'Directory to serve')
  .action((args, options) => {
    console.log('🚀 Starting server...');
    console.log(`   Directory: ${args[0]}`);
    console.log(`   Host: ${options.host || 'localhost'}`);
    console.log(`   Port: ${options.port || '3000'}`);
    console.log(`   Watch mode: ${options.watch ? 'enabled' : 'disabled'}`);
    console.log('   (This is handled by Go backend)');
  });

// Add a build command
const buildCmd = app.command('build', 'Build the project');
buildCmd
  .option('-o, --output <directory>', 'Output directory', 'dist')
  .option('-m, --minify', 'Minify output')
  .option('-s, --source-maps', 'Generate source maps')
  .argument('[input]', 'Input directory')
  .action((args, options) => {
    console.log('🔨 Building project...');
    console.log(`   Input: ${args[0] || 'src'}`);
    console.log(`   Output: ${options.output || 'dist'}`);
    console.log(`   Minify: ${options.minify ? 'yes' : 'no'}`);
    console.log(`   Source maps: ${options['source-maps'] ? 'yes' : 'no'}`);
    console.log('   (This is handled by Go backend)');
  });

// Add a config command with subcommands
const configCmd = app.command('config', 'Manage configuration');
configCmd.command('get', 'Get configuration value')
  .argument('<key>', 'Configuration key')
  .action((args, options) => {
    console.log(`📋 Getting config: ${args[0]}`);
  });

configCmd.command('set', 'Set configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .action((args, options) => {
    console.log(`📝 Setting config: ${args[0]} = ${args[1]}`);
  });

// Show help if no arguments provided
if (process.argv.length <= 2) {
  console.log('Example CLI Application (powered by Go backend)\n');
  app.outputHelp();
  console.log('\nTry running:');
  console.log('  node example.js serve ./public --port 8080 --watch');
  console.log('  node example.js build --output ./build --minify');
  console.log('  node example.js config get database.url');
  console.log('');
} else {
  // Parse command line arguments
  app.parse(process.argv);
}