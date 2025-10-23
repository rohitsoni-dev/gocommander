#!/usr/bin/env node

/**
 * Test for GoCommander behavior when gommander.dll is missing
 * This test temporarily renames the DLL to simulate missing DLL scenario
 * and verifies that appropriate error messages are shown and JavaScript fallback works
 */

const fs = require('fs');
const path = require('path');

console.log('=== Missing DLL Test ===\n');

// Check if gommander.dll exists in root directory
const dllPath = path.join(__dirname, '..', 'gommander.dll');
const backupPath = path.join(__dirname, '..', 'gommander.dll.backup');

let dllExists = false;
let testResults = {
  dllFound: false,
  dllRenamed: false,
  fallbackActivated: false,
  errorMessagesCorrect: false,
  functionalityWorking: false,
  dllRestored: false
};

console.log('Step 1: Check if gommander.dll exists');
try {
  if (fs.existsSync(dllPath)) {
    dllExists = true;
    testResults.dllFound = true;
    console.log('✅ gommander.dll found in root directory');
  } else {
    console.log('❌ gommander.dll not found in root directory');
    console.log('   This test requires gommander.dll to be present first');
    console.log('   Please build the project with: npm run build');
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking for DLL:', error.message);
  process.exit(1);
}

console.log('\nStep 2: Temporarily rename gommander.dll to simulate missing DLL');
try {
  fs.renameSync(dllPath, backupPath);
  testResults.dllRenamed = true;
  console.log('✅ Successfully renamed gommander.dll to gommander.dll.backup');
} catch (error) {
  console.error('❌ Failed to rename DLL:', error.message);
  process.exit(1);
}

console.log('\nStep 3: Test GoCommander behavior without DLL');
try {
  // Clear require cache to force fresh load
  const indexPath = path.join(__dirname, '..', 'index.js');
  delete require.cache[require.resolve(indexPath)];
  
  // Capture console output to verify error messages
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  const capturedOutput = [];
  
  console.warn = (...args) => {
    capturedOutput.push({ type: 'warn', message: args.join(' ') });
    originalConsoleWarn(...args);
  };
  
  console.log = (...args) => {
    capturedOutput.push({ type: 'log', message: args.join(' ') });
    originalConsoleLog(...args);
  };
  
  // Load GoCommander without DLL
  console.log('Loading GoCommander without gommander.dll...');
  const { Command, program, hello, version, isGoBackendAvailable, FallbackSystem } = require('../index.js');
  
  // Restore console functions
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  
  console.log('\nStep 4: Verify fallback activation and error messages');
  
  // Check if Go backend is available (should be false)
  const goAvailable = isGoBackendAvailable();
  if (!goAvailable) {
    testResults.fallbackActivated = true;
    console.log('✅ JavaScript fallback correctly activated');
  } else {
    console.log('❌ Go backend incorrectly reports as available');
  }
  
  // Check for appropriate error messages in captured output
  const hasAddonLoadError = capturedOutput.some(output => 
    output.message.includes('Go addon loading failed') ||
    output.message.includes('using JavaScript fallback') ||
    output.message.includes('DLL') ||
    output.message.includes('gommander.dll')
  );
  
  const hasFallbackWarning = capturedOutput.some(output =>
    output.message.includes('JavaScript fallback') ||
    output.message.includes('fallback mode')
  );
  
  if (hasAddonLoadError && hasFallbackWarning) {
    testResults.errorMessagesCorrect = true;
    console.log('✅ Appropriate error messages displayed');
  } else {
    console.log('❌ Missing expected error messages');
    console.log('Expected: DLL loading errors and fallback warnings');
  }
  
  console.log('\nStep 5: Test JavaScript fallback functionality');
  
  // Test basic functions with fallback
  try {
    const helloResult = hello();
    const versionResult = version();
    
    // Functions should work even if not explicitly showing "fallback" in output
    // The key is that they return valid responses when Go backend is unavailable
    if (helloResult && versionResult) {
      console.log('✅ Basic functions work when Go backend unavailable');
      console.log(`   hello(): ${helloResult}`);
      console.log(`   version(): ${versionResult}`);
    } else {
      console.log('❌ Basic functions failed when Go backend unavailable');
    }
    
    // Test command creation in fallback mode
    const testCmd = new Command('test-fallback');
    testCmd
      .description('Test command in fallback mode')
      .option('-t, --test <value>', 'Test option', 'default')
      .argument('<file>', 'Test argument');
    
    if (testCmd._name === 'test-fallback' && testCmd._options.has('test')) {
      console.log('✅ Command creation works in fallback mode');
      testResults.functionalityWorking = true;
    } else {
      console.log('❌ Command creation failed in fallback mode');
    }
    
    // Test help generation in fallback mode
    console.log('\nTesting help generation in fallback mode:');
    console.log('--- Help Output Start ---');
    testCmd.outputHelp();
    console.log('--- Help Output End ---');
    
    // Test argument parsing in fallback mode
    console.log('\nTesting argument parsing in fallback mode...');
    const mockArgv = ['node', 'script.js', '--test', 'value', 'filename.txt'];
    testCmd.parse(mockArgv);
    console.log('✅ Argument parsing works in fallback mode');
    
  } catch (error) {
    console.log('❌ JavaScript fallback functionality failed:', error.message);
  }
  
  console.log('\nStep 6: Test diagnostic functions');
  try {
    const backendStatus = FallbackSystem.getBackendStatus();
    console.log('Backend Status:', {
      goBackendAvailable: backendStatus.goBackendAvailable,
      addonLoaded: backendStatus.addonLoaded,
      hasError: !!backendStatus.addonLoadError
    });
    
    // In this case, addon loads but Go backend is unavailable due to missing DLL
    if (!backendStatus.goBackendAvailable && backendStatus.addonLoaded) {
      console.log('✅ Diagnostic functions correctly report missing DLL state');
    } else {
      console.log('❌ Diagnostic functions not correctly reporting state');
      console.log('   Expected: addonLoaded=true, goBackendAvailable=false');
    }
    
    // Test troubleshooting guidance
    console.log('\nTroubleshooting guidance:');
    const guidance = FallbackSystem.getTroubleshootingGuidance();
    if (guidance.steps.length > 0) {
      console.log('✅ Troubleshooting guidance available');
      guidance.steps.slice(0, 3).forEach(step => console.log(`   ${step}`));
    } else {
      console.log('❌ No troubleshooting guidance provided');
    }
    
  } catch (error) {
    console.log('❌ Diagnostic functions failed:', error.message);
  }
  
} catch (error) {
  console.error('❌ Error during fallback testing:', error.message);
} finally {
  // Always restore the DLL
  console.log('\nStep 7: Restore gommander.dll');
  try {
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, dllPath);
      testResults.dllRestored = true;
      console.log('✅ Successfully restored gommander.dll');
    } else {
      console.log('❌ Backup file not found, cannot restore DLL');
    }
  } catch (error) {
    console.error('❌ Failed to restore DLL:', error.message);
    console.error('   Manual action required: rename gommander.dll.backup to gommander.dll');
  }
}

console.log('\n=== Test Results Summary ===');
console.log(`DLL Found: ${testResults.dllFound ? '✅' : '❌'}`);
console.log(`DLL Renamed: ${testResults.dllRenamed ? '✅' : '❌'}`);
console.log(`Fallback Activated: ${testResults.fallbackActivated ? '✅' : '❌'}`);
console.log(`Error Messages Correct: ${testResults.errorMessagesCorrect ? '✅' : '❌'}`);
console.log(`Functionality Working: ${testResults.functionalityWorking ? '✅' : '❌'}`);
console.log(`DLL Restored: ${testResults.dllRestored ? '✅' : '❌'}`);

const passedTests = Object.values(testResults).filter(result => result === true).length;
const totalTests = Object.keys(testResults).length;

console.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! GoCommander correctly handles missing DLL scenario.');
} else {
  console.log('⚠️  Some tests failed. Review the output above for details.');
  process.exit(1);
}