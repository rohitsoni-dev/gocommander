# GoCommander Integration Tests

This directory contains comprehensive integration tests for the GoCommander C++ addon bridge, specifically designed to verify the integration between the Go backend and Node.js frontend.

## Test Files

### `cpp-addon-bridge-integration-test.js`

This is the main integration test suite that covers task 2.4 requirements:

- **Test Go library loading on different platforms**
- **Verify function export/import mechanisms** 
- **Test error handling and memory management**

#### Test Groups

##### 1. Platform-Specific Library Loading Tests
- **Windows DLL Detection**: Tests Windows-specific DLL loading paths and error handling
- **Unix Static Linking**: Tests Unix-specific static library symbol resolution
- **Cross-Platform Consistency**: Verifies consistent behavior across platforms

##### 2. Function Export/Import Mechanism Tests
- **Go Function Export Verification**: Ensures all expected Go functions are properly exported
- **Function Import and Binding Verification**: Tests the C++ addon's ability to bind to Go functions
- **Data Marshaling**: Tests data conversion between JavaScript, C++, and Go

##### 3. Error Handling and Memory Management Tests
- **Error Propagation**: Tests error handling from Go through C++ to JavaScript
- **Memory Management and Cleanup**: Tests command lifecycle and memory cleanup
- **Exception Safety**: Tests that the addon doesn't crash on invalid inputs

##### 4. Platform-Specific Integration Tests
- **Windows DLL Symbol Export**: Tests Windows-specific symbol export verification
- **Unix Static Library Symbol Resolution**: Tests Unix-specific symbol resolution
- **Cross-Platform Function Signature Consistency**: Ensures consistent function signatures

##### 5. Advanced Memory Management and Performance Tests
- **Memory Leak Detection**: Tests for memory leaks with repeated operations
- **Concurrent Access Simulation**: Tests thread safety and concurrent access
- **Large Data Handling**: Tests handling of large strings and arrays

## Running Tests

### Individual Test Suites

```bash
# Run basic functionality tests
npm run test

# Run C++ addon bridge integration tests
npm run test:integration

# Run all tests
npm run test:all

# Run advanced tests
npm run advanced-test
```

### Test Configuration

The integration tests support several configuration options via environment variables:

```bash
# Enable verbose output
TEST_VERBOSE=true npm run test:integration

# Set custom timeout (default: 10000ms)
TEST_TIMEOUT=15000 npm run test:integration
```

## Test Results Interpretation

### Expected Behavior

#### When Go Backend is Available
- All tests should pass
- Functions should return success results
- Memory management tests should complete without leaks
- Performance tests should show Go backend performance benefits

#### When Go Backend is Unavailable
- Tests should still pass but with graceful degradation
- Functions should return error results or throw exceptions (not crash)
- Platform-specific tests should detect and report the unavailability
- Fallback mechanisms should be tested

### Common Test Scenarios

#### Scenario 1: Fresh Installation
- Go DLL/library may not be built yet
- Tests should pass but report Go backend unavailable
- All addon functions should still exist and be callable

#### Scenario 2: Build Issues
- Platform-specific loading tests will identify the specific issue
- Error messages should provide troubleshooting guidance
- Tests should not crash the Node.js process

#### Scenario 3: Successful Integration
- All tests should pass with Go backend available
- Performance and memory tests should demonstrate Go backend benefits
- Cross-platform tests should verify consistent behavior

## Test Coverage

The integration tests cover the following requirements from the specification:

### Requirement 2.2 (N-API Wrapper Functions)
- ✅ Tests all N-API wrapper functions (createCommand, addOption, etc.)
- ✅ Verifies proper data conversion between JavaScript and C++
- ✅ Tests function availability and signature consistency

### Requirement 2.3 (Error Handling and Data Marshaling)
- ✅ Tests error propagation from Go through C++ to JavaScript
- ✅ Verifies string conversion between JavaScript, C++, and Go
- ✅ Tests memory management for cross-language data transfer

### Requirement 2.4 (Memory Management)
- ✅ Tests memory allocation and cleanup
- ✅ Verifies reference counting mechanisms
- ✅ Tests for memory leaks with repeated operations

## Troubleshooting

### Common Issues

#### "Go backend not available" Errors
This is expected when:
- Go DLL/library hasn't been built yet
- Build process failed
- Platform-specific loading issues

**Solution**: Run `npm run go:build` or `npm run build` to build the Go backend.

#### Function Not Found Errors
This indicates:
- C++ addon compilation issues
- Missing function exports
- Version mismatch between addon and tests

**Solution**: Rebuild the addon with `npm run rebuild`.

#### Memory or Performance Test Failures
This may indicate:
- Memory leaks in the Go backend
- Thread safety issues
- Performance regressions

**Solution**: Review Go backend implementation and C++ memory management.

### Debug Mode

To run tests with maximum verbosity and debugging information:

```bash
TEST_VERBOSE=true node test/cpp-addon-bridge-integration-test.js
```

This will show:
- Detailed platform detection information
- Function call results and error messages
- Memory usage patterns
- Performance metrics

## Contributing

When adding new integration tests:

1. Follow the existing test structure and naming conventions
2. Use the `IntegrationTestRunner` class for consistency
3. Include proper error handling and cleanup
4. Add appropriate skip conditions for platform-specific tests
5. Document the test purpose and expected behavior
6. Ensure tests work both with and without Go backend availability

### Test Categories

- **Platform Tests**: Use `skipIf` conditions for platform-specific behavior
- **Memory Tests**: Include cleanup and leak detection
- **Error Tests**: Test both success and failure scenarios
- **Performance Tests**: Include reasonable timeouts and limits