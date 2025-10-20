#!/usr/bin/env node

console.log(`
============================================
commander-go Installation Notice
============================================

The native addon failed to build. This is likely because you don't have the required build tools installed.

To use commander-go with Node.js, you need:

1. Visual Studio with "Desktop development with C++" workload (Windows)
2. Xcode Command Line Tools (macOS)
3. Build-essential package (Linux)

If you don't have these tools installed, the package will fall back to a pure JavaScript implementation which is slower but fully functional.

To install the build tools:

Windows:
  - Install Visual Studio Community 2022 or newer
  - Select "Desktop development with C++" workload during installation

macOS:
  - Install Xcode Command Line Tools: xcode-select --install

Linux:
  - Ubuntu/Debian: sudo apt-get install build-essential
  - CentOS/RHEL: sudo yum groupinstall "Development Tools"
  - Fedora: sudo dnf groupinstall "Development Tools"

Once you have the build tools installed, you can rebuild the addon with:
  npm run rebuild

For now, commander-go will use the fallback JavaScript implementation.
============================================
`);

process.exit(0);
