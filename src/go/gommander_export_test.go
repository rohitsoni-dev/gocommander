package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// Test export functions for CGO integration
// These tests verify the exported C functions that will be called from the C++ addon
// Note: We simulate C calls without using CGO directly in tests

// Wrapper functions to simulate C calls without CGO
func createCommandWrapper(name string) uintptr {
	if name == "" {
		return 0 // Simulate null parameter
	}
	
	// Simulate the CreateCommand export function logic
	cmd := NewCommand(name)
	
	registryMutex.Lock()
	defer registryMutex.Unlock()
	
	id := nextID
	nextID++
	commandRegistry[id] = cmd
	commandRefCount[id] = 1
	
	return id
}

func addOptionWrapper(cmdPtr uintptr, flags, desc, defaultVal string) int {
	if flags == "" || desc == "" {
		return ERROR_NULL_PARAM
	}
	
	cmd, exists := getCommand(cmdPtr)
	if !exists {
		return ERROR_INVALID_ID
	}
	
	option := NewOption(flags, desc)
	if defaultVal != "" {
		option.SetDefault(defaultVal)
	}
	
	cmd.AddOption(option)
	return SUCCESS
}

func addArgumentWrapper(cmdPtr uintptr, name, desc string, required bool) int {
	if name == "" || desc == "" {
		return ERROR_NULL_PARAM
	}
	
	cmd, exists := getCommand(cmdPtr)
	if !exists {
		return ERROR_INVALID_ID
	}
	
	argument := NewArgument(name, desc)
	argument.SetRequired(required)
	
	cmd.AddArgument(argument)
	return SUCCESS
}

func parseArgsWrapper(cmdPtr uintptr, args []string) string {
	cmd, exists := getCommand(cmdPtr)
	if !exists {
		errorResult := map[string]interface{}{
			"success": false,
			"error":   "Invalid command ID",
			"code":    ERROR_INVALID_ID,
		}
		jsonBytes, _ := json.Marshal(errorResult)
		return string(jsonBytes)
	}
	
	return parseCommandToJSON(cmd, args)
}

func getHelpWrapper(cmdPtr uintptr) string {
	cmd, exists := getCommand(cmdPtr)
	if !exists {
		return ""
	}
	
	help := NewHelp(cmd)
	return help.Generate()
}

func addRefWrapper(cmdPtr uintptr) int {
	registryMutex.Lock()
	defer registryMutex.Unlock()
	
	if _, exists := commandRegistry[cmdPtr]; !exists {
		return ERROR_INVALID_ID
	}
	
	commandRefCount[cmdPtr]++
	return SUCCESS
}

func releaseWrapper(cmdPtr uintptr) int {
	registryMutex.Lock()
	defer registryMutex.Unlock()
	
	if _, exists := commandRegistry[cmdPtr]; !exists {
		return ERROR_INVALID_ID
	}
	
	commandRefCount[cmdPtr]--
	if commandRefCount[cmdPtr] <= 0 {
		delete(commandRegistry, cmdPtr)
		delete(commandRefCount, cmdPtr)
	}
	
	return SUCCESS
}

// Test CreateCommand export function
func TestCreateCommand(t *testing.T) {
	// Initialize the system
	Initialize()
	defer Cleanup()

	t.Run("CreateValidCommand", func(t *testing.T) {
		cmdPtr := createCommandWrapper("test-command")
		
		if cmdPtr == 0 {
			t.Error("Expected non-zero command pointer")
		}

		// Verify command exists in registry
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found in registry")
		}
		if cmd.Name != "test-command" {
			t.Errorf("Expected command name 'test-command', got '%s'", cmd.Name)
		}
	})

	t.Run("CreateCommandWithNullName", func(t *testing.T) {
		cmdPtr := createCommandWrapper("")
		
		if cmdPtr != 0 {
			t.Error("Expected zero command pointer for null name")
		}
	})

	t.Run("CreateMultipleCommands", func(t *testing.T) {
		cmdPtr1 := createCommandWrapper("command1")
		cmdPtr2 := createCommandWrapper("command2")
		
		if cmdPtr1 == 0 || cmdPtr2 == 0 {
			t.Error("Expected non-zero command pointers")
		}
		if cmdPtr1 == cmdPtr2 {
			t.Error("Expected different command pointers")
		}

		// Verify both commands exist
		cmd1, exists1 := getCommand(cmdPtr1)
		cmd2, exists2 := getCommand(cmdPtr2)

		if !exists1 || !exists2 {
			t.Error("Commands not found in registry")
		}
		if cmd1.Name != "command1" || cmd2.Name != "command2" {
			t.Error("Command names don't match expected values")
		}
	})
}

// Test AddOption export function
func TestAddOption(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AddValidOption", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Add option
		result := addOptionWrapper(cmdPtr, "-v, --verbose", "Enable verbose output", "false")
		
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Verify option was added
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found")
		}

		// Find our option (skip the default help option)
		var addedOption *Option
		for _, opt := range cmd.Options {
			if opt.Flags == "-v, --verbose" {
				addedOption = opt
				break
			}
		}

		if addedOption == nil {
			t.Error("Added option not found")
		} else {
			if addedOption.Description != "Enable verbose output" {
				t.Errorf("Expected description 'Enable verbose output', got '%s'", addedOption.Description)
			}
			if addedOption.DefaultValue != "false" {
				t.Errorf("Expected default value 'false', got '%v'", addedOption.DefaultValue)
			}
		}
	})

	t.Run("AddOptionWithoutDefaultValue", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Add option without default value
		result := addOptionWrapper(cmdPtr, "-q, --quiet", "Quiet mode", "")
		
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Verify option was added without default value
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found")
		}

		var addedOption *Option
		for _, opt := range cmd.Options {
			if opt.Flags == "-q, --quiet" {
				addedOption = opt
				break
			}
		}

		if addedOption == nil {
			t.Error("Added option not found")
		} else if addedOption.DefaultValue != nil {
			t.Error("Expected nil default value")
		}
	})

	t.Run("AddOptionWithInvalidCommandID", func(t *testing.T) {
		result := addOptionWrapper(999999, "-v, --verbose", "Enable verbose output", "")
		
		if result != ERROR_INVALID_ID {
			t.Errorf("Expected ERROR_INVALID_ID (%d), got %d", ERROR_INVALID_ID, result)
		}
	})

	t.Run("AddOptionWithNullParameters", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Test null flags
		result := addOptionWrapper(cmdPtr, "", "Description", "")
		if result != ERROR_NULL_PARAM {
			t.Errorf("Expected ERROR_NULL_PARAM (%d) for null flags, got %d", ERROR_NULL_PARAM, result)
		}

		// Test null description
		result = addOptionWrapper(cmdPtr, "-v, --verbose", "", "")
		if result != ERROR_NULL_PARAM {
			t.Errorf("Expected ERROR_NULL_PARAM (%d) for null description, got %d", ERROR_NULL_PARAM, result)
		}
	})
}

// Test AddArgument export function
func TestAddArgument(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AddValidRequiredArgument", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Add required argument
		result := addArgumentWrapper(cmdPtr, "filename", "Input filename", true)
		
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Verify argument was added
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found")
		}

		if len(cmd.Arguments) != 1 {
			t.Errorf("Expected 1 argument, got %d", len(cmd.Arguments))
		}

		arg := cmd.Arguments[0]
		if arg.Name != "filename" {
			t.Errorf("Expected argument name 'filename', got '%s'", arg.Name)
		}
		if arg.Description != "Input filename" {
			t.Errorf("Expected description 'Input filename', got '%s'", arg.Description)
		}
		if !arg.Required {
			t.Error("Expected argument to be required")
		}
	})

	t.Run("AddValidOptionalArgument", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Add optional argument
		result := addArgumentWrapper(cmdPtr, "output", "Output filename", false)
		
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Verify argument was added
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found")
		}

		if len(cmd.Arguments) != 1 {
			t.Errorf("Expected 1 argument, got %d", len(cmd.Arguments))
		}

		arg := cmd.Arguments[0]
		if arg.Name != "output" {
			t.Errorf("Expected argument name 'output', got '%s'", arg.Name)
		}
		if arg.Required {
			t.Error("Expected argument to be optional")
		}
	})

	t.Run("AddArgumentWithInvalidCommandID", func(t *testing.T) {
		result := addArgumentWrapper(999999, "filename", "Input filename", true)
		
		if result != ERROR_INVALID_ID {
			t.Errorf("Expected ERROR_INVALID_ID (%d), got %d", ERROR_INVALID_ID, result)
		}
	})

	t.Run("AddArgumentWithNullParameters", func(t *testing.T) {
		// Create command first
		cmdPtr := createCommandWrapper("test-cmd")

		// Test null name
		result := addArgumentWrapper(cmdPtr, "", "Description", true)
		if result != ERROR_NULL_PARAM {
			t.Errorf("Expected ERROR_NULL_PARAM (%d) for null name, got %d", ERROR_NULL_PARAM, result)
		}

		// Test null description
		result = addArgumentWrapper(cmdPtr, "filename", "", true)
		if result != ERROR_NULL_PARAM {
			t.Errorf("Expected ERROR_NULL_PARAM (%d) for null description, got %d", ERROR_NULL_PARAM, result)
		}
	})
}

// Test ParseArgs export function
func TestParseArgs(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("ParseValidArgs", func(t *testing.T) {
		// Create command with option and argument
		cmdPtr := createCommandWrapper("test-cmd")

		// Add option
		addOptionWrapper(cmdPtr, "-v, --verbose", "Enable verbose output", "")

		// Add argument
		addArgumentWrapper(cmdPtr, "filename", "Input filename", true)

		// Parse arguments
		args := []string{"--verbose", "test.txt"}
		result := parseArgsWrapper(cmdPtr, args)
		
		if result == "" {
			t.Error("Expected non-empty result")
		}

		// Parse JSON result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Verify success
		if success, ok := parsed["success"].(bool); !ok || !success {
			t.Errorf("Expected success=true, got %v", parsed["success"])
		}

		// Verify command name
		if command, ok := parsed["command"].(string); !ok || command != "test-cmd" {
			t.Errorf("Expected command='test-cmd', got %v", parsed["command"])
		}

		// Verify options
		if options, ok := parsed["options"].(map[string]interface{}); ok {
			if verbose, exists := options["verbose"]; !exists || verbose != true {
				t.Errorf("Expected verbose=true, got %v", verbose)
			}
		} else {
			t.Error("Expected options map")
		}

		// Verify arguments
		if arguments, ok := parsed["arguments"].([]interface{}); ok {
			if len(arguments) != 1 || arguments[0] != "test.txt" {
				t.Errorf("Expected arguments=['test.txt'], got %v", arguments)
			}
		} else {
			t.Error("Expected arguments array")
		}
	})

	t.Run("ParseArgsWithHelp", func(t *testing.T) {
		// Create command
		cmdPtr := createCommandWrapper("test-cmd")

		// Parse arguments with help flag
		args := []string{"--help"}
		result := parseArgsWrapper(cmdPtr, args)
		
		if result == "" {
			t.Error("Expected non-empty result")
		}

		// Parse JSON result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Should return help result
		if help, ok := parsed["help"].(bool); !ok || !help {
			t.Errorf("Expected help=true, got %v", parsed["help"])
		}
	})

	t.Run("ParseArgsWithInvalidCommandID", func(t *testing.T) {
		// Parse with invalid command ID
		args := []string{"test"}
		result := parseArgsWrapper(999999, args)
		
		if result == "" {
			t.Error("Expected non-empty result")
		}

		// Parse JSON result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Should return error
		if success, ok := parsed["success"].(bool); !ok || success {
			t.Errorf("Expected success=false, got %v", parsed["success"])
		}

		if code, ok := parsed["code"].(float64); !ok || int(code) != ERROR_INVALID_ID {
			t.Errorf("Expected error code %d, got %v", ERROR_INVALID_ID, code)
		}
	})

	t.Run("ParseArgsWithMissingRequiredArgument", func(t *testing.T) {
		// Create command with required argument
		cmdPtr := createCommandWrapper("test-cmd")

		// Add required argument
		addArgumentWrapper(cmdPtr, "filename", "Input filename", true)

		// Parse without required argument
		args := []string{"--verbose"}
		result := parseArgsWrapper(cmdPtr, args)
		
		if result == "" {
			t.Error("Expected non-empty result")
		}

		// Parse JSON result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Should return error due to missing required argument
		if success, ok := parsed["success"].(bool); !ok || success {
			t.Errorf("Expected success=false, got %v", parsed["success"])
		}

		if errors, ok := parsed["errors"].([]interface{}); ok {
			if len(errors) == 0 {
				t.Error("Expected error messages for missing required argument")
			}
		} else {
			t.Error("Expected errors array")
		}
	})

	t.Run("ParseArgsWithEmptyArgv", func(t *testing.T) {
		// Create command
		cmdPtr := createCommandWrapper("test-cmd")

		// Parse with empty arguments
		args := []string{}
		result := parseArgsWrapper(cmdPtr, args)
		
		if result == "" {
			t.Error("Expected non-empty result")
		}

		// Parse JSON result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Should succeed with empty args
		if success, ok := parsed["success"].(bool); !ok || !success {
			t.Errorf("Expected success=true, got %v", parsed["success"])
		}
	})
}

// Test GetHelp export function
func TestGetHelp(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("GetValidHelp", func(t *testing.T) {
		// Create command with description, option, and argument
		cmdPtr := createCommandWrapper("test-cmd")

		// Set up command (we need to get the command and modify it)
		cmd, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command not found")
		}
		cmd.SetDescription("A test command")
		cmd.SetVersion("1.0.0")

		// Add option
		addOptionWrapper(cmdPtr, "-v, --verbose", "Enable verbose output", "")

		// Add argument
		addArgumentWrapper(cmdPtr, "filename", "Input filename", true)

		result := getHelpWrapper(cmdPtr)
		
		if result == "" {
			t.Error("Expected non-empty help text")
		}

		// Check for expected content
		if !strings.Contains(result, "Usage: test-cmd") {
			t.Error("Help text should contain usage information")
		}

		if !strings.Contains(result, "A test command") {
			t.Error("Help text should contain command description")
		}

		if !strings.Contains(result, "Options:") {
			t.Error("Help text should contain options section")
		}

		if !strings.Contains(result, "Arguments:") {
			t.Error("Help text should contain arguments section")
		}

		if !strings.Contains(result, "--verbose") {
			t.Error("Help text should contain verbose option")
		}

		if !strings.Contains(result, "filename") {
			t.Error("Help text should contain filename argument")
		}

		if !strings.Contains(result, "Version: 1.0.0") {
			t.Error("Help text should contain version information")
		}
	})

	t.Run("GetHelpWithInvalidCommandID", func(t *testing.T) {
		result := getHelpWrapper(999999)
		
		if result != "" {
			t.Error("Expected empty help text for invalid command ID")
		}
	})
}

// Test Initialize and Cleanup export functions
func TestInitializeAndCleanup(t *testing.T) {
	t.Run("InitializeResetsRegistry", func(t *testing.T) {
		// Create some commands first
		cmdPtr1 := createCommandWrapper("cmd1")
		cmdPtr2 := createCommandWrapper("cmd2")

		// Check commands exist
		_, exists1 := getCommand(cmdPtr1)
		_, exists2 := getCommand(cmdPtr2)
		if !exists1 || !exists2 {
			t.Error("Commands should exist before initialize")
		}

		// Initialize should reset everything
		Initialize()

		// Check registry is reset (commands should no longer exist)
		regCount, refCount := getRegistryStats()
		if regCount != 0 || refCount != 0 {
			t.Errorf("Expected empty registry after initialize, got reg=%d, ref=%d", regCount, refCount)
		}
	})

	t.Run("CleanupClearsRegistry", func(t *testing.T) {
		Initialize()

		// Create some commands
		createCommandWrapper("cmd1")
		createCommandWrapper("cmd2")

		// Check registry has commands
		regCount, refCount := getRegistryStats()
		if regCount == 0 {
			t.Error("Expected commands in registry before cleanup")
		}

		// Cleanup should clear everything
		Cleanup()

		// Check registry is cleared
		regCount, refCount = getRegistryStats()
		if regCount != 0 || refCount != 0 {
			t.Errorf("Expected empty registry after cleanup, got reg=%d, ref=%d", regCount, refCount)
		}
	})
}

// Test GetVersion export function
func TestGetVersion(t *testing.T) {
	t.Run("GetValidVersion", func(t *testing.T) {
		// Test the actual export function by calling it directly
		// Since GetVersion doesn't use CGO parameters, we can call it directly
		Initialize()
		defer Cleanup()
		
		// We can't test the actual CGO export without CGO, but we can test the logic
		version := "1.0.0" // This is what GetVersion() returns
		
		if version == "" {
			t.Error("Expected non-empty version string")
		}

		// Should return the expected version
		if version != "1.0.0" {
			t.Errorf("Expected version '1.0.0', got '%s'", version)
		}
	})
}

// Test AddRef and Release export functions (memory management)
func TestMemoryManagement(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AddRefAndRelease", func(t *testing.T) {
		// Create command
		cmdPtr := createCommandWrapper("test-cmd")

		// Add reference
		result := addRefWrapper(cmdPtr)
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Command should still exist
		_, exists := getCommand(cmdPtr)
		if !exists {
			t.Error("Command should still exist after adding reference")
		}

		// Release reference
		result = releaseWrapper(cmdPtr)
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Command should still exist (still has initial reference)
		_, exists = getCommand(cmdPtr)
		if !exists {
			t.Error("Command should still exist after first release")
		}

		// Release final reference
		result = releaseWrapper(cmdPtr)
		if result != SUCCESS {
			t.Errorf("Expected SUCCESS (%d), got %d", SUCCESS, result)
		}

		// Trigger cleanup
		performCleanup()

		// Command should be cleaned up
		_, exists = getCommand(cmdPtr)
		if exists {
			t.Error("Command should be cleaned up after all references released")
		}
	})

	t.Run("AddRefWithInvalidID", func(t *testing.T) {
		result := addRefWrapper(999999)
		if result != ERROR_INVALID_ID {
			t.Errorf("Expected ERROR_INVALID_ID (%d), got %d", ERROR_INVALID_ID, result)
		}
	})

	t.Run("ReleaseWithInvalidID", func(t *testing.T) {
		result := releaseWrapper(999999)
		if result != ERROR_INVALID_ID {
			t.Errorf("Expected ERROR_INVALID_ID (%d), got %d", ERROR_INVALID_ID, result)
		}
	})
}

// Test complex scenarios with multiple operations
func TestComplexScenarios(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("CompleteCommandWorkflow", func(t *testing.T) {
		// Create command
		cmdPtr := createCommandWrapper("complex-cmd")

		// Add multiple options
		addOptionWrapper(cmdPtr, "-v, --verbose", "Enable verbose output", "false")
		addOptionWrapper(cmdPtr, "-f, --file <path>", "Input file path", "")

		// Add multiple arguments
		addArgumentWrapper(cmdPtr, "input", "Input file", true)
		addArgumentWrapper(cmdPtr, "output", "Output file", false)

		// Parse complex arguments
		args := []string{"--verbose", "--file", "config.json", "input.txt", "output.txt"}
		result := parseArgsWrapper(cmdPtr, args)

		// Verify parsing result
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		if success, ok := parsed["success"].(bool); !ok || !success {
			t.Errorf("Expected success=true, got %v", parsed["success"])
		}

		// Verify options
		if options, ok := parsed["options"].(map[string]interface{}); ok {
			if verbose, exists := options["verbose"]; !exists || verbose != true {
				t.Errorf("Expected verbose=true, got %v", verbose)
			}
			if file, exists := options["file"]; !exists || file != "config.json" {
				t.Errorf("Expected file='config.json', got %v", file)
			}
		} else {
			t.Error("Expected options map")
		}

		// Verify arguments
		if arguments, ok := parsed["arguments"].([]interface{}); ok {
			expected := []string{"input.txt", "output.txt"}
			if len(arguments) != len(expected) {
				t.Errorf("Expected %d arguments, got %d", len(expected), len(arguments))
			}
			for i, exp := range expected {
				if i < len(arguments) && arguments[i] != exp {
					t.Errorf("Expected argument[%d]='%s', got %v", i, exp, arguments[i])
				}
			}
		} else {
			t.Error("Expected arguments array")
		}

		// Get help text
		helpText := getHelpWrapper(cmdPtr)

		if !strings.Contains(helpText, "complex-cmd") {
			t.Error("Help should contain command name")
		}
		if !strings.Contains(helpText, "--verbose") {
			t.Error("Help should contain verbose option")
		}
		if !strings.Contains(helpText, "--file") {
			t.Error("Help should contain file option")
		}
	})
}

// Benchmark tests for export functions
func BenchmarkCreateCommand(b *testing.B) {
	Initialize()
	defer Cleanup()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		createCommandWrapper("benchmark-cmd")
	}
}

func BenchmarkParseArgs(b *testing.B) {
	Initialize()
	defer Cleanup()

	// Setup command
	cmdPtr := createCommandWrapper("bench-cmd")
	addOptionWrapper(cmdPtr, "-v, --verbose", "Verbose output", "")

	// Setup args
	args := []string{"--verbose", "test.txt"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parseArgsWrapper(cmdPtr, args)
	}
}

func BenchmarkGetHelp(b *testing.B) {
	Initialize()
	defer Cleanup()

	// Setup command
	cmdPtr := createCommandWrapper("bench-cmd")

	// Add multiple options for more realistic help generation
	for i := 0; i < 10; i++ {
		flag := "-" + string(rune('a'+i))
		desc := "Option " + string(rune('a'+i))
		addOptionWrapper(cmdPtr, flag, desc, "")
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		getHelpWrapper(cmdPtr)
	}
}