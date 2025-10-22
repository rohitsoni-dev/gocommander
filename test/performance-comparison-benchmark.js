const { Command, addon, isGoBackendAvailable, getBackendStatus } = require("../index.js");
const { PerformanceBenchmarkRunner, DiagnosticTools } = require("./performance-benchmark-test.js");
const os = require('os');

/**
 * Comprehensive Performance Comparison Benchmark
 * 
 * This benchmark implements task 5.2 requirements:
 * - Implement benchmarks comparing Go vs JavaScript parsing performance
 * - Add memory usage monitoring and reporting
 * - Create diagnostic tools for troubleshooting integration issues
 * 
 * Requirements: 4.4
 */

console.log("=== Go vs JavaScript Performance Comparison ===\n");

class PerformanceComparisonBenchmark {
    constructor() {
        this.results = {
            system: {},
            backend: {},
            benchmarks: [],
            comparison: {},
            recommendations: []
        };
        
        this.testScenarios = [
            {
                name: 'Simple Command Creation',
                description: 'Basic command creation with minimal options',
                complexity: 'low',
                iterations: 1000
            },
            {
                name: 'Complex Command Structure',
                description: 'Nested commands with multiple options and arguments',
                complexity: 'high',
                iterations: 100
            },
            {
                name: 'Rapid Option Addition',
                description: 'Adding many options to a single command',
                complexity: 'medium',
                iterations: 500
            },
            {
                name: 'Argument Processing',
                description: 'Adding and configuring command arguments',
                complexity: 'medium',
                iterations: 500
            },
            {
                name: 'Help Generation',
                description: 'Generating help text for commands',
                complexity: 'medium',
                iterations: 200
            }
        ];
    }

    async runComparison() {
        console.log("Starting comprehensive Go vs JavaScript performance comparison...\n");
        
        this.collectSystemInfo();
        this.collectBackendInfo();
        
        // Run benchmarks for each scenario
        for (const scenario of this.testScenarios) {
            console.log(`\n🔄 Testing: ${scenario.name}`);
            console.log(`   Description: ${scenario.description}`);
            console.log(`   Complexity: ${scenario.complexity}, Iterations: ${scenario.iterations}`);
            
            const benchmarkResult = await this.runScenarioBenchmark(scenario);
            this.results.benchmarks.push(benchmarkResult);
            
            this.printScenarioResults(benchmarkResult);
        }
        
        this.analyzeComparison();
        this.generateRecommendations();
        this.printFinalReport();
        
        return this.results;
    }

    collectSystemInfo() {
        this.results.system = {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            cpuCount: os.cpus().length,
            cpuModel: os.cpus()[0]?.model || 'Unknown',
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            timestamp: new Date().toISOString()
        };
    }

    collectBackendInfo() {
        const backendStatus = getBackendStatus();
        
        this.results.backend = {
            goAvailable: isGoBackendAvailable(),
            addonLoaded: backendStatus.addonLoaded,
            addonLoadError: backendStatus.addonLoadError,
            lastGoError: backendStatus.lastGoError,
            canRunComparison: isGoBackendAvailable() && backendStatus.addonLoaded
        };
        
        console.log(`Go Backend Available: ${this.results.backend.goAvailable}`);
        console.log(`Can Run Comparison: ${this.results.backend.canRunComparison}`);
        
        if (!this.results.backend.canRunComparison) {
            console.log("⚠️  Go backend not available - will only benchmark JavaScript implementation");
            if (this.results.backend.addonLoadError) {
                console.log(`   Reason: ${this.results.backend.addonLoadError}`);
            }
        }
    }

    async runScenarioBenchmark(scenario) {
        const benchmarkRunner = new PerformanceBenchmarkRunner();
        const results = {
            scenario: scenario.name,
            description: scenario.description,
            complexity: scenario.complexity,
            iterations: scenario.iterations,
            go: null,
            javascript: null,
            comparison: null
        };

        // Test Go implementation if available
        if (this.results.backend.canRunComparison) {
            try {
                console.log("   Testing Go implementation...");
                const goResult = await this.runImplementationBenchmark(
                    scenario, 
                    'go', 
                    benchmarkRunner
                );
                results.go = goResult;
            } catch (error) {
                console.log(`   ❌ Go benchmark failed: ${error.message}`);
                results.go = { error: error.message };
            }
        }

        // Test JavaScript implementation
        try {
            console.log("   Testing JavaScript implementation...");
            const jsResult = await this.runImplementationBenchmark(
                scenario, 
                'javascript', 
                benchmarkRunner
            );
            results.javascript = jsResult;
        } catch (error) {
            console.log(`   ❌ JavaScript benchmark failed: ${error.message}`);
            results.javascript = { error: error.message };
        }

        // Compare results if both are available
        if (results.go && results.javascript && !results.go.error && !results.javascript.error) {
            results.comparison = this.compareResults(results.go, results.javascript);
        }

        return results;
    }

    async runImplementationBenchmark(scenario, implementation, benchmarkRunner) {
        const testFunction = this.getTestFunction(scenario.name, implementation);
        
        // Start memory monitoring
        benchmarkRunner.startMemoryMonitoring();
        
        const result = await benchmarkRunner.runSingleBenchmark(
            `${scenario.name} (${implementation})`,
            testFunction,
            { iterations: scenario.iterations }
        );
        
        // Stop memory monitoring and get analysis
        benchmarkRunner.stopMemoryMonitoring();
        const memoryAnalysis = benchmarkRunner.getMemoryAnalysis();
        
        return {
            ...result,
            memoryAnalysis,
            implementation
        };
    }

    getTestFunction(scenarioName, implementation) {
        const forceJavaScript = implementation === 'javascript';
        
        switch (scenarioName) {
            case 'Simple Command Creation':
                return () => {
                    const cmd = new Command(`test-${Math.random()}`);
                    if (forceJavaScript && cmd._goCommandId !== null) {
                        cmd._fallbackMode = true;
                        cmd._goCommandId = null;
                    }
                    cmd.option('-v, --verbose', 'Verbose output')
                       .argument('<file>', 'Input file');
                };

            case 'Complex Command Structure':
                return () => {
                    const root = new Command(`complex-${Math.random()}`);
                    if (forceJavaScript && root._goCommandId !== null) {
                        root._fallbackMode = true;
                        root._goCommandId = null;
                    }
                    
                    for (let i = 0; i < 3; i++) {
                        const sub = root.command(`sub${i}`, `Subcommand ${i}`);
                        if (forceJavaScript && sub._goCommandId !== null) {
                            sub._fallbackMode = true;
                            sub._goCommandId = null;
                        }
                        
                        sub.option(`--opt${i}`, `Option ${i}`)
                           .argument(`<arg${i}>`, `Argument ${i}`);
                    }
                };

            case 'Rapid Option Addition':
                return () => {
                    const cmd = new Command(`options-${Math.random()}`);
                    if (forceJavaScript && cmd._goCommandId !== null) {
                        cmd._fallbackMode = true;
                        cmd._goCommandId = null;
                    }
                    
                    for (let i = 0; i < 20; i++) {
                        cmd.option(`-${String.fromCharCode(97 + (i % 26))}, --option${i}`, 
                                  `Option ${i}`, `default${i}`);
                    }
                };

            case 'Argument Processing':
                return () => {
                    const cmd = new Command(`args-${Math.random()}`);
                    if (forceJavaScript && cmd._goCommandId !== null) {
                        cmd._fallbackMode = true;
                        cmd._goCommandId = null;
                    }
                    
                    for (let i = 0; i < 10; i++) {
                        cmd.argument(`<arg${i}>`, `Argument ${i}`, i < 5);
                    }
                };

            case 'Help Generation':
                return () => {
                    const cmd = new Command(`help-${Math.random()}`);
                    if (forceJavaScript && cmd._goCommandId !== null) {
                        cmd._fallbackMode = true;
                        cmd._goCommandId = null;
                    }
                    
                    cmd.description('Test command for help generation')
                       .option('-h, --help', 'Show help')
                       .option('-v, --version', 'Show version')
                       .argument('<input>', 'Input file')
                       .argument('[output]', 'Output file', false);
                    
                    // Capture help output
                    const originalLog = console.log;
                    console.log = () => {}; // Suppress output
                    cmd.outputHelp();
                    console.log = originalLog;
                };

            default:
                throw new Error(`Unknown scenario: ${scenarioName}`);
        }
    }

    compareResults(goResult, jsResult) {
        const comparison = {
            performance: {},
            memory: {},
            overall: {}
        };

        // Performance comparison
        const goAvgTime = parseFloat(goResult.avgTime);
        const jsAvgTime = parseFloat(jsResult.avgTime);
        const speedup = jsAvgTime / goAvgTime;
        
        comparison.performance = {
            goAvgTime: goAvgTime,
            jsAvgTime: jsAvgTime,
            speedup: speedup,
            speedupFormatted: `${speedup.toFixed(2)}x`,
            winner: speedup > 1 ? 'go' : 'javascript',
            improvement: speedup > 1 ? 
                `Go is ${speedup.toFixed(2)}x faster` : 
                `JavaScript is ${(1/speedup).toFixed(2)}x faster`
        };

        // Throughput comparison
        const goThroughput = parseFloat(goResult.opsPerSecond);
        const jsThroughput = parseFloat(jsResult.opsPerSecond);
        const throughputRatio = goThroughput / jsThroughput;
        
        comparison.performance.throughput = {
            goOpsPerSec: goThroughput,
            jsOpsPerSec: jsThroughput,
            ratio: throughputRatio,
            ratioFormatted: `${throughputRatio.toFixed(2)}x`,
            winner: throughputRatio > 1 ? 'go' : 'javascript'
        };

        // Memory comparison
        if (goResult.memoryAnalysis && jsResult.memoryAnalysis) {
            const goMemDelta = goResult.memoryAnalysis.delta.rss;
            const jsMemDelta = jsResult.memoryAnalysis.delta.rss;
            
            comparison.memory = {
                goMemoryDelta: goMemDelta,
                jsMemoryDelta: jsMemDelta,
                memoryRatio: Math.abs(jsMemDelta) / Math.abs(goMemDelta),
                winner: Math.abs(goMemDelta) < Math.abs(jsMemDelta) ? 'go' : 'javascript',
                goMemoryFormatted: this.formatBytes(goMemDelta),
                jsMemoryFormatted: this.formatBytes(jsMemDelta)
            };
        }

        // Overall assessment
        let goScore = 0;
        let jsScore = 0;
        
        if (comparison.performance.winner === 'go') goScore += 2;
        else jsScore += 2;
        
        if (comparison.performance.throughput.winner === 'go') goScore += 2;
        else jsScore += 2;
        
        if (comparison.memory.winner === 'go') goScore += 1;
        else jsScore += 1;
        
        comparison.overall = {
            winner: goScore > jsScore ? 'go' : 'javascript',
            goScore,
            jsScore,
            confidence: Math.abs(goScore - jsScore) >= 3 ? 'high' : 'medium'
        };

        return comparison;
    }

    printScenarioResults(result) {
        console.log(`\n📊 Results for ${result.scenario}:`);
        
        if (result.go && !result.go.error) {
            console.log(`   Go: ${result.go.avgTime}ms avg, ${result.go.opsPerSecond} ops/sec`);
        }
        
        if (result.javascript && !result.javascript.error) {
            console.log(`   JS: ${result.javascript.avgTime}ms avg, ${result.javascript.opsPerSecond} ops/sec`);
        }
        
        if (result.comparison) {
            console.log(`   Winner: ${result.comparison.overall.winner.toUpperCase()} (${result.comparison.performance.improvement})`);
            console.log(`   Throughput: ${result.comparison.performance.throughput.ratioFormatted} advantage to ${result.comparison.performance.throughput.winner}`);
            
            if (result.comparison.memory) {
                console.log(`   Memory: ${result.comparison.memory.winner} uses less memory`);
            }
        }
    }

    analyzeComparison() {
        const validComparisons = this.results.benchmarks.filter(b => b.comparison);
        
        if (validComparisons.length === 0) {
            this.results.comparison = { error: 'No valid comparisons available' };
            return;
        }

        const goWins = validComparisons.filter(b => b.comparison.overall.winner === 'go').length;
        const jsWins = validComparisons.filter(b => b.comparison.overall.winner === 'javascript').length;
        
        // Calculate average performance metrics
        const avgSpeedup = validComparisons.reduce((sum, b) => 
            sum + b.comparison.performance.speedup, 0) / validComparisons.length;
        
        const avgThroughputRatio = validComparisons.reduce((sum, b) => 
            sum + b.comparison.performance.throughput.ratio, 0) / validComparisons.length;

        this.results.comparison = {
            totalComparisons: validComparisons.length,
            goWins,
            jsWins,
            overallWinner: goWins > jsWins ? 'go' : 'javascript',
            winPercentage: {
                go: (goWins / validComparisons.length * 100).toFixed(1),
                javascript: (jsWins / validComparisons.length * 100).toFixed(1)
            },
            averageSpeedup: avgSpeedup,
            averageThroughputRatio: avgThroughputRatio,
            performance: {
                goFaster: avgSpeedup > 1,
                speedupFormatted: avgSpeedup > 1 ? 
                    `${avgSpeedup.toFixed(2)}x faster` : 
                    `${(1/avgSpeedup).toFixed(2)}x slower`,
                throughputAdvantage: avgThroughputRatio > 1 ? 'go' : 'javascript',
                throughputRatio: `${Math.max(avgThroughputRatio, 1/avgThroughputRatio).toFixed(2)}x`
            }
        };
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (!this.results.backend.canRunComparison) {
            recommendations.push({
                type: 'setup',
                priority: 'high',
                message: 'Go backend is not available. Build the addon to enable performance benefits.',
                action: 'Run "npm run build" to build the Go addon'
            });
        } else if (this.results.comparison && !this.results.comparison.error) {
            const comp = this.results.comparison;
            
            if (comp.overallWinner === 'go') {
                recommendations.push({
                    type: 'performance',
                    priority: 'medium',
                    message: `Go backend shows ${comp.performance.speedupFormatted} performance advantage`,
                    action: 'Consider using Go backend for production workloads'
                });
            } else {
                recommendations.push({
                    type: 'performance',
                    priority: 'low',
                    message: 'JavaScript implementation performs competitively',
                    action: 'Go backend may not provide significant benefits for your use case'
                });
            }
            
            // Memory recommendations
            const memoryIssues = this.results.benchmarks.filter(b => 
                b.go?.memoryAnalysis?.growthRate?.rssPerSecond > 1024 * 1024 ||
                b.javascript?.memoryAnalysis?.growthRate?.rssPerSecond > 1024 * 1024
            );
            
            if (memoryIssues.length > 0) {
                recommendations.push({
                    type: 'memory',
                    priority: 'high',
                    message: 'High memory growth rate detected in some benchmarks',
                    action: 'Monitor memory usage in production and consider optimization'
                });
            }
        }
        
        // System-specific recommendations
        if (this.results.system.totalMemory < 2 * 1024 * 1024 * 1024) { // Less than 2GB
            recommendations.push({
                type: 'system',
                priority: 'medium',
                message: 'Low system memory detected',
                action: 'Monitor memory usage carefully and consider JavaScript fallback'
            });
        }
        
        this.results.recommendations = recommendations;
    }

    printFinalReport() {
        console.log("\n" + "=".repeat(70));
        console.log("COMPREHENSIVE PERFORMANCE COMPARISON REPORT");
        console.log("=".repeat(70));
        
        // System info
        console.log(`\n🖥️  System: ${this.results.system.platform} (${this.results.system.arch})`);
        console.log(`   Node.js: ${this.results.system.nodeVersion}`);
        console.log(`   CPUs: ${this.results.system.cpuCount}`);
        console.log(`   Memory: ${this.formatBytes(this.results.system.totalMemory)}`);
        
        // Backend status
        console.log(`\n🔧 Backend Status:`);
        console.log(`   Go Available: ${this.results.backend.goAvailable}`);
        console.log(`   Comparison Possible: ${this.results.backend.canRunComparison}`);
        
        // Overall comparison results
        if (this.results.comparison && !this.results.comparison.error) {
            const comp = this.results.comparison;
            
            console.log(`\n🏆 Overall Results:`);
            console.log(`   Total Comparisons: ${comp.totalComparisons}`);
            console.log(`   Go Wins: ${comp.goWins} (${comp.winPercentage.go}%)`);
            console.log(`   JavaScript Wins: ${comp.jsWins} (${comp.winPercentage.javascript}%)`);
            console.log(`   Overall Winner: ${comp.overallWinner.toUpperCase()}`);
            
            console.log(`\n⚡ Performance Summary:`);
            console.log(`   Average Performance: Go is ${comp.performance.speedupFormatted}`);
            console.log(`   Throughput Advantage: ${comp.performance.throughputAdvantage} (${comp.performance.throughputRatio})`);
        }
        
        // Detailed scenario results
        console.log(`\n📊 Scenario Breakdown:`);
        this.results.benchmarks.forEach(benchmark => {
            console.log(`\n   ${benchmark.scenario} (${benchmark.complexity} complexity):`);
            
            if (benchmark.go && !benchmark.go.error) {
                console.log(`     Go: ${benchmark.go.avgTime}ms, ${benchmark.go.opsPerSecond} ops/sec`);
            }
            
            if (benchmark.javascript && !benchmark.javascript.error) {
                console.log(`     JS: ${benchmark.javascript.avgTime}ms, ${benchmark.javascript.opsPerSecond} ops/sec`);
            }
            
            if (benchmark.comparison) {
                console.log(`     Result: ${benchmark.comparison.performance.improvement}`);
            }
        });
        
        // Recommendations
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 Recommendations:`);
            this.results.recommendations.forEach((rec, index) => {
                const priority = rec.priority === 'high' ? '🔴' : 
                               rec.priority === 'medium' ? '🟡' : '🟢';
                console.log(`   ${index + 1}. ${priority} ${rec.message}`);
                console.log(`      Action: ${rec.action}`);
            });
        }
        
        console.log(`\n📅 Report generated: ${this.results.system.timestamp}`);
        console.log("=".repeat(70));
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const size = (bytes / Math.pow(k, i)).toFixed(1);
        return `${bytes < 0 ? '-' : ''}${size} ${sizes[i]}`;
    }
}

// Export for use in other test files
module.exports = {
    PerformanceComparisonBenchmark,
    runPerformanceComparison: async () => {
        const benchmark = new PerformanceComparisonBenchmark();
        return await benchmark.runComparison();
    }
};

// Run comparison if this file is executed directly
if (require.main === module) {
    const benchmark = new PerformanceComparisonBenchmark();
    benchmark.runComparison().then(results => {
        const hasErrors = results.benchmarks.some(b => 
            (b.go && b.go.error) || (b.javascript && b.javascript.error)
        );
        process.exit(hasErrors ? 1 : 0);
    }).catch(error => {
        console.error("Performance comparison failed:", error);
        process.exit(1);
    });
}