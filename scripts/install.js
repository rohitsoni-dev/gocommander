const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("🚀 Installing gommander...");

// Platform detection
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin", 
  isLinux: process.platform === "linux",
  arch: process.arch,
  name: process.platform,
  nodeVersion: process.version
};

console.log(`Platform: ${platform.name}/${platform.arch}, Node.js: ${platform.nodeVersion}`);

// Installation state tracking
const installState = {
  goBuildSuccess: false,
  addonBuildSuccess: false,
  fallbackMode: false,
  errors: [],
  warnings: []
};

// Function to validate system dependencies
async function validateDependencies() {
  console.log("🔍 Validating system dependencies...");
  
  const checks = {
    go: false,
    nodeGyp: false,
    buildTools: false
  };
  
  // Check Go installation
  try {
    const goVersion = await runCommand("go", ["version"], process.cwd(), true);
    console.log(`✓ Go: ${goVersion.trim()}`);
    checks.go = true;
    
    // Check Go version (require 1.19+)
    const versionMatch = goVersion.match(/go(\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1]);
      const minor = parseInt(versionMatch[2]);
      if (major < 1 || (major === 1 && minor < 19)) {
        installState.warnings.push("Go version is older than 1.19, some features may not work correctly");
      }
    }
  } catch (error) {
    console.log("❌ Go: Not found");
    installState.errors.push("Go is not installed or not in PATH");
    checks.go = false;
  }
  
  // Check node-gyp
  try {
    await runCommand("node-gyp", ["--version"], process.cwd(), true);
    console.log("✓ node-gyp: Available");
    checks.nodeGyp = true;
  } catch (error) {
    console.log("❌ node-gyp: Not found");
    installState.errors.push("node-gyp is not installed globally");
    checks.nodeGyp = false;
  }
  
  // Check build tools (platform-specific)
  if (platform.isWindows) {
    // Check for Visual Studio build tools
    const vsWhere = path.join(process.env.ProgramFiles || "C:\\Program Files (x86)", "Microsoft Visual Studio", "Installer", "vswhere.exe");
    try {
      if (fs.existsSync(vsWhere)) {
        await runCommand(vsWhere, ["-latest", "-products", "*", "-requires", "Microsoft.VisualStudio.Component.VC.Tools.x86.x64"], process.cwd(), true);
        console.log("✓ Visual Studio Build Tools: Available");
        checks.buildTools = true;
      } else {
        throw new Error("vswhere.exe not found");
      }
    } catch (error) {
      console.log("❌ Visual Studio Build Tools: Not found");
      installState.errors.push("Visual Studio Build Tools with C++ support not found");
      checks.buildTools = false;
    }
  } else if (platform.isMacOS) {
    // Check for Xcode command line tools
    try {
      await runCommand("xcode-select", ["-p"], process.cwd(), true);
      console.log("✓ Xcode Command Line Tools: Available");
      checks.buildTools = true;
    } catch (error) {
      console.log("❌ Xcode Command Line Tools: Not found");
      installState.errors.push("Xcode Command Line Tools not installed");
      checks.buildTools = false;
    }
  } else {
    // Check for GCC/build-essential on Linux
    try {
      await runCommand("gcc", ["--version"], process.cwd(), true);
      console.log("✓ GCC: Available");
      checks.buildTools = true;
    } catch (error) {
      console.log("❌ GCC: Not found");
      installState.errors.push("GCC compiler not found (install build-essential)");
      checks.buildTools = false;
    }
  }
  
  return checks;
}

// Function to run a command with enhanced error handling
function runCommand(command, args, cwd, captureOutput = false) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: captureOutput ? "pipe" : "inherit",
      shell: platform.isWindows,
    });

    let output = "";
    let errorOutput = "";
    
    if (captureOutput) {
      proc.stdout.on("data", (data) => {
        output += data.toString();
      });
      proc.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        const error = new Error(`Command '${command} ${args.join(" ")}' failed with exit code ${code}`);
        error.code = code;
        error.stdout = output;
        error.stderr = errorOutput;
        reject(error);
      }
    });

    proc.on("error", (error) => {
      error.command = `${command} ${args.join(" ")}`;
      reject(error);
    });
  });
}

// Enhanced Go header fixing function
function fixGoHeader(headerPath) {
  if (!platform.isWindows) return;

  try {
    if (!fs.existsSync(headerPath)) {
      console.log("⚠ Header file not found, skipping fix");
      return;
    }

    let content = fs.readFileSync(headerPath, "utf8");
    let modified = false;

    // Fix pointer size assertion for 64-bit systems
    const pointerSizePattern = /typedef char _check_for_\d+_bit_pointer_matching_GoInt\[sizeof\(void\*\)==\d+\/8 \? 1:-1\];/g;
    if (pointerSizePattern.test(content)) {
      content = content.replace(pointerSizePattern, 
        "typedef char _check_for_pointer_matching_GoInt[(sizeof(void*)==4 || sizeof(void*)==8) ? 1:-1];");
      modified = true;
      console.log("✓ Fixed pointer size assertion");
    }

    // Fix function export declarations
    const exportFixes = [
      { from: /extern __declspec\(dllexport\) ([^;]+);/g, to: 'extern "C" __declspec(dllexport) $1;' }
    ];

    for (const fix of exportFixes) {
      if (fix.from.test(content)) {
        content = content.replace(fix.from, fix.to);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(headerPath, content, "utf8");
      console.log("✓ Fixed Go header for Windows compatibility");
    } else {
      console.log("✓ Go header already compatible");
    }
  } catch (error) {
    console.warn("⚠ Could not fix Go header:", error.message);
    installState.warnings.push(`Header fix failed: ${error.message}`);
  }
}

// Function to setup fallback mode
function setupFallbackMode() {
  console.log("🔄 Setting up JavaScript fallback mode...");
  
  const fallbackMarkerPath = path.join(__dirname, "..", ".fallback-mode");
  try {
    fs.writeFileSync(fallbackMarkerPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      reason: "Go backend build failed",
      platform: platform.name,
      arch: platform.arch,
      errors: installState.errors
    }, null, 2));
    
    console.log("✓ Fallback mode configured");
    installState.fallbackMode = true;
  } catch (error) {
    console.warn("⚠ Could not setup fallback mode:", error.message);
  }
}

// Function to build Go library with enhanced error handling
async function buildGoLibrary() {
  console.log("🔨 Building Go library...");
  
  try {
    const { build } = require("./build-go.js");
    await build();
    
    console.log("✅ Go library built successfully!");
    installState.goBuildSuccess = true;
    return true;
  } catch (error) {
    console.log("❌ Go library build failed:", error.message);
    installState.errors.push(`Go build failed: ${error.message}`);
    
    // Provide specific troubleshooting based on error
    if (error.message.includes("go: command not found")) {
      console.log("💡 Install Go from https://golang.org/dl/");
    } else if (error.message.includes("gcc") || error.message.includes("clang")) {
      if (platform.isWindows) {
        console.log("💡 Install Visual Studio with C++ build tools");
      } else if (platform.isMacOS) {
        console.log("💡 Install Xcode command line tools: xcode-select --install");
      } else {
        console.log("💡 Install build tools: sudo apt-get install build-essential");
      }
    }
    
    return false;
  }
}

// Function to build native addon with enhanced error handling
async function buildNativeAddon() {
  console.log("🔨 Building native addon...");
  
  try {
    const rootDir = path.join(__dirname, "..");
    await runCommand("npm", ["run", "build"], rootDir);
    
    console.log("✅ Native addon built successfully!");
    installState.addonBuildSuccess = true;
    return true;
  } catch (error) {
    console.log("❌ Native addon build failed:", error.message);
    installState.errors.push(`Addon build failed: ${error.message}`);
    
    // Provide specific troubleshooting
    if (error.message.includes("node-gyp")) {
      console.log("💡 Install node-gyp globally: npm install -g node-gyp");
    } else if (error.message.includes("Python")) {
      console.log("💡 Install Python 3.x and ensure it's in PATH");
    }
    
    return false;
  }
}

// Function to verify installation
function verifyInstallation() {
  console.log("🔍 Verifying installation...");
  
  const rootDir = path.join(__dirname, "..");
  const buildDir = path.join(rootDir, "build");
  const addonPath = path.join(buildDir, "Release", "gommander.node");
  
  if (fs.existsSync(addonPath)) {
    const stats = fs.statSync(addonPath);
    console.log(`✅ Native addon verified: ${addonPath} (${stats.size} bytes)`);
    return true;
  } else {
    console.log("❌ Native addon not found");
    return false;
  }
}

// Function to print installation summary
function printInstallationSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📋 INSTALLATION SUMMARY");
  console.log("=".repeat(60));
  
  console.log(`Platform: ${platform.name}/${platform.arch}`);
  console.log(`Node.js: ${platform.nodeVersion}`);
  console.log(`Go Build: ${installState.goBuildSuccess ? "✅ Success" : "❌ Failed"}`);
  console.log(`Addon Build: ${installState.addonBuildSuccess ? "✅ Success" : "❌ Failed"}`);
  console.log(`Fallback Mode: ${installState.fallbackMode ? "🔄 Enabled" : "❌ Disabled"}`);
  
  if (installState.warnings.length > 0) {
    console.log("\n⚠ WARNINGS:");
    installState.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }
  
  if (installState.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    installState.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  
  if (installState.goBuildSuccess && installState.addonBuildSuccess) {
    console.log("🎉 Installation completed successfully!");
    console.log("   GoCommander is ready with full Go backend support.");
  } else if (installState.fallbackMode) {
    console.log("⚠ Installation completed with fallback mode.");
    console.log("   GoCommander will use JavaScript implementation.");
    console.log("   Performance may be reduced but functionality is preserved.");
  } else {
    console.log("❌ Installation failed.");
    console.log("   Please resolve the errors above and try again.");
  }
}

// Main installation function
async function install() {
  try {
    const rootDir = path.join(__dirname, "..");
    
    // Ensure build directory exists
    const buildDir = path.join(rootDir, "build");
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Validate dependencies
    const deps = await validateDependencies();
    
    // Attempt Go library build
    const goBuildSuccess = await buildGoLibrary();
    
    if (goBuildSuccess) {
      // Fix header file if needed
      const headerPath = path.join(rootDir, "src", "gommander.h");
      fixGoHeader(headerPath);
      
      // Attempt native addon build
      const addonBuildSuccess = await buildNativeAddon();
      
      if (addonBuildSuccess) {
        // Verify the installation
        verifyInstallation();
      } else {
        setupFallbackMode();
      }
    } else {
      setupFallbackMode();
    }
    
  } catch (error) {
    console.error("💥 Unexpected installation error:", error.message);
    installState.errors.push(`Unexpected error: ${error.message}`);
    setupFallbackMode();
  } finally {
    printInstallationSummary();
  }
}

// Handle process signals gracefully
process.on("SIGINT", () => {
  console.log("\n🛑 Installation interrupted by user");
  process.exit(1);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Installation terminated");
  process.exit(1);
});

// Run installation
if (require.main === module) {
  install().catch((error) => {
    console.error("💥 Fatal installation error:", error);
    process.exit(1);
  });
}

module.exports = { 
  install, 
  validateDependencies, 
  buildGoLibrary, 
  buildNativeAddon, 
  setupFallbackMode,
  platform 
};
