const { Command, addon, isGoBackendAvailable, getBackendStatus } = require("../index.js");
const os = require('os');

/**
 * Performance Benchmark and Diagnostics Test Suite
 * 
 * This test suite implements task 5.2 requirements:
 * - Implement benchmarks comparing Go vs JavaScript parsing performance
 * - Add memory usage monitoring and reporting
 * - Create diagnostic tools for troubleshooting integration issues
 * 
 * Requirements: 4.4
 */

console.log("=== Performance Benchmark and Diagnostics Test Suite ===\n");

// Benchmark configuration
const BENCHMARK_CONFIG = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    iterations: {
        light: 100,
        medium: 500,
        heavy: 1000
    },
    memoryCheckInterval: 50, // Check memory every N operations
    verbose: process.env.BENCHMARK_VERBOSE === 'true'
};

console.log(`Platform: ${BENCHMARK_CONFIG.platform} (${BENCHMARK_CONFIG.arch})`);
console.log(`Node.js: ${BENCHMARK_CONFIG.nodeVersion}`);
console.log(`Go Backend Available: ${isGoBackendAvailable()}\n`);

// Performance benchmark runner
class PerformanceBenchmarkRunner {
    constructor() {
        this.benchmarks = [];
        this.results = [];
        this.memorySnapshots = [];
        this.startTime = Date.now();
        this.initialMemory = process.memoryUsage();
    }

    benchmark(name, benchmarkFn, options = {}) {
        this.benchmarks.push({ name, benchmarkFn, options });
    }

    async run() {
        console.log(`Running ${this.benchmarks.length} performance benchmarks...\n`);
        
        // Start global memory monitoring
        this.startMemoryMonitoring();
        
        for (const { name, benchmarkFn, options } of this.benchmarks) {
            console.log(`🔄 ${name}`);
            
            try {
                const result = await this.runSingleBenchmark(name, benchmarkFn, options);
                this.results.push(result);
                
                console.log(`✅ ${name}: ${result.summary}\n`);
                
            } catch (error) {
                console.log(`❌ ${name}: ${error.message}\n`);
                this.results.push({
                    name,
                    error: error.message,
                    success: false
                });
            }
        }

        // Stop global memory monitoring
        this.stopMemoryMonitoring();

        this.printSummary();
        this.printMemoryAnalysis();
        return this.results;
    }

    async runSingleBenchmark(name, benchmarkFn, options) {
        const iterations = options.iterations || BENCHMARK_CONFIG.iterations.medium;
        const warmupIterations = Math.min(10, Math.floor(iterations * 0.1));
        
        // Warmup
        for (let i = 0; i < warmupIterations; i++) {
            await benchmarkFn();
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        const startMemory = process.memoryUsage();
        const startTime = process.hrtime.bigint();
        
        // Run benchmark
        const operationTimes = [];
        let memoryPeakRss = startMemory.rss;
        let memoryPeakHeapUsed = startMemory.heapUsed;
        
        for (let i = 0; i < iterations; i++) {
            const opStart = process.hrtime.bigint();
            await benchmarkFn();
            const opEnd = process.hrtime.bigint();
            
            operationTimes.push(Number(opEnd - opStart) / 1000000); // Convert to milliseconds
            
            // Check memory usage periodically
            if (i % BENCHMARK_CONFIG.memoryCheckInterval === 0) {
                const currentMemory = process.memoryUsage();
                memoryPeakRss = Math.max(memoryPeakRss, currentMemory.rss);
                memoryPeakHeapUsed = Math.max(memoryPeakHeapUsed, currentMemory.heapUsed);
            }
        }
        
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        // Calculate statistics
        const totalTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const avgTime = totalTime / iterations;
        const minTime = Math.min(...operationTimes);
        const maxTime = Math.max(...operationTimes);
        
        // Calculate percentiles
        const sortedTimes = operationTimes.sort((a, b) => a - b);
        const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
        const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
        const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
        
        // Memory usage
        const memoryDelta = {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal,
            external: endMemory.external - startMemory.external
        };
        
        const result = {
            name,
            success: true,
            iterations,
            totalTime: totalTime.toFixed(2),
            avgTime: avgTime.toFixed(4),
            minTime: minTime.toFixed(4),
            maxTime: maxTime.toFixed(4),
            p50: p50.toFixed(4),
            p95: p95.toFixed(4),
            p99: p99.toFixed(4),
            opsPerSecond: (iterations / (totalTime / 1000)).toFixed(0),
            memory: {
                startRss: this.formatBytes(startMemory.rss),
                endRss: this.formatBytes(endMemory.rss),
                peakRss: this.formatBytes(memoryPeakRss),
                deltaRss: this.formatBytes(memoryDelta.rss),
                startHeap: this.formatBytes(startMemory.heapUsed),
                endHeap: this.formatBytes(endMemory.heapUsed),
                peakHeap: this.formatBytes(memoryPeakHeapUsed),
                deltaHeap: this.formatBytes(memoryDelta.heapUsed)
            },
            summary: `${avgTime.toFixed(2)}ms avg, ${(iterations / (totalTime / 1000)).toFixed(0)} ops/sec, ${this.formatBytes(memoryDelta.rss)} RSS delta`
        };
        
        return result;
    }   
 formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const size = (bytes / Math.pow(k, i)).toFixed(1);
        return `${bytes < 0 ? '-' : ''}${size} ${sizes[i]}`;
    }

    // Enhanced memory monitoring with detailed tracking
    startMemoryMonitoring() {
        this.memoryMonitor = {
            snapshots: [],
            interval: null,
            startTime: Date.now()
        };

        // Take initial snapshot
        this.takeMemorySnapshot('initial');

        // Start periodic monitoring
        this.memoryMonitor.interval = setInterval(() => {
            this.takeMemorySnapshot('periodic');
        }, 1000); // Every second

        return this.memoryMonitor;
    }

    stopMemoryMonitoring() {
        if (this.memoryMonitor && this.memoryMonitor.interval) {
            clearInterval(this.memoryMonitor.interval);
            this.takeMemorySnapshot('final');
        }
        return this.memoryMonitor;
    }

    takeMemorySnapshot(label = 'snapshot') {
        if (!this.memoryMonitor) return;

        const usage = process.memoryUsage();
        const timestamp = Date.now();
        
        this.memoryMonitor.snapshots.push({
            label,
            timestamp,
            relativeTime: timestamp - this.memoryMonitor.startTime,
            memory: {
                rss: usage.rss,
                heapTotal: usage.heapTotal,
                heapUsed: usage.heapUsed,
                external: usage.external,
                arrayBuffers: usage.arrayBuffers || 0
            }
        });
    }

    getMemoryAnalysis() {
        if (!this.memoryMonitor || this.memoryMonitor.snapshots.length < 2) {
            return null;
        }

        const snapshots = this.memoryMonitor.snapshots;
        const initial = snapshots[0];
        const final = snapshots[snapshots.length - 1];

        // Calculate memory trends
        const rssValues = snapshots.map(s => s.memory.rss);
        const heapValues = snapshots.map(s => s.memory.heapUsed);

        const analysis = {
            duration: final.relativeTime,
            snapshots: snapshots.length,
            initial: initial.memory,
            final: final.memory,
            delta: {
                rss: final.memory.rss - initial.memory.rss,
                heapTotal: final.memory.heapTotal - initial.memory.heapTotal,
                heapUsed: final.memory.heapUsed - initial.memory.heapUsed,
                external: final.memory.external - initial.memory.external
            },
            peak: {
                rss: Math.max(...rssValues),
                heapUsed: Math.max(...heapValues)
            },
            trend: {
                rssIncreasing: rssValues[rssValues.length - 1] > rssValues[0],
                heapIncreasing: heapValues[heapValues.length - 1] > heapValues[0]
            }
        };

        // Calculate memory growth rate
        if (snapshots.length > 2) {
            const midpoint = Math.floor(snapshots.length / 2);
            const firstHalf = snapshots.slice(0, midpoint);
            const secondHalf = snapshots.slice(midpoint);
            
            const firstAvgRss = firstHalf.reduce((sum, s) => sum + s.memory.rss, 0) / firstHalf.length;
            const secondAvgRss = secondHalf.reduce((sum, s) => sum + s.memory.rss, 0) / secondHalf.length;
            
            analysis.growthRate = {
                rss: (secondAvgRss - firstAvgRss) / (final.relativeTime / 2), // bytes per ms
                rssPerSecond: ((secondAvgRss - firstAvgRss) / (final.relativeTime / 2)) * 1000
            };
        }

        return analysis;
    }

    printSummary() {
        console.log("=== Performance Benchmark Summary ===");
        
        const successfulResults = this.results.filter(r => r.success);
        const failedResults = this.results.filter(r => !r.success);
        
        console.log(`Total benchmarks: ${this.results.length}`);
        console.log(`Successful: ${successfulResults.length}`);
        console.log(`Failed: ${failedResults.length}`);
        
        if (successfulResults.length > 0) {
            console.log("\n📊 Performance Results:");
            
            successfulResults.forEach(result => {
                console.log(`\n${result.name}:`);
                console.log(`  Iterations: ${result.iterations}`);
                console.log(`  Total time: ${result.totalTime}ms`);
                console.log(`  Average: ${result.avgTime}ms`);
                console.log(`  Min/Max: ${result.minTime}ms / ${result.maxTime}ms`);
                console.log(`  Percentiles: P50=${result.p50}ms, P95=${result.p95}ms, P99=${result.p99}ms`);
                console.log(`  Throughput: ${result.opsPerSecond} ops/sec`);
                console.log(`  Memory: ${result.memory.deltaRss} RSS, ${result.memory.deltaHeap} Heap`);
            });
            
            // Performance comparison if we have Go vs JS results
            const goResults = successfulResults.filter(r => r.name.includes('Go'));
            const jsResults = successfulResults.filter(r => r.name.includes('JavaScript'));
            
            if (goResults.length > 0 && jsResults.length > 0) {
                console.log("\n🔄 Go vs JavaScript Comparison:");
                
                goResults.forEach(goResult => {
                    const matchingJs = jsResults.find(js => 
                        js.name.replace('JavaScript', '') === goResult.name.replace('Go', ''));
                    
                    if (matchingJs) {
                        const speedup = (parseFloat(matchingJs.avgTime) / parseFloat(goResult.avgTime)).toFixed(2);
                        const throughputRatio = (parseFloat(goResult.opsPerSecond) / parseFloat(matchingJs.opsPerSecond)).toFixed(2);
                        
                        console.log(`  ${goResult.name.replace('Go ', '')}:`);
                        console.log(`    Go: ${goResult.avgTime}ms avg, ${goResult.opsPerSecond} ops/sec`);
                        console.log(`    JS: ${matchingJs.avgTime}ms avg, ${matchingJs.opsPerSecond} ops/sec`);
                        console.log(`    Speedup: ${speedup}x faster, ${throughputRatio}x throughput`);
                    }
                });
            }
        }
        
        if (failedResults.length > 0) {
            console.log("\n❌ Failed benchmarks:");
            failedResults.forEach(result => {
                console.log(`  - ${result.name}: ${result.error}`);
            });
        }
        
        const totalTime = Date.now() - this.startTime;
        console.log(`\nTotal benchmark time: ${totalTime}ms`);
    }

    printMemoryAnalysis() {
        const analysis = this.getMemoryAnalysis();
        
        if (!analysis) {
            console.log("\n⚠️  Memory analysis not available (insufficient data)");
            return;
        }

        console.log("\n=== Memory Usage Analysis ===");
        console.log(`Duration: ${analysis.duration}ms`);
        console.log(`Snapshots taken: ${analysis.snapshots}`);
        
        console.log("\n📊 Memory Changes:");
        console.log(`  RSS: ${this.formatBytes(analysis.initial.rss)} → ${this.formatBytes(analysis.final.rss)} (${this.formatBytes(analysis.delta.rss)})`);
        console.log(`  Heap Used: ${this.formatBytes(analysis.initial.heapUsed)} → ${this.formatBytes(analysis.final.heapUsed)} (${this.formatBytes(analysis.delta.heapUsed)})`);
        console.log(`  Heap Total: ${this.formatBytes(analysis.initial.heapTotal)} → ${this.formatBytes(analysis.final.heapTotal)} (${this.formatBytes(analysis.delta.heapTotal)})`);
        console.log(`  External: ${this.formatBytes(analysis.initial.external)} → ${this.formatBytes(analysis.final.external)} (${this.formatBytes(analysis.delta.external)})`);
        
        console.log("\n📈 Peak Usage:");
        console.log(`  Peak RSS: ${this.formatBytes(analysis.peak.rss)}`);
        console.log(`  Peak Heap: ${this.formatBytes(analysis.peak.heapUsed)}`);
        
        console.log("\n📉 Trends:");
        console.log(`  RSS Trend: ${analysis.trend.rssIncreasing ? '📈 Increasing' : '📉 Decreasing'}`);
        console.log(`  Heap Trend: ${analysis.trend.heapIncreasing ? '📈 Increasing' : '📉 Decreasing'}`);
        
        if (analysis.growthRate) {
            console.log("\n⚡ Growth Rate:");
            console.log(`  RSS Growth: ${this.formatBytes(analysis.growthRate.rssPerSecond)}/sec`);
            
            // Memory leak detection
            const leakThreshold = 1024 * 1024; // 1MB/sec
            if (Math.abs(analysis.growthRate.rssPerSecond) > leakThreshold) {
                console.log(`  ⚠️  Potential memory leak detected! Growth rate exceeds ${this.formatBytes(leakThreshold)}/sec`);
            }
        }
        
        // Memory efficiency analysis
        console.log("\n💡 Memory Efficiency:");
        const efficiency = this.calculateMemoryEfficiency(analysis);
        console.log(`  Efficiency Score: ${efficiency.score}/100`);
        console.log(`  Assessment: ${efficiency.assessment}`);
        
        if (efficiency.recommendations.length > 0) {
            console.log("  Recommendations:");
            efficiency.recommendations.forEach(rec => {
                console.log(`    • ${rec}`);
            });
        }
    }

    calculateMemoryEfficiency(analysis) {
        let score = 100;
        const recommendations = [];
        
        // Penalize large memory growth
        const growthMB = analysis.delta.rss / (1024 * 1024);
        if (growthMB > 50) {
            score -= 30;
            recommendations.push("High memory growth detected - consider optimizing memory usage");
        } else if (growthMB > 20) {
            score -= 15;
            recommendations.push("Moderate memory growth - monitor for potential leaks");
        }
        
        // Penalize high peak usage
        const peakMB = analysis.peak.rss / (1024 * 1024);
        if (peakMB > 500) {
            score -= 20;
            recommendations.push("High peak memory usage - consider reducing memory footprint");
        } else if (peakMB > 200) {
            score -= 10;
            recommendations.push("Moderate peak memory usage - acceptable for most applications");
        }
        
        // Penalize increasing trends
        if (analysis.trend.rssIncreasing && analysis.trend.heapIncreasing) {
            score -= 15;
            recommendations.push("Both RSS and heap are increasing - check for memory leaks");
        }
        
        // Growth rate penalty
        if (analysis.growthRate && Math.abs(analysis.growthRate.rssPerSecond) > 1024 * 1024) {
            score -= 25;
            recommendations.push("High memory growth rate - immediate attention required");
        }
        
        score = Math.max(0, score);
        
        let assessment;
        if (score >= 90) assessment = "Excellent";
        else if (score >= 75) assessment = "Good";
        else if (score >= 60) assessment = "Fair";
        else if (score >= 40) assessment = "Poor";
        else assessment = "Critical";
        
        return { score, assessment, recommendations };
    }
}

const benchmarkRunner = new PerformanceBenchmarkRunner();

// ============================================================================
// Benchmark Group 1: Command Creation Performance
// ============================================================================

benchmarkRunner.benchmark("Go Command Creation", async () => {
    if (!isGoBackendAvailable()) {
        throw new Error("Go backend not available");
    }
    
    const cmd = new Command(`go-test-${Math.random()}`);
    cmd.option("-t, --test", "Test option")
       .argument("<file>", "Test file");
}, { iterations: BENCHMARK_CONFIG.iterations.heavy });

benchmarkRunner.benchmark("JavaScript Command Creation", async () => {
    // Force JavaScript mode by creating command when Go is unavailable
    // or by using internal JavaScript implementation
    const cmd = new Command(`js-test-${Math.random()}`);
    
    // Ensure we're using JavaScript implementation
    if (cmd._goCommandId !== null) {
        // If Go backend is available, we need to simulate JS-only mode
        // This is a limitation of the current architecture
        cmd._fallbackMode = true;
        cmd._goCommandId = null;
    }
    
    cmd.option("-t, --test", "Test option")
       .argument("<file>", "Test file");
}, { iterations: BENCHMARK_CONFIG.iterations.heavy });

// ============================================================================
// Benchmark Group 2: Option and Argument Addition Performance
// ============================================================================

benchmarkRunner.benchmark("Go Option Addition", async () => {
    if (!isGoBackendAvailable()) {
        throw new Error("Go backend not available");
    }
    
    const cmd = new Command("go-option-test");
    
    // Add multiple options rapidly
    for (let i = 0; i < 10; i++) {
        cmd.option(`-${String.fromCharCode(97 + i)}, --option${i}`, `Option ${i}`, `default${i}`);
    }
}, { iterations: BENCHMARK_CONFIG.iterations.medium });

benchmarkRunner.benchmark("JavaScript Option Addition", async () => {
    const cmd = new Command("js-option-test");
    
    // Force JavaScript mode
    if (cmd._goCommandId !== null) {
        cmd._fallbackMode = true;
        cmd._goCommandId = null;
    }
    
    // Add multiple options rapidly
    for (let i = 0; i < 10; i++) {
        cmd.option(`-${String.fromCharCode(97 + i)}, --option${i}`, `Option ${i}`, `default${i}`);
    }
}, { iterations: BENCHMARK_CONFIG.iterations.medium });

// ============================================================================
// Benchmark Group 3: Complex Command Structure Performance
// ============================================================================

benchmarkRunner.benchmark("Go Complex Command Structure", async () => {
    if (!isGoBackendAvailable()) {
        throw new Error("Go backend not available");
    }
    
    const root = new Command("go-complex");
    
    // Create nested structure
    for (let i = 0; i < 3; i++) {
        const sub1 = root.command(`sub${i}`, `Subcommand ${i}`);
        for (let j = 0; j < 2; j++) {
            const sub2 = sub1.command(`subsub${j}`, `Sub-subcommand ${j}`);
            sub2.option(`--opt${i}${j}`, `Option ${i}-${j}`)
                .argument(`<arg${i}${j}>`, `Argument ${i}-${j}`);
        }
    }
}, { iterations: BENCHMARK_CONFIG.iterations.light });

benchmarkRunner.benchmark("JavaScript Complex Command Structure", async () => {
    const root = new Command("js-complex");
    
    // Force JavaScript mode
    if (root._goCommandId !== null) {
        root._fallbackMode = true;
        root._goCommandId = null;
    }
    
    // Create nested structure
    for (let i = 0; i < 3; i++) {
        const sub1 = root.command(`sub${i}`, `Subcommand ${i}`);
        
        // Force JavaScript mode for subcommands too
        if (sub1._goCommandId !== null) {
            sub1._fallbackMode = true;
            sub1._goCommandId = null;
        }
        
        for (let j = 0; j < 2; j++) {
            const sub2 = sub1.command(`subsub${j}`, `Sub-subcommand ${j}`);
            
            // Force JavaScript mode for sub-subcommands
            if (sub2._goCommandId !== null) {
                sub2._fallbackMode = true;
                sub2._goCommandId = null;
            }
            
            sub2.option(`--opt${i}${j}`, `Option ${i}-${j}`)
                .argument(`<arg${i}${j}>`, `Argument ${i}-${j}`);
        }
    }
}, { iterations: BENCHMARK_CONFIG.iterations.light });

// ============================================================================
// Benchmark Group 4: Memory Usage Patterns
// ============================================================================

benchmarkRunner.benchmark("Memory Usage - Command Creation Burst", async () => {
    const commands = [];
    
    // Create many commands rapidly
    for (let i = 0; i < 50; i++) {
        const cmd = new Command(`memory-test-${i}`);
        cmd.option(`--opt${i}`, `Option ${i}`)
           .argument(`<arg${i}>`, `Argument ${i}`);
        commands.push(cmd);
    }
    
    // Clear references to test cleanup
    commands.length = 0;
}, { iterations: BENCHMARK_CONFIG.iterations.light });

benchmarkRunner.benchmark("Memory Usage - Large Command Tree", async () => {
    const root = new Command("memory-tree");
    
    // Create a large tree structure
    for (let i = 0; i < 5; i++) {
        const level1 = root.command(`l1-${i}`, `Level 1 command ${i}`);
        for (let j = 0; j < 4; j++) {
            const level2 = level1.command(`l2-${j}`, `Level 2 command ${j}`);
            for (let k = 0; k < 3; k++) {
                const level3 = level2.command(`l3-${k}`, `Level 3 command ${k}`);
                level3.option(`--opt${i}${j}${k}`, `Option ${i}-${j}-${k}`)
                      .argument(`<arg${i}${j}${k}>`, `Argument ${i}-${j}-${k}`);
            }
        }
    }
}, { iterations: BENCHMARK_CONFIG.iterations.light });

// ============================================================================
// Diagnostic Tools
// ============================================================================

class DiagnosticTools {
    static getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            uptime: os.uptime(),
            loadAverage: os.loadavg()
        };
    }

    static getBackendDiagnostics() {
        const backendStatus = getBackendStatus();
        const goAvailable = isGoBackendAvailable();
        
        return {
            goBackendAvailable: goAvailable,
            addonLoaded: backendStatus.addonLoaded,
            addonLoadError: backendStatus.addonLoadError,
            lastGoError: backendStatus.lastGoError,
            addonVersion: addon && addon.version ? addon.version() : 'N/A',
            addonHello: addon && addon.hello ? addon.hello() : 'N/A'
        };
    }

    static getMemoryDiagnostics() {
        const usage = process.memoryUsage();
        const system = this.getSystemInfo();
        
        return {
            process: {
                rss: this.formatBytes(usage.rss),
                heapTotal: this.formatBytes(usage.heapTotal),
                heapUsed: this.formatBytes(usage.heapUsed),
                external: this.formatBytes(usage.external),
                arrayBuffers: this.formatBytes(usage.arrayBuffers || 0)
            },
            system: {
                total: this.formatBytes(system.totalMemory),
                free: this.formatBytes(system.freeMemory),
                used: this.formatBytes(system.totalMemory - system.freeMemory),
                usagePercent: ((system.totalMemory - system.freeMemory) / system.totalMemory * 100).toFixed(1)
            }
        };
    }

    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const size = (bytes / Math.pow(k, i)).toFixed(1);
        return `${bytes < 0 ? '-' : ''}${size} ${sizes[i]}`;
    }

    static printFullDiagnostics() {
        console.log("=== System Diagnostics ===");
        
        const systemInfo = this.getSystemInfo();
        console.log(`Platform: ${systemInfo.platform} (${systemInfo.arch})`);
        console.log(`Node.js: ${systemInfo.nodeVersion}`);
        console.log(`CPUs: ${systemInfo.cpus}`);
        console.log(`System Memory: ${this.formatBytes(systemInfo.totalMemory)} total, ${this.formatBytes(systemInfo.freeMemory)} free`);
        console.log(`Load Average: ${systemInfo.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
        
        console.log("\n=== Backend Diagnostics ===");
        const backendDiag = this.getBackendDiagnostics();
        console.log(`Go Backend Available: ${backendDiag.goBackendAvailable}`);
        console.log(`Addon Loaded: ${backendDiag.addonLoaded}`);
        if (backendDiag.addonLoadError) {
            console.log(`Addon Load Error: ${backendDiag.addonLoadError}`);
        }
        if (backendDiag.lastGoError && backendDiag.lastGoError !== 'No error') {
            console.log(`Last Go Error: ${backendDiag.lastGoError}`);
        }
        console.log(`Addon Version: ${backendDiag.addonVersion}`);
        console.log(`Addon Hello: ${backendDiag.addonHello}`);
        
        console.log("\n=== Memory Diagnostics ===");
        const memoryDiag = this.getMemoryDiagnostics();
        console.log(`Process RSS: ${memoryDiag.process.rss}`);
        console.log(`Heap Used/Total: ${memoryDiag.process.heapUsed} / ${memoryDiag.process.heapTotal}`);
        console.log(`External: ${memoryDiag.process.external}`);
        console.log(`System Usage: ${memoryDiag.system.used} / ${memoryDiag.system.total} (${memoryDiag.system.usagePercent}%)`);
    }
}

// ============================================================================
// Main Execution
// ============================================================================

async function runPerformanceBenchmarks() {
    console.log("Starting Performance Benchmarks and Diagnostics...\n");
    
    // Print initial diagnostics
    DiagnosticTools.printFullDiagnostics();
    console.log("\n" + "=".repeat(70) + "\n");
    
    // Run benchmarks
    const results = await benchmarkRunner.run();
    
    console.log("\n" + "=".repeat(70));
    console.log("PERFORMANCE BENCHMARK RESULTS");
    console.log("=".repeat(70));
    
    // Print final diagnostics
    console.log("\n=== Final System State ===");
    const finalMemory = DiagnosticTools.getMemoryDiagnostics();
    console.log(`Final Memory Usage: ${finalMemory.process.rss} RSS, ${finalMemory.process.heapUsed} Heap`);
    
    return results;
}

// Export for use in other test files
module.exports = {
    runPerformanceBenchmarks,
    PerformanceBenchmarkRunner,
    DiagnosticTools,
    BENCHMARK_CONFIG
};

// Run benchmarks if this file is executed directly
if (require.main === module) {
    runPerformanceBenchmarks().then(results => {
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`\nBenchmark Summary: ${successful} successful, ${failed} failed`);
        process.exit(failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error("Performance benchmark runner failed:", error);
        process.exit(1);
    });
}