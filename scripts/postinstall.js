#!/usr/bin/env node

const { install } = require('./install.js');

// Run the enhanced installation process
install().catch((error) => {
  console.error("Installation failed:", error.message);
  process.exit(1);
});
