const { runPerformanceBenchmarks } = require('./performance-benchmark-test.js');
const { runPerformanceComparison } = require('./performance-comparison-benchmark.js');
const { runDiagnostics } = require('./diagnostic-utility.js');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Performance and Diagnostics Suite
 * 
 * This suite implements task 5.2 requirements:
 * - Implement benchmarks comparing Go vs JavaScript parsing performance
 * - Add memory usage monitoring and reporting
 * - Create diagnostic tools for troubleshooting integration issues
 * 
 * Requirements: 4.4
 */

console.log("=== GoCommander Comprehensive Performance & Diagnostics Suite ===\n");

class ComprehensivePerformanceSuite {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            suite: 'comprehensive-performance-diagnostics',
            version: '1.0.0',
            diagnostics: null,
            benchmarks: null,
            comparison: null,
            summary: {},
            recommendations: [],
            reportPath: null
        };
    }

    async runFullSuite() {
        console.log("🚀 Starting comprehensive performance and diagnostics suite...\n");
        
        const startTime = Date.now();
        
        try {
            // Step 1: Run diagnostics first to understand system state
            console.log("📋 Step 1: Running system diagnostics...");
            this.results.diagnostics = await this.runDiagnosticsWithErrorHandling();
            
            // Step 2: Run basic performance benchmarks
            console.log("\n⚡ Step 2: Running performance benchmarks...");
            this.results.benchmarks = await this.runBenchmarksWithErrorHandling();
            
            // Step 3: Run Go vs JavaScript comparison
            console.log("\n🔄 Step 3: Running Go vs JavaScript comparison...");
            this.results.comparison = await this.runComparisonWithErrorHandling();
            
            // Step 4: Analyze results and generate summary
            console.log("\n📊 Step 4: Analyzing results...");
            this.analyzeResults();
            
            // Step 5: Generate comprehensive report
            console.log("\n📝 Step 5: Generating comprehensive report...");
            await this.generateReport();
            
            const totalTime = Date.now() - startTime;
            console.log(`\n✅ Suite completed in ${totalTime}ms`);
            
            this.printExecutiveSummary();
            
            return this.results;
            
        } catch (error) {
            console.error(`\n❌ Suite failed: ${error.message}`);
            this.results.error = error.message;
            throw error;
        }
    }

    async runDiagnosticsWithErrorHandling() {
        try {
            return await runDiagnostics();
        } catch (error) {
            console.warn(`   ⚠️  Diagnostics failed: ${error.message}`);
            return { error: error.message, partial: true };
        }
    }

    async runBenchmarksWithErrorHandling() {
        try {
            return await runPerformanceBenchmarks();
        } catch (error) {
            console.warn(`   ⚠️  Benchmarks failed: ${error.message}`);
            return { error: error.message, partial: true };
        }
    }

    async runComparisonWithErrorHandling() {
        try {
            return await runPerformanceComparison();
        } catch (error) {
            console.warn(`   ⚠️  Comparison failed: ${error.message}`);
            return { error: error.message, partial: true };
        }
    }

    analyzeResults() {
        const summary = {
            systemHealth: 'unknown',
            performanceGrade: 'unknown',
            goBackendStatus: 'unknown',
            memoryEfficiency: 'unknown',
            overallAssessment: 'unknown',
            criticalIssues: [],
            strengths: [],
            improvements: []
        };

        // Analyze diagnostics
        if (this.results.diagnostics && !this.results.diagnostics.error) {
            const diag = this.results.diagnostics;
            
            // System health
            const passedTests = diag.tests ? diag.tests.filter(t => t.success).length : 0;
            const totalTests = diag.tests ? diag.tests.length : 0;
            const testPassRate = totalTests > 0 ? (passedTests / totalTests) : 0;
            
            if (testPassRate >= 0.9) summary.systemHealth = 'excellent';
            else if (testPassRate >= 0.7) summary.systemHealth = 'good';
            else if (testPassRate >= 0.5) summary.systemHealth = 'fair';
            else summary.systemHealth = 'poor';
            
            // Go backend status
            summary.goBackendStatus = diag.backend?.goBackendAvailable ? 'available' : 'unavailable';
            
            if (!diag.backend?.goBackendAvailable) {
                summary.criticalIssues.push('Go backend unavailable - performance benefits not accessible');
            }
        }

        // Analyze performance benchmarks
        if (this.results.benchmarks && !this.results.benchmarks.error) {
            const benchmarks = Array.isArray(this.results.benchmarks) ? this.results.benchmarks : [];
            const successfulBenchmarks = benchmarks.filter(b => b.success);
            const benchmarkSuccessRate = benchmarks.length > 0 ? 
                (successfulBenchmarks.length / benchmarks.length) : 0;
            
            if (benchmarkSuccessRate >= 0.9) summary.performanceGrade = 'A';
            else if (benchmarkSuccessRate >= 0.8) summary.performanceGrade = 'B';
            else if (benchmarkSuccessRate >= 0.6) summary.performanceGrade = 'C';
            else if (benchmarkSuccessRate >= 0.4) summary.performanceGrade = 'D';
            else summary.performanceGrade = 'F';
            
            // Check for performance issues
            const slowBenchmarks = successfulBenchmarks.filter(b => 
                parseFloat(b.avgTime) > 100 // More than 100ms average
            );
            
            if (slowBenchmarks.length > 0) {
                summary.criticalIssues.push(`${slowBenchmarks.length} benchmarks showing slow performance (>100ms)`);
            } else {
                summary.strengths.push('All benchmarks performing within acceptable limits');
            }
        }

        // Analyze Go vs JavaScript comparison
        if (this.results.comparison && !this.results.comparison.error) {
            const comp = this.results.comparison;
            
            if (comp.comparison && comp.comparison.overallWinner === 'go') {
                summary.strengths.push(`Go backend provides ${comp.comparison.performance.speedupFormatted} performance advantage`);
            } else if (comp.comparison && comp.comparison.overallWinner === 'javascript') {
                summary.improvements.push('Consider optimizing Go backend or using JavaScript for better performance');
            }
            
            // Memory efficiency analysis
            const memoryIssues = comp.benchmarks ? comp.benchmarks.filter(b => 
                (b.go?.memoryAnalysis?.growthRate?.rssPerSecond > 1024 * 1024) ||
                (b.javascript?.memoryAnalysis?.growthRate?.rssPerSecond > 1024 * 1024)
            ).length : 0;
            
            if (memoryIssues === 0) {
                summary.memoryEfficiency = 'excellent';
                summary.strengths.push('No memory leaks detected in performance tests');
            } else if (memoryIssues <= 2) {
                summary.memoryEfficiency = 'good';
                summary.improvements.push('Minor memory growth detected in some scenarios');
            } else {
                summary.memoryEfficiency = 'poor';
                summary.criticalIssues.push('Significant memory growth detected - potential leaks');
            }
        }

        // Overall assessment
        const criticalCount = summary.criticalIssues.length;
        const strengthCount = summary.strengths.length;
        
        if (criticalCount === 0 && strengthCount >= 2) {
            summary.overallAssessment = 'excellent';
        } else if (criticalCount <= 1 && strengthCount >= 1) {
            summary.overallAssessment = 'good';
        } else if (criticalCount <= 2) {
            summary.overallAssessment = 'fair';
        } else {
            summary.overallAssessment = 'poor';
        }

        // Generate recommendations
        this.generateRecommendations(summary);
        
        this.results.summary = summary;
    }

    generateRecommendations(summary) {
        const recommendations = [];

        // Critical issues
        if (summary.criticalIssues.length > 0) {
            recommendations.push({
                type: 'critical',
                priority: 'high',
                title: 'Critical Issues Detected',
                items: summary.criticalIssues,
                actions: [
                    'Address critical issues immediately',
                    'Run diagnostics to identify root causes',
                    'Consider reverting to known good configuration'
                ]
            });
        }

        // Go backend recommendations
        if (summary.goBackendStatus === 'unavailable') {
            recommendations.push({
                type: 'setup',
                priority: 'medium',
                title: 'Go Backend Setup',
                items: ['Go backend not available'],
                actions: [
                    'Run "npm run build" to build the addon',
                    'Ensure Go is installed and accessible',
                    'Check build dependencies (node-gyp, build tools)'
                ]
            });
        } else if (summary.goBackendStatus === 'available') {
            recommendations.push({
                type: 'optimization',
                priority: 'low',
                title: 'Performance Optimization',
                items: ['Go backend is available and working'],
                actions: [
                    'Consider using Go backend for production workloads',
                    'Monitor performance in production environment',
                    'Benchmark with real-world data'
                ]
            });
        }

        // Memory recommendations
        if (summary.memoryEfficiency === 'poor') {
            recommendations.push({
                type: 'memory',
                priority: 'high',
                title: 'Memory Management',
                items: ['Memory leaks or high growth detected'],
                actions: [
                    'Profile memory usage in production',
                    'Implement proper cleanup procedures',
                    'Consider memory limits and monitoring'
                ]
            });
        }

        // Performance recommendations
        if (summary.performanceGrade === 'D' || summary.performanceGrade === 'F') {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                title: 'Performance Issues',
                items: ['Multiple benchmarks failing or performing poorly'],
                actions: [
                    'Profile slow operations',
                    'Optimize critical code paths',
                    'Consider algorithmic improvements'
                ]
            });
        }

        // System recommendations
        if (summary.systemHealth === 'poor' || summary.systemHealth === 'fair') {
            recommendations.push({
                type: 'system',
                priority: 'medium',
                title: 'System Health',
                items: ['System integration tests failing'],
                actions: [
                    'Check system dependencies',
                    'Verify installation integrity',
                    'Update to latest stable versions'
                ]
            });
        }

        this.results.recommendations = recommendations;
    }

    async generateReport() {
        const reportData = {
            metadata: {
                timestamp: this.results.timestamp,
                suite: this.results.suite,
                version: this.results.version,
                duration: Date.now() - new Date(this.results.timestamp).getTime()
            },
            summary: this.results.summary,
            recommendations: this.results.recommendations,
            diagnostics: this.results.diagnostics,
            benchmarks: this.results.benchmarks,
            comparison: this.results.comparison
        };

        // Generate JSON report
        const reportDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(reportDir, `performance-report-${timestamp}.json`);
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
            this.results.reportPath = reportPath;
            console.log(`   📄 Report saved to: ${reportPath}`);
        } catch (error) {
            console.warn(`   ⚠️  Failed to save report: ${error.message}`);
        }

        // Generate human-readable summary
        const summaryPath = path.join(reportDir, `performance-summary-${timestamp}.txt`);
        try {
            const summaryText = this.generateTextSummary();
            fs.writeFileSync(summaryPath, summaryText);
            console.log(`   📄 Summary saved to: ${summaryPath}`);
        } catch (error) {
            console.warn(`   ⚠️  Failed to save summary: ${error.message}`);
        }
    }

    generateTextSummary() {
        const lines = [];
        
        lines.push('GoCommander Performance & Diagnostics Report');
        lines.push('='.repeat(50));
        lines.push(`Generated: ${this.results.timestamp}`);
        lines.push('');
        
        // Executive Summary
        lines.push('EXECUTIVE SUMMARY');
        lines.push('-'.repeat(20));
        lines.push(`Overall Assessment: ${this.results.summary.overallAssessment.toUpperCase()}`);
        lines.push(`System Health: ${this.results.summary.systemHealth}`);
        lines.push(`Performance Grade: ${this.results.summary.performanceGrade}`);
        lines.push(`Go Backend: ${this.results.summary.goBackendStatus}`);
        lines.push(`Memory Efficiency: ${this.results.summary.memoryEfficiency}`);
        lines.push('');
        
        // Strengths
        if (this.results.summary.strengths.length > 0) {
            lines.push('STRENGTHS');
            lines.push('-'.repeat(20));
            this.results.summary.strengths.forEach(strength => {
                lines.push(`✓ ${strength}`);
            });
            lines.push('');
        }
        
        // Critical Issues
        if (this.results.summary.criticalIssues.length > 0) {
            lines.push('CRITICAL ISSUES');
            lines.push('-'.repeat(20));
            this.results.summary.criticalIssues.forEach(issue => {
                lines.push(`✗ ${issue}`);
            });
            lines.push('');
        }
        
        // Recommendations
        if (this.results.recommendations.length > 0) {
            lines.push('RECOMMENDATIONS');
            lines.push('-'.repeat(20));
            this.results.recommendations.forEach((rec, index) => {
                lines.push(`${index + 1}. ${rec.title} (${rec.priority} priority)`);
                rec.actions.forEach(action => {
                    lines.push(`   - ${action}`);
                });
                lines.push('');
            });
        }
        
        return lines.join('\n');
    }

    printExecutiveSummary() {
        console.log("\n" + "=".repeat(70));
        console.log("EXECUTIVE SUMMARY");
        console.log("=".repeat(70));
        
        const summary = this.results.summary;
        
        console.log(`\n🎯 Overall Assessment: ${summary.overallAssessment.toUpperCase()}`);
        console.log(`📊 Performance Grade: ${summary.performanceGrade}`);
        console.log(`🏥 System Health: ${summary.systemHealth}`);
        console.log(`⚡ Go Backend: ${summary.goBackendStatus}`);
        console.log(`💾 Memory Efficiency: ${summary.memoryEfficiency}`);
        
        if (summary.strengths.length > 0) {
            console.log(`\n✅ Strengths (${summary.strengths.length}):`);
            summary.strengths.forEach(strength => {
                console.log(`   • ${strength}`);
            });
        }
        
        if (summary.criticalIssues.length > 0) {
            console.log(`\n❌ Critical Issues (${summary.criticalIssues.length}):`);
            summary.criticalIssues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
        }
        
        if (this.results.recommendations.length > 0) {
            console.log(`\n💡 Top Recommendations:`);
            this.results.recommendations.slice(0, 3).forEach((rec, index) => {
                const priority = rec.priority === 'high' ? '🔴' : 
                               rec.priority === 'medium' ? '🟡' : '🟢';
                console.log(`   ${index + 1}. ${priority} ${rec.title}`);
            });
        }
        
        if (this.results.reportPath) {
            console.log(`\n📄 Full report: ${this.results.reportPath}`);
        }
        
        console.log("\n" + "=".repeat(70));
    }
}

// Export for use in other test files
module.exports = {
    ComprehensivePerformanceSuite,
    runComprehensiveSuite: async () => {
        const suite = new ComprehensivePerformanceSuite();
        return await suite.runFullSuite();
    }
};

// Run suite if this file is executed directly
if (require.main === module) {
    const suite = new ComprehensivePerformanceSuite();
    suite.runFullSuite().then(results => {
        const hasErrors = results.error || 
                         results.summary.criticalIssues.length > 0 ||
                         results.summary.overallAssessment === 'poor';
        process.exit(hasErrors ? 1 : 0);
    }).catch(error => {
        console.error("Comprehensive suite failed:", error);
        process.exit(1);
    });
}