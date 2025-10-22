package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// Test internal Go functions without CGO
// These tests verify the core Go logic that the export functions use

// Test command creation functionality (internal)
func TestInternalCommandCreation(t *testing.T) {
	// Initialize the system
	Initialize()
	defer Cleanup()

	t.Run("CreateValidCommand", func(t *testing.T) {
		// Test the internal command creation logic
		cmd := NewCommand("test-command")
		if cmd == nil {
			t.Error("Expected non-nil command")
		}
		if cmd.Name != "test-command" {
			t.Errorf("Expected command name 'test-command', got '%s'", cmd.Name)
		}

		// Test registry storage
		registryMutex.Lock()
		id := nextID
		nextID++
		commandRegistry[id] = cmd
		commandRefCount[id] = 1
		registryMutex.Unlock()

		// Verify command exists in registry
		retrievedCmd, exists := getCommand(id)
		if !exists {
			t.Error("Command not found in registry")
		}
		if retrievedCmd.Name != "test-command" {
			t.Errorf("Expected command name 'test-command', got '%s'", retrievedCmd.Name)
		}
	})

	t.Run("CreateMultipleCommands", func(t *testing.T) {
		cmd1 := NewCommand("command1")
		cmd2 := NewCommand("command2")

		// Store in registry
		registryMutex.Lock()
		id1 := nextID
		nextID++
		id2 := nextID
		nextID++
		commandRegistry[id1] = cmd1
		commandRegistry[id2] = cmd2
		commandRefCount[id1] = 1
		commandRefCount[id2] = 1
		registryMutex.Unlock()

		// Verify both commands exist
		retrievedCmd1, exists1 := getCommand(id1)
		retrievedCmd2, exists2 := getCommand(id2)

		if !exists1 || !exists2 {
			t.Error("Commands not found in registry")
		}
		if retrievedCmd1.Name != "command1" || retrievedCmd2.Name != "command2" {
			t.Error("Command names don't match expected values")
		}
	})
}

// Test option addition functionality (internal)
func TestInternalOptionAddition(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AddValidOption", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		option := NewOption("-v, --verbose", "Enable verbose output")
		option.SetDefault("false")
		cmd.AddOption(option)

		// Verify option was added (should have help option + our option)
		if len(cmd.Options) < 2 {
			t.Error("Option was not added to command")
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
		cmd := NewCommand("test-cmd")
		
		option := NewOption("-q, --quiet", "Quiet mode")
		cmd.AddOption(option)

		// Verify option was added without default value
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

	t.Run("OptionFlagParsing", func(t *testing.T) {
		option := NewOption("-v, --verbose", "Enable verbose output")
		
		if option.ShortFlag != "-v" {
			t.Errorf("Expected short flag '-v', got '%s'", option.ShortFlag)
		}
		if option.LongFlag != "--verbose" {
			t.Errorf("Expected long flag '--verbose', got '%s'", option.LongFlag)
		}
	})
}

// Test argument addition functionality (internal)
func TestInternalArgumentAddition(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AddValidRequiredArgument", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		argument := NewArgument("filename", "Input filename")
		argument.SetRequired(true)
		cmd.AddArgument(argument)

		// Verify argument was added
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
		cmd := NewCommand("test-cmd")
		
		// Add required argument first
		arg1 := NewArgument("filename", "Input filename")
		arg1.SetRequired(true)
		cmd.AddArgument(arg1)
		
		// Add optional argument
		arg2 := NewArgument("output", "Output filename")
		arg2.SetRequired(false)
		cmd.AddArgument(arg2)

		// Verify both arguments were added
		if len(cmd.Arguments) != 2 {
			t.Errorf("Expected 2 arguments, got %d", len(cmd.Arguments))
		}

		arg := cmd.Arguments[1] // Second argument
		if arg.Name != "output" {
			t.Errorf("Expected argument name 'output', got '%s'", arg.Name)
		}
		if arg.Required {
			t.Error("Expected argument to be optional")
		}
	})

	t.Run("ArgumentNameParsing", func(t *testing.T) {
		// Test optional argument syntax
		arg1 := NewArgument("[optional]", "Optional argument")
		if arg1.Name != "optional" {
			t.Errorf("Expected name 'optional', got '%s'", arg1.Name)
		}
		if arg1.Required {
			t.Error("Expected argument to be optional")
		}

		// Test required argument syntax
		arg2 := NewArgument("<required>", "Required argument")
		if arg2.Name != "required" {
			t.Errorf("Expected name 'required', got '%s'", arg2.Name)
		}
		if !arg2.Required {
			t.Error("Expected argument to be required")
		}

		// Test variadic argument syntax
		arg3 := NewArgument("files...", "Multiple files")
		if arg3.Name != "files" {
			t.Errorf("Expected name 'files', got '%s'", arg3.Name)
		}
		if !arg3.Variadic {
			t.Error("Expected argument to be variadic")
		}
	})
}

// Test argument parsing functionality (internal)
func TestInternalArgumentParsing(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("ParseValidArgs", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		// Add an option
		option := NewOption("-v, --verbose", "Enable verbose output")
		cmd.AddOption(option)

		// Add an argument
		argument := NewArgument("filename", "Input filename")
		argument.SetRequired(true)
		cmd.AddArgument(argument)

		// Test the internal parsing logic
		args := []string{"--verbose", "test.txt"}
		result := parseCommandToJSON(cmd, args)
		
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
		cmd := NewCommand("test-cmd")
		
		args := []string{"--help"}
		result := parseCommandToJSON(cmd, args)
		
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

	t.Run("ParseArgsWithMissingRequiredArgument", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		// Add required argument
		argument := NewArgument("filename", "Input filename")
		argument.SetRequired(true)
		cmd.AddArgument(argument)

		args := []string{"--verbose"}
		result := parseCommandToJSON(cmd, args)
		
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

	t.Run("ParseArgsWithUnknownOption", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		args := []string{"--unknown"}
		result := parseCommandToJSON(cmd, args)
		
		var parsed map[string]interface{}
		err := json.Unmarshal([]byte(result), &parsed)
		if err != nil {
			t.Fatalf("Failed to parse JSON result: %v", err)
		}

		// Should return error for unknown option
		if success, ok := parsed["success"].(bool); !ok || success {
			t.Errorf("Expected success=false, got %v", parsed["success"])
		}

		if errors, ok := parsed["errors"].([]interface{}); ok {
			if len(errors) == 0 {
				t.Error("Expected error messages for unknown option")
			}
		} else {
			t.Error("Expected errors array")
		}
	})
}

// Test help generation functionality (internal)
func TestInternalHelpGeneration(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("GenerateValidHelp", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		cmd.SetDescription("A test command")
		cmd.SetVersion("1.0.0")
		
		// Add an option
		option := NewOption("-v, --verbose", "Enable verbose output")
		cmd.AddOption(option)

		// Add an argument
		argument := NewArgument("filename", "Input filename")
		argument.SetRequired(true)
		cmd.AddArgument(argument)

		help := NewHelp(cmd)
		helpText := help.Generate()
		
		// Verify help text contains expected elements
		if helpText == "" {
			t.Error("Expected non-empty help text")
		}

		// Check for usage line
		if !strings.Contains(helpText, "Usage: test-cmd") {
			t.Error("Help text should contain usage information")
		}

		// Check for description
		if !strings.Contains(helpText, "A test command") {
			t.Error("Help text should contain command description")
		}

		// Check for options section
		if !strings.Contains(helpText, "Options:") {
			t.Error("Help text should contain options section")
		}

		// Check for arguments section
		if !strings.Contains(helpText, "Arguments:") {
			t.Error("Help text should contain arguments section")
		}

		// Check for our specific option
		if !strings.Contains(helpText, "--verbose") {
			t.Error("Help text should contain verbose option")
		}

		// Check for our specific argument
		if !strings.Contains(helpText, "filename") {
			t.Error("Help text should contain filename argument")
		}

		// Check for version
		if !strings.Contains(helpText, "Version: 1.0.0") {
			t.Error("Help text should contain version information")
		}
	})

	t.Run("GenerateHelpWithSubcommands", func(t *testing.T) {
		rootCmd := NewCommand("root")
		subCmd := NewCommand("sub")
		subCmd.SetDescription("A subcommand")
		
		rootCmd.AddCommand(subCmd)

		help := NewHelp(rootCmd)
		helpText := help.Generate()

		// Check for commands section
		if !strings.Contains(helpText, "Commands:") {
			t.Error("Help text should contain commands section")
		}

		// Check for subcommand
		if !strings.Contains(helpText, "sub") {
			t.Error("Help text should contain subcommand")
		}
	})
}

// Test initialization and cleanup functionality (internal)
func TestInternalInitializeAndCleanup(t *testing.T) {
	t.Run("InitializeResetsRegistry", func(t *testing.T) {
		// Create some commands first
		cmd1 := NewCommand("cmd1")
		cmd2 := NewCommand("cmd2")

		registryMutex.Lock()
		commandRegistry[1] = cmd1
		commandRegistry[2] = cmd2
		commandRefCount[1] = 1
		commandRefCount[2] = 1
		registryMutex.Unlock()

		// Check registry has commands
		regCount, refCount := getRegistryStats()
		if regCount == 0 {
			t.Error("Expected commands in registry before initialize")
		}

		// Initialize should reset everything
		Initialize()

		// Check registry is reset
		regCount, refCount = getRegistryStats()
		if regCount != 0 || refCount != 0 {
			t.Errorf("Expected empty registry after initialize, got reg=%d, ref=%d", regCount, refCount)
		}
	})

	t.Run("CleanupClearsRegistry", func(t *testing.T) {
		Initialize()

		// Create some commands
		cmd1 := NewCommand("cmd1")
		cmd2 := NewCommand("cmd2")

		registryMutex.Lock()
		commandRegistry[1] = cmd1
		commandRegistry[2] = cmd2
		commandRefCount[1] = 1
		commandRefCount[2] = 1
		registryMutex.Unlock()

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

// Test memory management functionality (internal)
func TestInternalMemoryManagement(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("ReferenceCountManagement", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		registryMutex.Lock()
		id := uintptr(100)
		commandRegistry[id] = cmd
		commandRefCount[id] = 1
		registryMutex.Unlock()

		// Increment reference count
		registryMutex.Lock()
		commandRefCount[id]++
		registryMutex.Unlock()

		// Command should still exist
		_, exists := getCommand(id)
		if !exists {
			t.Error("Command should still exist after incrementing reference count")
		}

		// Decrement reference count
		registryMutex.Lock()
		commandRefCount[id]--
		registryMutex.Unlock()

		_, exists = getCommand(id)
		if !exists {
			t.Error("Command should still exist after first decrement")
		}

		// Decrement to zero and cleanup
		registryMutex.Lock()
		commandRefCount[id]--
		registryMutex.Unlock()

		performCleanup()

		_, exists = getCommand(id)
		if exists {
			t.Error("Command should be cleaned up after reference count reaches zero")
		}
	})
}

// Test automatic cleanup functionality (internal)
func TestInternalAutomaticCleanup(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("AutomaticCleanupRemovesUnusedCommands", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		registryMutex.Lock()
		id := uintptr(200)
		commandRegistry[id] = cmd
		commandRefCount[id] = 0 // Set to 0 to simulate unused command
		registryMutex.Unlock()

		// Trigger cleanup manually
		performCleanup()

		// Command should be removed
		_, exists := getCommand(id)
		if exists {
			t.Error("Unused command should be cleaned up")
		}
	})

	t.Run("CleanupPreservesUsedCommands", func(t *testing.T) {
		cmd := NewCommand("test-cmd")
		
		registryMutex.Lock()
		id := uintptr(300)
		commandRegistry[id] = cmd
		commandRefCount[id] = 1 // Active reference
		registryMutex.Unlock()

		// Trigger cleanup manually
		performCleanup()

		// Command should still exist
		_, exists := getCommand(id)
		if !exists {
			t.Error("Used command should not be cleaned up")
		}
	})
}

// Test thread safety (internal)
func TestInternalThreadSafety(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("ConcurrentRegistryAccess", func(t *testing.T) {
		const numGoroutines = 10
		const commandsPerGoroutine = 10

		done := make(chan bool, numGoroutines)

		// Create commands concurrently
		for i := 0; i < numGoroutines; i++ {
			go func(id int) {
				for j := 0; j < commandsPerGoroutine; j++ {
					cmd := NewCommand("cmd")
					
					registryMutex.Lock()
					cmdID := nextID
					nextID++
					commandRegistry[cmdID] = cmd
					commandRefCount[cmdID] = 1
					registryMutex.Unlock()

					if cmdID == 0 {
						t.Errorf("Failed to create command in goroutine %d", id)
					}
				}
				done <- true
			}(i)
		}

		// Wait for all goroutines to complete
		for i := 0; i < numGoroutines; i++ {
			<-done
		}

		// Verify all commands were created
		regCount, _ := getRegistryStats()
		expectedCount := numGoroutines * commandsPerGoroutine
		if regCount != expectedCount {
			t.Errorf("Expected %d commands, got %d", expectedCount, regCount)
		}
	})
}

// Test complex command structures
func TestInternalComplexCommands(t *testing.T) {
	Initialize()
	defer Cleanup()

	t.Run("CommandWithSubcommands", func(t *testing.T) {
		rootCmd := NewCommand("root")
		subCmd1 := NewCommand("sub1")
		subCmd2 := NewCommand("sub2")
		
		rootCmd.AddCommand(subCmd1)
		rootCmd.AddCommand(subCmd2)

		// Test finding subcommands
		found1 := rootCmd.FindCommand("sub1")
		found2 := rootCmd.FindCommand("sub2")
		notFound := rootCmd.FindCommand("nonexistent")

		if found1 != subCmd1 {
			t.Error("Failed to find subcommand sub1")
		}
		if found2 != subCmd2 {
			t.Error("Failed to find subcommand sub2")
		}
		if notFound != nil {
			t.Error("Should not find nonexistent subcommand")
		}
	})

	t.Run("CommandWithAliases", func(t *testing.T) {
		cmd := NewCommand("command")
		cmd.SetAliases([]string{"cmd", "c"})

		rootCmd := NewCommand("root")
		rootCmd.AddCommand(cmd)

		// Test finding by alias
		foundByName := rootCmd.FindCommand("command")
		foundByAlias1 := rootCmd.FindCommand("cmd")
		foundByAlias2 := rootCmd.FindCommand("c")

		if foundByName != cmd {
			t.Error("Failed to find command by name")
		}
		if foundByAlias1 != cmd {
			t.Error("Failed to find command by alias 'cmd'")
		}
		if foundByAlias2 != cmd {
			t.Error("Failed to find command by alias 'c'")
		}
	})

	t.Run("CommandWithMultipleOptions", func(t *testing.T) {
		cmd := NewCommand("test")
		
		opt1 := NewOption("-v, --verbose", "Verbose output")
		opt2 := NewOption("-q, --quiet", "Quiet mode")
		opt3 := NewOption("-f, --file <path>", "Input file")
		
		cmd.AddOption(opt1)
		cmd.AddOption(opt2)
		cmd.AddOption(opt3)

		// Test finding options
		foundShort := cmd.FindOption("-v")
		foundLong := cmd.FindOption("--verbose")
		foundFile := cmd.FindOption("--file")
		notFound := cmd.FindOption("--nonexistent")

		if foundShort != opt1 {
			t.Error("Failed to find option by short flag")
		}
		if foundLong != opt1 {
			t.Error("Failed to find option by long flag")
		}
		if foundFile != opt3 {
			t.Error("Failed to find file option")
		}
		if notFound != nil {
			t.Error("Should not find nonexistent option")
		}
	})
}

// Benchmark tests for performance verification
func BenchmarkInternalCommandCreation(b *testing.B) {
	Initialize()
	defer Cleanup()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		NewCommand("benchmark-cmd")
	}
}

func BenchmarkInternalArgumentParsing(b *testing.B) {
	Initialize()
	defer Cleanup()

	// Setup command
	cmd := NewCommand("bench-cmd")
	option := NewOption("-v, --verbose", "Verbose output")
	cmd.AddOption(option)

	args := []string{"--verbose", "test.txt"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parseCommandToJSON(cmd, args)
	}
}

func BenchmarkInternalHelpGeneration(b *testing.B) {
	Initialize()
	defer Cleanup()

	// Setup command
	cmd := NewCommand("bench-cmd")
	cmd.SetDescription("Benchmark command")
	
	for i := 0; i < 10; i++ {
		opt := NewOption("-"+string(rune('a'+i)), "Option "+string(rune('a'+i)))
		cmd.AddOption(opt)
	}

	help := NewHelp(cmd)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		help.Generate()
	}
}