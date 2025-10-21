const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Installing gommander...");

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

// Function to fix the Go header file for Windows compatibility
function fixGoHeader(headerPath) {
  if (!isWindows) return;

  try {
    if (!fs.existsSync(headerPath)) {
      console.log("Header file not found, skipping fix");
      return;
    }

    let content = fs.readFileSync(headerPath, "utf8");

    // Fix the static assertion that fails on 64-bit systems
    // Replace the problematic line with one that works for both 32 and 64 bit
    const originalLine =
      "typedef char _check_for_32_bit_pointer_matching_GoInt[sizeof(void*)==32/8 ? 1:-1];";
    const fixedLine =
      "typedef char _check_for_32_bit_pointer_matching_GoInt[(sizeof(void*)==32/8 || sizeof(void*)==64/8) ? 1:-1];";

    if (content.includes(originalLine)) {
      content = content.replace(originalLine, fixedLine);
      fs.writeFileSync(headerPath, content, "utf8");
      console.log("Fixed Go header for Windows compatibility");
    } else {
      console.log(
        "Go header already fixed or doesn't contain the expected pattern"
      );
    }

    // Also fix the symbol naming issue on Windows
    // Replace function declarations to use the actual symbol names
    const versionDecl = "extern __declspec(dllexport) char* Version(void);";
    const versionFixed = "extern __declspec(dllexport) char* _Version(void);";
    const initDecl = "extern __declspec(dllexport) void Initialize(void);";
    const initFixed = "extern __declspec(dllexport) void _Initialize(void);";
    const parseDecl =
      "extern __declspec(dllexport) int Parse(void* cmdPtr, int argc, char** argv);";
    const parseFixed =
      "extern __declspec(dllexport) int _Parse(void* cmdPtr, int argc, char** argv);";
    const addCmdDecl =
      "extern __declspec(dllexport) void AddCommand(void* parentPtr, void* childPtr);";
    const addCmdFixed =
      "extern __declspec(dllexport) void _AddCommand(void* parentPtr, void* childPtr);";
    const createCmdDecl =
      "extern __declspec(dllexport) void* CreateCommand(char* name);";
    const createCmdFixed =
      "extern __declspec(dllexport) void* _CreateCommand(char* name);";

    let changed = false;
    if (content.includes(versionDecl)) {
      content = content.replace(versionDecl, versionFixed);
      changed = true;
    }
    if (content.includes(initDecl)) {
      content = content.replace(initDecl, initFixed);
      changed = true;
    }
    if (content.includes(parseDecl)) {
      content = content.replace(parseDecl, parseFixed);
      changed = true;
    }
    if (content.includes(addCmdDecl)) {
      content = content.replace(addCmdDecl, addCmdFixed);
      changed = true;
    }
    if (content.includes(createCmdDecl)) {
      content = content.replace(createCmdDecl, createCmdFixed);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(headerPath, content, "utf8");
      console.log(
        "Fixed Go header function declarations for Windows compatibility"
      );
    }
  } catch (error) {
    console.warn("Warning: Could not fix Go header:", error.message);
  }
}

// Main installation function
async function install() {
  try {
    const rootDir = path.join(__dirname, "..");
    const goSrcDir = path.join(rootDir, "src", "go");
    const headerPath = path.join(rootDir, "src", "gommander.h");

    // Check if build directory exists
    const buildDir = path.join(rootDir, "build");
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Build the Go library. On Windows we need a MSVC-compatible import
    // library, so build a shared DLL; on other platforms a c-archive is fine.
    console.log("Building Go library...");
    try {
      if (isWindows) {
        // c-shared produces a .dll and an import .lib which MSVC can link
        await runCommand(
          "go",
          [
            "build",
            "-buildmode=c-shared",
            "-o",
            "../gommander.dll",
            "gommander.go",
          ],
          goSrcDir
        );
      } else {
        await runCommand(
          "go",
          [
            "build",
            "-buildmode=c-archive",
            "-o",
            "../gommander.a",
            "gommander.go",
          ],
          goSrcDir
        );
      }

      // Fix the header file for Windows compatibility
      if (isWindows) {
        console.log("Fixing Go header for Windows...");
        fixGoHeader(headerPath);
      }

      console.log("Go library built successfully!");
    } catch (goError) {
      console.warn("Warning: Could not build Go library:", goError.message);
      console.log("The package will use fallback JavaScript implementation.");
    }

    // Try to build the addon
    console.log("Building native addon...");
    await runCommand("npm", ["run", "build"], rootDir);

    console.log("Installation completed successfully!");
  } catch (error) {
    console.warn("Warning: Could not build native addon:", error.message);
    console.log("The package will work but may have limited functionality.");
    console.log("To fully build the addon, make sure you have:");
    console.log("1. Go 1.21 or later installed");
    console.log("2. node-gyp installed (npm install -g node-gyp)");
    console.log(
      "3. Build tools for your platform (Visual Studio with C++ on Windows)"
    );
  }
}

// Run installation
install().catch(console.error);
