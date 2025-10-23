#!/usr/bin/env node

/**
 * Test for GoCommander error messaging when gommander.dll is missing
 * This test validates that error messages clearly indicate the missing DLL
 * and provides appropriate troubleshooting guidance
 */

const fs = require('fs');
const path = require('path');

console.log('=== Error Messaging Validation Test ===\n');

// Check if gommander.dll exists in root directory
const dllPath = path.join(__dirname, '..', 'gommander.dll');
const backupPath = path.join(__dirname, '..', 'gommander.dll.backup');

let testResults = {
  dllMissingDetected: false,
  errorMessagesClear: false,
  troubleshootingProvided: false,
  fallbackFunctional: false,
  specificGuidanceProvided: false
};

console.log('Step 1: Ensure gommander.dll is missing for this test');
let dllWasPresent = false;

try {
  if (fs.existsSync(dllPath)) {
    dllWasPresent = true;
    fs.renameSync(dllPath, backupPath);
    console.log('✅ Temporarily moved gommander.dll for testing');
  } else {
    console.log('✅ gommander.dll already missing - perfect for testing');
  }
} catch (error) {
  console.error('❌ Error managing DLL file:', error.message);
  process.exit(1);
}

console.log('\nStep 2: Capture and analyze error messages');
try {
  // Clear require cache to force fresh load
  const indexPath = path.join(__dirname, '..', 'index.js');
  delete require.cache[require.resolve(indexPath)];
  
  // Capture all console output
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const capturedOutput = [];
  
  const captureFunction = (type) => (...args) => {
    const message = args.join(' ');
    capturedOutput.push({ type, message });
    
    // Still output to console for visibility
    if (type === 'warn') originalConsoleWarn(...args);
    else if (type === 'log') originalConsoleLog(...args);
    else if (type === 'error') originalConsoleError(...args);
  };
  
  console.warn = captureFunction('warn');
  console.log = captureFunction('log');
  console.error = captureFunction('error');
  
  // Load GoCommander without DLL
  console.log('Loading GoCommander to capture error messages...');
  const { Command, program, FallbackSystem, isGoBackendAvailable } = require('../index.js');
  
  // Restore console functions
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  
  console.log('\nStep 3: Analyze captured error messages');
  
  // Check for DLL-specific error messages
  const dllErrorMessages = capturedOutput.filter(output => 
    output.message.toLowerCase().includes('dll') ||
    output.message.toLowerCase().includes('gommander.dll') ||
    output.message.includes('Failed to load') ||
    output.message.includes('error 126') ||
    output.message.includes('error 193')
  );
  
  if (dllErrorMessages.length > 0) {
    testResults.dllMissingDetected = true;
    console.log('✅ DLL-specific error messages detected');
    console.log('   Sample messages:');
    dllErrorMessages.slice(0, 3).forEach(msg => {
      console.log(`   - ${msg.message.substring(0, 80)}...`);
    });
  } else {
    console.log('❌ No DLL-specific error messages found');
  }
  
  // Check for clear error explanations
  const clearErrorMessages = capturedOutput.filter(output =>
    output.message.includes('Go backend unavailable') ||
    output.message.includes('DLL loading issue') ||
    output.message.includes('Check if gommander.dll exists') ||
    output.message.includes('JavaScript fallback')
  );
  
  if (clearErrorMessages.length > 0) {
    testResults.errorMessagesClear = true;
    console.log('✅ Clear error explanations provided');
  } else {
    console.log('❌ Error messages lack clear explanations');
  }
  
  // Check for troubleshooting guidance
  const troubleshootingMessages = capturedOutput.filter(output =>
    output.message.includes('npm run build') ||
    output.message.includes('troubleshooting') ||
    output.message.includes('Check if') ||
    output.message.includes('Verify') ||
    output.message.includes('💡')
  );
  
  if (troubleshootingMessages.length > 0) {
    testResults.troubleshootingProvided = true;
    console.log('✅ Troubleshooting guidance provided in error messages');
  } else {
    console.log('❌ No troubleshooting guidance in error messages');
  }
  
  console.log('\nStep 4: Test detailed diagnostic functions');
  
  try {
    // Test FallbackSystem diagnostics
    const backendStatus = FallbackSystem.getBackendStatus();
    console.log('Backend Status Analysis:');
    console.log(`  Go Backend Available: ${backendStatus.goBackendAvailable}`);
    console.log(`  Addon Loaded: ${backendStatus.addonLoaded}`);
    console.log(`  Has Error: ${!!backendStatus.addonLoadError}`);
    
    if (backendStatus.addonLoadError) {
      console.log(`  Error Message: ${backendStatus.addonLoadError.substring(0, 100)}...`);
    }
    
    // Test troubleshooting guidance function
    const guidance = FallbackSystem.getTroubleshootingGuidance();
    
    if (guidance.steps && guidance.steps.length > 0) {
      console.log('\n✅ Detailed troubleshooting steps available:');
      guidance.steps.slice(0, 5).forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
      testResults.troubleshootingProvided = true;
    }
    
    if (guidance.commonIssues && guidance.commonIssues.length > 0) {
      console.log('\n✅ Common issues identified:');
      guidance.commonIssues.slice(0, 3).forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (guidance.quickFixes && guidance.quickFixes.length > 0) {
      console.log('\n✅ Quick fixes suggested:');
      guidance.quickFixes.slice(0, 3).forEach(fix => {
        console.log(`   • ${fix}`);
      });
    }
    
    // Check for platform-specific guidance
    if (guidance.platformSpecific && guidance.platformSpecific.length > 0) {
      testResults.specificGuidanceProvided = true;
      console.log('\n✅ Platform-specific guidance provided:');
      guidance.platformSpecific.slice(0, 2).forEach(guide => {
        console.log(`   • ${guide}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error testing diagnostic functions:', error.message);
  }
  
  console.log('\nStep 5: Test application functionality in fallback mode');
  
  try {
    // Test that the application remains functional
    const testCmd = new Command('error-test');
    testCmd
      .description('Test command for error messaging validation')
      .option('-v, --verbose', 'Verbose output')
      .option('-f, --file <path>', 'Input file path')
      .argument('<action>', 'Action to perform')
      .action((args, options) => {
        console.log('   Action executed successfully in fallback mode');
        console.log(`   Args: ${JSON.stringify(args)}`);
        console.log(`   Options: ${JSON.stringify(options)}`);
      });
    
    // Test parsing with mock arguments
    const mockArgv = ['node', 'script.js', '--verbose', '--file', 'test.txt', 'process'];
    testCmd.parse(mockArgv);
    
    testResults.fallbackFunctional = true;
    console.log('✅ Application remains functional in fallback mode');
    
    // Test help generation
    console.log('\nTesting help generation with missing DLL:');
    console.log('--- Help Output Start ---');
    testCmd.outputHelp();
    console.log('--- Help Output End ---');
    
  } catch (error) {
    console.log('❌ Application functionality impaired:', error.message);
  }
  
  console.log('\nStep 6: Validate error message quality');
  
  // Analyze the quality of error messages
  const allMessages = capturedOutput.map(output => output.message).join(' ');
  
  const qualityChecks = {
    mentionsDLL: allMessages.toLowerCase().includes('gommander.dll'),
    mentionsLocation: allMessages.includes('root directory') || allMessages.includes('src/'),
    mentionsBuild: allMessages.includes('npm run build') || allMessages.includes('build'),
    mentionsFallback: allMessages.includes('fallback') || allMessages.includes('JavaScript'),
    providesSteps: allMessages.includes('1.') || allMessages.includes('Check') || allMessages.includes('Verify'),
    showsErrorCodes: allMessages.includes('error 126') || allMessages.includes('error 193') || allMessages.includes('Windows error')
  };
  
  const qualityScore = Object.values(qualityChecks).filter(check => check).length;
  const totalChecks = Object.keys(qualityChecks).length;
  
  console.log(`Error Message Quality Score: ${qualityScore}/${totalChecks}`);
  console.log('Quality Checks:');
  Object.entries(qualityChecks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check}: ${passed}`);
  });
  
  if (qualityScore >= totalChecks * 0.8) {
    console.log('✅ Error messages meet quality standards');
  } else {
    console.log('❌ Error messages need improvement');
  }
  
} catch (error) {
  console.error('❌ Error during error message testing:', error.message);
} finally {
  // Restore DLL if it was present
  console.log('\nStep 7: Restore original state');
  try {
    if (dllWasPresent && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, dllPath);
      console.log('✅ Successfully restored gommander.dll');
    } else if (!dllWasPresent) {
      console.log('✅ DLL was not present originally - no restoration needed');
    }
  } catch (error) {
    console.error('❌ Failed to restore DLL:', error.message);
    if (dllWasPresent) {
      console.error('   Manual action required: rename gommander.dll.backup to gommander.dll');
    }
  }
}

console.log('\n=== Error Messaging Test Results ===');
console.log(`DLL Missing Detected: ${testResults.dllMissingDetected ? '✅' : '❌'}`);
console.log(`Error Messages Clear: ${testResults.errorMessagesClear ? '✅' : '❌'}`);
console.log(`Troubleshooting Provided: ${testResults.troubleshootingProvided ? '✅' : '❌'}`);
console.log(`Fallback Functional: ${testResults.fallbackFunctional ? '✅' : '❌'}`);
console.log(`Specific Guidance Provided: ${testResults.specificGuidanceProvided ? '✅' : '❌'}`);

const passedTests = Object.values(testResults).filter(result => result === true).length;
const totalTests = Object.keys(testResults).length;

console.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All error messaging tests passed! Messages are clear and helpful.');
} else {
  console.log('⚠️  Some error messaging tests failed. Review the output above for details.');
  process.exit(1);
}