const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("Building Go library for gommander...");

// Platform detection
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux",
  arch: process.arch,
  name: process.platform
};

console.log(`Detected platform: ${platform.name} (${platform.arch})`);

// Function to check if Go is installed and get version
async function checkGoInstallation() {
  try {
    const result = await runCommand("go", ["version"], process.cwd(), true);
    console.log("Go installation verified");
    return true;
  } catch (error) {
    throw new Error("Go is not installed or not in PATH. Please install Go 1.19 or later.");
  }
}

// Function to run a command
function runCommand(command, args, cwd, captureOutput = false) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")} in ${cwd}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: captureOutput ? "pipe" : "inherit",
      shell: platform.isWindows,
    });

    let output = "";
    if (captureOutput) {
      proc.stdout.on("data", (data) => {
        output += data.toString();
      });
      proc.stderr.on("data", (data) => {
        output += data.toString();
      });
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${output}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

// Function to get platform-specific build configuration
function getBuildConfig() {
  const config = {
    env: {
      ...process.env,
      CGO_ENABLED: "1"
    },
    buildFlags: []
  };

  if (platform.isWindows) {
    // Windows-specific configuration
    config.buildMode = "c-shared";
    config.outputFile = "gommander.dll";
    config.libFile = "gommander.lib";
    config.env.GOOS = "windows";
    config.env.GOARCH = platform.arch === "x64" ? "amd64" : "386";
    config.buildFlags = [
      "-trimpath"
    ];
  } else if (platform.isMacOS) {
    // macOS-specific configuration
    config.buildMode = "c-archive";
    config.outputFile = "gommander.a";
    config.env.GOOS = "darwin";
    config.env.GOARCH = platform.arch === "arm64" ? "arm64" : "amd64";
    config.env.CGO_CFLAGS = "-mmacosx-version-min=10.15";
    config.env.CGO_LDFLAGS = "-mmacosx-version-min=10.15";
    config.buildFlags = [
      "-ldflags=-s -w",
      "-trimpath"
    ];
  } else {
    // Linux and other Unix-like systems
    config.buildMode = "c-archive";
    config.outputFile = "gommander.a";
    config.env.GOOS = "linux";
    config.env.GOARCH = platform.arch === "x64" ? "amd64" : platform.arch;
    config.buildFlags = [
      "-ldflags=-s -w -extldflags '-static'",
      "-trimpath"
    ];
  }

  return config;
}

// Function to validate build artifacts
function validateBuildArtifacts(config, srcDir) {
  const outputPath = path.join(srcDir, config.outputFile);
  const headerPath = path.join(srcDir, "gommander.h");
  
  console.log("Validating build artifacts...");
  
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Build artifact not found: ${outputPath}`);
  }
  
  if (!fs.existsSync(headerPath)) {
    throw new Error(`Header file not found: ${headerPath}`);
  }
  
  // Check file sizes
  const outputStats = fs.statSync(outputPath);
  const headerStats = fs.statSync(headerPath);
  
  if (outputStats.size === 0) {
    throw new Error(`Build artifact is empty: ${outputPath}`);
  }
  
  if (headerStats.size === 0) {
    throw new Error(`Header file is empty: ${headerPath}`);
  }
  
  console.log(`✓ Build artifact: ${outputPath} (${outputStats.size} bytes)`);
  console.log(`✓ Header file: ${headerPath} (${headerStats.size} bytes)`);
  
  // On Windows, also check for the import library
  if (platform.isWindows && config.libFile) {
    const libPath = path.join(srcDir, config.libFile);
    if (fs.existsSync(libPath)) {
      const libStats = fs.statSync(libPath);
      console.log(`✓ Import library: ${libPath} (${libStats.size} bytes)`);
    } else {
      console.warn(`⚠ Import library not found: ${libPath}`);
      // The .lib file should be generated automatically by Go when building c-shared
      console.warn(`   This may indicate a Go build configuration issue`);
    }
  }
  
  return true;
}

// Function to clean previous build artifacts
function cleanBuildArtifacts(srcDir) {
  const artifactsToClean = [
    "gommander.dll",
    "gommander.lib", 
    "gommander.a",
    "gommander.h"
  ];
  
  console.log("Cleaning previous build artifacts...");
  
  for (const artifact of artifactsToClean) {
    const artifactPath = path.join(srcDir, artifact);
    if (fs.existsSync(artifactPath)) {
      try {
        fs.unlinkSync(artifactPath);
        console.log(`✓ Removed: ${artifactPath}`);
      } catch (error) {
        console.warn(`⚠ Could not remove: ${artifactPath} - ${error.message}`);
      }
    }
  }
}

// Main build function
async function build() {
  try {
    const goDir = path.join(__dirname, "..", "src", "go");
    const forceClean = process.argv.includes("--clean");
    const verbose = process.argv.includes("--verbose");

    if (!fs.existsSync(goDir)) {
      throw new Error("Go source directory not found");
    }

    // Check Go installation
    await checkGoInstallation();

    // Clean previous artifacts if requested
    if (forceClean) {
      cleanBuildArtifacts(goDir);
    }

    // Get platform-specific build configuration
    const config = getBuildConfig();
    
    console.log(`Building for ${platform.name}/${config.env.GOARCH} using ${config.buildMode} mode...`);
    if (verbose) {
      console.log("Build configuration:", JSON.stringify(config, null, 2));
    }

    // Prepare build arguments
    const buildArgs = [
      "build",
      `-buildmode=${config.buildMode}`,
      "-o", config.outputFile
    ];
    
    // Add build flags properly
    for (const flag of config.buildFlags) {
      if (flag.startsWith("-ldflags=")) {
        buildArgs.push("-ldflags", flag.substring(9));
      } else {
        buildArgs.push(flag);
      }
    }
    
    buildArgs.push("gommander.go");

    // Set environment variables
    const buildEnv = { ...config.env };

    // Execute build command
    const proc = spawn("go", buildArgs, {
      cwd: goDir,
      stdio: "inherit",
      shell: platform.isWindows,
      env: buildEnv
    });

    await new Promise((resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Go build failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(error);
      });
    });

    // Validate build artifacts
    validateBuildArtifacts(config, goDir);

    console.log("✅ Go library built successfully!");
    console.log(`Platform: ${platform.name}/${config.env.GOARCH}`);
    console.log(`Build mode: ${config.buildMode}`);
    console.log(`Output: ${path.join(goDir, config.outputFile)}`);
    
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    
    // Provide helpful troubleshooting information
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Ensure Go 1.19+ is installed: go version");
    console.log("2. Verify CGO is enabled: go env CGO_ENABLED");
    console.log("3. Check build tools are available:");
    
    if (platform.isWindows) {
      console.log("   - Visual Studio with C++ build tools");
      console.log("   - Windows SDK");
    } else if (platform.isMacOS) {
      console.log("   - Xcode command line tools: xcode-select --install");
    } else {
      console.log("   - GCC/Clang compiler: gcc --version");
      console.log("   - Build essentials: apt-get install build-essential (Ubuntu/Debian)");
    }
    
    process.exit(1);
  }
}

// Run build if this script is executed directly
if (require.main === module) {
  build().catch(console.error);
}

module.exports = { build, getBuildConfig, validateBuildArtifacts, platform };
