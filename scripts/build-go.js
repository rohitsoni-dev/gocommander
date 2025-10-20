const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Building Go library for gommander...");

// Function to run a command
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(" ")} in ${cwd}`);

    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
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

// Main build function
async function build() {
  try {
    const goDir = path.join(__dirname, "..", "src", "go");
    const isDllBuild = process.argv.includes("--dll");

    if (!fs.existsSync(goDir)) {
      throw new Error("Go source directory not found");
    }

    if (isDllBuild) {
      // Build Go code as a Windows DLL
      console.log("Building Go code as Windows DLL...");
      await runCommand(
        "go",
        [
          "build",
          "-buildmode=c-shared",
          "-o",
          "../gommander.dll",
          "gommander.go",
        ],
        goDir
      );

      console.log("Go DLL built successfully!");
      console.log("DLL location:", path.join(goDir, "..", "gommander.dll"));
      console.log("Header location:", path.join(goDir, "..", "gommander.h"));
    } else {
      // Build Go code as a C archive (default behavior)
      console.log("Building Go code as C archive...");
      await runCommand(
        "go",
        [
          "build",
          "-buildmode=c-archive",
          "-o",
          "../gommander.a",
          "gommander.go",
        ],
        goDir
      );

      console.log("Go library built successfully!");
      console.log("Library location:", path.join(goDir, "..", "gommander.a"));
      console.log("Header location:", path.join(goDir, "..", "gommander.h"));
    }
  } catch (error) {
    console.error("Build failed:", error.message);
    process.exit(1);
  }
}

// Run build if this script is executed directly
if (require.main === module) {
  build().catch(console.error);
}

module.exports = { build };
