const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Building commander-go...");

// Check if we're on Windows
const isWindows = process.platform === "win32";

// Function to run a command
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: isWindows,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

// Function to build Go code
async function buildGo() {
  const goDir = path.join(__dirname, "..", "src", "go");

  if (!fs.existsSync(goDir)) {
    throw new Error("Go source directory not found");
  }

  console.log("Building Go code...");
  // In a full implementation, this would build the Go code as a library
  // For now, we'll just show what would be done
  console.log("Would run: go build -buildmode=c-archive -o ../gommander.a .");
}

// Function to build Node.js addon
async function buildAddon() {
  console.log("Building Node.js addon...");
  await runCommand("node-gyp", ["configure"], path.join(__dirname, ".."));
  await runCommand("node-gyp", ["build"], path.join(__dirname, ".."));
}

// Main build function
async function build() {
  try {
    // Build Go code
    await buildGo();

    // Build Node.js addon
    await buildAddon();

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

// Run build
build().catch(console.error);
