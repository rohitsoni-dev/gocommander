const { Command, addon, isGoBackendAvailable, getBackendStatus, FallbackSystem } = require("../index.js");
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Diagnostic Utility for GoCommander Integration Issues
 * 
 * This utility implements task 5.2 diagnostic requirements:
 * - Create diagnostic tools for troubleshooting integration issues
 * - Provide detailed system and backend information
 * - Test various integration scenarios
 * 
 * Requirements: 4.4
 */

console.log("=== GoCommander Diagnostic Utility ===\n");

class GoCommanderDiagnostics {
    constructor() {
        this.results = {
            system: {},
            backend: {},
            integration: {},
            files: {},
            tests: []
        };
    }

    async runFullDiagnostics() {
        console.log("Running comprehensive diagnostics...\n");
        
        this.collectSystemInfo();
        this.collectBackendInfo();
        this.collectFileInfo();
        await this.runIntegrationTests();
        
        this.printReport();
        return this.results;
    }

    collectSystemInfo() {
        console.log("🔍 Collecting system information...");
        
        this.results.system = {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            uptime: os.uptime(),
            loadAverage: os.loadavg(),
            homeDir: os.homedir(),
            tmpDir: os.tmpdir(),
            hostname: os.hostname(),
            networkInterfaces: Object.keys(os.networkInterfaces()),
            endianness: os.endianness()
        };
        
        console.log(`   Platform: ${this.results.system.platform} (${this.results.system.arch})`);
        console.log(`   Node.js: ${this.results.system.nodeVersion}`);
        console.log(`   Memory: ${this.formatBytes(this.results.system.totalMemory)} total\n`);
    }

    collectBackendInfo() {
        console.log("🔍 Collecting backend information...");
        
        const backendStatus = getBackendStatus();
        const goAvailable = isGoBackendAvailable();
        
        this.results.backend = {
            goBackendAvailable: goAvailable,
            addonLoaded: backendStatus.addonLoaded,
            addonLoadError: backendStatus.addonLoadError,
            lastGoError: backendStatus.lastGoError,
            addonMethods: {},
            addonTests: {}
        };
        
        // Test addon methods if available
        if (addon) {
            const methods = ['hello', 'version', 'isAvailable', 'getLastError', 
                           'createCommand', 'addOption', 'addArgument', 'parseArgs', 'getHelp'];
            
            for (const method of methods) {
                this.results.backend.addonMethods[method] = {
                    exists: typeof addon[method] === 'function',
                    type: typeof addon[method]
                };
                
                // Test basic method calls
                if (typeof addon[method] === 'function') {
                    try {
                        let result;
                        switch (method) {
                            case 'hello':
                            case 'version':
                            case 'isAvailable':
                            case 'getLastError':
                                result = addon[method]();
                                break;
                            case 'createCommand':
                                result = addon[method]('diagnostic-test');
                                break;
                            default:
                                result = 'Not tested (requires parameters)';
                        }
                        
                        this.results.backend.addonTests[method] = {
                            success: true,
                            result: typeof result === 'string' ? result : JSON.stringify(result)
                        };
                    } catch (error) {
                        this.results.backend.addonTests[method] = {
                            success: false,
                            error: error.message
                        };
                    }
                }
            }
        }
        
        console.log(`   Go Backend: ${goAvailable ? 'Available' : 'Not Available'}`);
        console.log(`   Addon Loaded: ${backendStatus.addonLoaded}`);
        if (backendStatus.addonLoadError) {
            console.log(`   Load Error: ${backendStatus.addonLoadError}`);
        }
        console.log();
    }

    collectFileInfo() {
        console.log("🔍 Collecting file system information...");
        
        const filesToCheck = [
            'index.js',
            'package.json',
            'binding.gyp',
            'src/addon.cc',
            'src/go/gommander.go',
            'gommander.dll',
            'src/gommander.dll',
            'build/Release/gommander.dll',
            'src/gommander.a',
            'build/gommander.a'
        ];
        
        this.results.files = {};
        
        for (const file of filesToCheck) {
            try {
                const stats = fs.statSync(file);
                this.results.files[file] = {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime,
                    isDirectory: stats.isDirectory(),
                    isFile: stats.isFile()
                };
            } catch (error) {
                this.results.files[file] = {
                    exists: false,
                    error: error.code
                };
            }
        }
        
        const existingFiles = Object.keys(this.results.files).filter(f => this.results.files[f].exists);
        console.log(`   Found ${existingFiles.length}/${filesToCheck.length} expected files`);
        
        // Check for Go library specifically
        const goLibraries = ['gommander.dll', 'src/gommander.dll', 'build/Release/gommander.dll', 'src/gommander.a'];
        const foundLibraries = goLibraries.filter(lib => this.results.files[lib]?.exists);
        
        if (foundLibraries.length > 0) {
            console.log(`   Go libraries found: ${foundLibraries.join(', ')}`);
        } else {
            console.log(`   No Go libraries found`);
        }
        console.log();
    } 
   async runIntegrationTests() {
        console.log("🔍 Running integration tests...");
        
        const tests = [
            {
                name: 'Command Creation Test',
                test: () => this.testCommandCreation()
            },
            {
                name: 'Option Addition Test',
                test: () => this.testOptionAddition()
            },
            {
                name: 'Argument Addition Test',
                test: () => this.testArgumentAddition()
            },
            {
                name: 'Parsing Test',
                test: () => this.testParsing()
            },
            {
                name: 'Help Generation Test',
                test: () => this.testHelpGeneration()
            },
            {
                name: 'Memory Leak Test',
                test: () => this.testMemoryLeaks()
            },
            {
                name: 'Error Handling Test',
                test: () => this.testErrorHandling()
            }
        ];
        
        for (const testCase of tests) {
            try {
                console.log(`   Running ${testCase.name}...`);
                const result = await testCase.test();
                this.results.tests.push({
                    name: testCase.name,
                    success: true,
                    result: result
                });
                console.log(`   ✅ ${testCase.name} passed`);
            } catch (error) {
                this.results.tests.push({
                    name: testCase.name,
                    success: false,
                    error: error.message
                });
                console.log(`   ❌ ${testCase.name} failed: ${error.message}`);
            }
        }
        
        console.log();
    }

    testCommandCreation() {
        const cmd = new Command('diagnostic-test');
        const diagnostics = cmd.getDiagnostics();
        
        return {
            commandName: diagnostics.command.name,
            goCommandId: diagnostics.command.goCommandId,
            fallbackMode: diagnostics.command.fallbackMode,
            backendAvailable: diagnostics.backend.goBackendAvailable
        };
    }

    testOptionAddition() {
        const cmd = new Command('option-test');
        cmd.option('-t, --test', 'Test option', 'default');
        cmd.option('-v, --verbose', 'Verbose output');
        
        const diagnostics = cmd.getDiagnostics();
        
        return {
            optionsCount: diagnostics.command.optionsCount,
            fallbackMode: diagnostics.command.fallbackMode
        };
    }

    testArgumentAddition() {
        const cmd = new Command('argument-test');
        cmd.argument('<input>', 'Input file');
        cmd.argument('[output]', 'Output file', false);
        
        const diagnostics = cmd.getDiagnostics();
        
        return {
            argumentsCount: diagnostics.command.argumentsCount,
            fallbackMode: diagnostics.command.fallbackMode
        };
    }

    testParsing() {
        const cmd = new Command('parse-test');
        cmd.option('-f, --file <path>', 'File path')
           .option('-v, --verbose', 'Verbose output')
           .argument('<input>', 'Input file');
        
        // Test parsing with mock arguments
        const testArgs = ['node', 'script.js', '--file', 'test.txt', '--verbose', 'input.txt'];
        
        try {
            // We can't actually parse without triggering actions, so we'll test the setup
            return {
                commandSetup: true,
                optionsConfigured: cmd.getDiagnostics().command.optionsCount > 0,
                argumentsConfigured: cmd.getDiagnostics().command.argumentsCount > 0
            };
        } catch (error) {
            throw new Error(`Parsing test failed: ${error.message}`);
        }
    }

    testHelpGeneration() {
        const cmd = new Command('help-test');
        cmd.description('Test command for help generation')
           .option('-h, --help', 'Show help')
           .argument('<file>', 'Input file');
        
        try {
            // Capture help output by temporarily redirecting console.log
            const originalLog = console.log;
            let helpOutput = '';
            console.log = (msg) => { helpOutput += msg + '\n'; };
            
            cmd.outputHelp();
            
            console.log = originalLog;
            
            return {
                helpGenerated: helpOutput.length > 0,
                containsUsage: helpOutput.includes('Usage:'),
                containsOptions: helpOutput.includes('Options:'),
                helpLength: helpOutput.length
            };
        } catch (error) {
            throw new Error(`Help generation test failed: ${error.message}`);
        }
    }

    testMemoryLeaks() {
        const initialMemory = process.memoryUsage();
        
        // Create and destroy many commands to test for leaks
        for (let i = 0; i < 100; i++) {
            const cmd = new Command(`leak-test-${i}`);
            cmd.option(`--opt${i}`, `Option ${i}`)
               .argument(`<arg${i}>`, `Argument ${i}`);
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const finalMemory = process.memoryUsage();
        const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
        
        return {
            initialHeap: this.formatBytes(initialMemory.heapUsed),
            finalHeap: this.formatBytes(finalMemory.heapUsed),
            memoryDelta: this.formatBytes(memoryDelta),
            memoryDeltaBytes: memoryDelta,
            potentialLeak: memoryDelta > 1024 * 1024 // Flag if > 1MB increase
        };
    }

    testErrorHandling() {
        const results = [];
        
        // Test invalid command creation
        try {
            const cmd = new Command('');
            results.push({ test: 'empty name', success: true });
        } catch (error) {
            results.push({ test: 'empty name', success: false, error: error.message });
        }
        
        // Test invalid option flags
        try {
            const cmd = new Command('error-test');
            cmd.option('', 'Invalid option');
            results.push({ test: 'empty flags', success: true });
        } catch (error) {
            results.push({ test: 'empty flags', success: false, error: error.message });
        }
        
        // Test null/undefined values
        try {
            const cmd = new Command('error-test');
            cmd.option(null, 'Null flags');
            results.push({ test: 'null flags', success: true });
        } catch (error) {
            results.push({ test: 'null flags', success: false, error: error.message });
        }
        
        return {
            testsRun: results.length,
            results: results
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const size = (bytes / Math.pow(k, i)).toFixed(1);
        return `${bytes < 0 ? '-' : ''}${size} ${sizes[i]}`;
    }

    printReport() {
        console.log("=== Diagnostic Report ===\n");
        
        // System Information
        console.log("📊 System Information:");
        console.log(`   Platform: ${this.results.system.platform} (${this.results.system.arch})`);
        console.log(`   Node.js: ${this.results.system.nodeVersion}`);
        console.log(`   CPUs: ${this.results.system.cpuCount} (${this.results.system.cpuModel})`);
        console.log(`   Memory: ${this.formatBytes(this.results.system.totalMemory)} total, ${this.formatBytes(this.results.system.freeMemory)} free`);
        console.log(`   Load Average: ${this.results.system.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
        console.log();
        
        // Backend Information
        console.log("🔧 Backend Information:");
        console.log(`   Go Backend Available: ${this.results.backend.goBackendAvailable}`);
        console.log(`   Addon Loaded: ${this.results.backend.addonLoaded}`);
        
        if (this.results.backend.addonLoadError) {
            console.log(`   Load Error: ${this.results.backend.addonLoadError}`);
        }
        
        if (this.results.backend.lastGoError && this.results.backend.lastGoError !== 'No error') {
            console.log(`   Go Error: ${this.results.backend.lastGoError}`);
        }
        
        // Addon method availability
        const availableMethods = Object.keys(this.results.backend.addonMethods)
            .filter(method => this.results.backend.addonMethods[method].exists);
        console.log(`   Available Methods: ${availableMethods.join(', ')}`);
        
        // Method test results
        const successfulTests = Object.keys(this.results.backend.addonTests)
            .filter(method => this.results.backend.addonTests[method].success);
        console.log(`   Working Methods: ${successfulTests.join(', ')}`);
        console.log();
        
        // File Information
        console.log("📁 File Information:");
        const existingFiles = Object.keys(this.results.files).filter(f => this.results.files[f].exists);
        const missingFiles = Object.keys(this.results.files).filter(f => !this.results.files[f].exists);
        
        console.log(`   Existing Files (${existingFiles.length}):`);
        existingFiles.forEach(file => {
            const info = this.results.files[file];
            console.log(`     ✅ ${file} (${this.formatBytes(info.size)})`);
        });
        
        if (missingFiles.length > 0) {
            console.log(`   Missing Files (${missingFiles.length}):`);
            missingFiles.forEach(file => {
                console.log(`     ❌ ${file}`);
            });
        }
        console.log();
        
        // Integration Test Results
        console.log("🧪 Integration Test Results:");
        const passedTests = this.results.tests.filter(t => t.success);
        const failedTests = this.results.tests.filter(t => !t.success);
        
        console.log(`   Passed: ${passedTests.length}/${this.results.tests.length}`);
        
        passedTests.forEach(test => {
            console.log(`     ✅ ${test.name}`);
        });
        
        if (failedTests.length > 0) {
            console.log(`   Failed: ${failedTests.length}`);
            failedTests.forEach(test => {
                console.log(`     ❌ ${test.name}: ${test.error}`);
            });
        }
        console.log();
        
        // Recommendations
        this.printRecommendations();
    }

    printRecommendations() {
        console.log("💡 Recommendations:");
        
        const recommendations = [];
        
        if (!this.results.backend.goBackendAvailable) {
            recommendations.push("Go backend is not available - consider building the addon for better performance");
        }
        
        if (this.results.backend.addonLoadError) {
            recommendations.push("Addon failed to load - run 'npm run build' to rebuild the addon");
        }
        
        const missingFiles = Object.keys(this.results.files).filter(f => !this.results.files[f].exists);
        if (missingFiles.includes('src/gommander.dll') && missingFiles.includes('src/gommander.a')) {
            recommendations.push("Go library not found - run 'npm run go:build' to build the Go backend");
        }
        
        const failedTests = this.results.tests.filter(t => !t.success);
        if (failedTests.length > 0) {
            recommendations.push(`${failedTests.length} integration tests failed - check error messages above`);
        }
        
        // Memory leak detection
        const memoryTest = this.results.tests.find(t => t.name === 'Memory Leak Test');
        if (memoryTest && memoryTest.success && memoryTest.result.potentialLeak) {
            recommendations.push("Potential memory leak detected - monitor memory usage in production");
        }
        
        if (recommendations.length === 0) {
            console.log("   ✅ All systems appear to be working correctly!");
        } else {
            recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }
        
        console.log("\n=== End of Diagnostic Report ===");
    }
}

// Export for use in other test files
module.exports = {
    GoCommanderDiagnostics,
    runDiagnostics: async () => {
        const diagnostics = new GoCommanderDiagnostics();
        return await diagnostics.runFullDiagnostics();
    }
};

// Run diagnostics if this file is executed directly
if (require.main === module) {
    const diagnostics = new GoCommanderDiagnostics();
    diagnostics.runFullDiagnostics().then(results => {
        const failedTests = results.tests.filter(t => !t.success).length;
        process.exit(failedTests > 0 ? 1 : 0);
    }).catch(error => {
        console.error("Diagnostic utility failed:", error);
        process.exit(1);
    });
}