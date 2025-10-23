package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
	"unsafe"
)

// Argument represents a command argument
type Argument struct {
	Name         string
	Description  string
	Required     bool
	Variadic     bool
	DefaultValue interface{}
	Parser       func(string) (interface{}, error)
	Choices      []string
}

// NewArgument creates a new argument
func NewArgument(name, description string) *Argument {
	arg := &Argument{
		Name:        name,
		Description: description,
		Required:    true, // By default, arguments are required
	}

	// Parse argument name for special syntax
	if len(name) > 0 {
		if name[0] == '[' && name[len(name)-1] == ']' {
			// Optional argument
			arg.Name = name[1 : len(name)-1]
			arg.Required = false
		} else if name[0] == '<' && name[len(name)-1] == '>' {
			// Required argument (default)
			arg.Name = name[1 : len(name)-1]
		}

		// Check for variadic
		if len(arg.Name) > 3 && arg.Name[len(arg.Name)-3:] == "..." {
			arg.Name = arg.Name[:len(arg.Name)-3]
			arg.Variadic = true
		}
	}

	return arg
}

// SetDefault sets the default value for the argument
func (a *Argument) SetDefault(value interface{}) *Argument {
	a.DefaultValue = value
	return a
}

// SetRequired marks the argument as required
func (a *Argument) SetRequired(required bool) *Argument {
	a.Required = required
	return a
}

// SetParser sets a custom parser function for the argument
func (a *Argument) SetParser(parser func(string) (interface{}, error)) *Argument {
	a.Parser = parser
	return a
}

// SetChoices sets the allowed choices for the argument
func (a *Argument) SetChoices(choices []string) *Argument {
	a.Choices = choices
	return a
}

// Option represents a command-line option
type Option struct {
	Flags        string
	Description  string
	ShortFlag    string
	LongFlag     string
	Required     bool
	Optional     bool
	Variadic     bool
	DefaultValue interface{}
	Parser       func(string) (interface{}, error)
	EnvVar       string
	Hidden       bool
	IsHelp       bool
	IsVersion    bool
}

// NewOption creates a new option
func NewOption(flags, description string) *Option {
	opt := &Option{
		Flags:       flags,
		Description: description,
	}

	// Parse flags
	opt.parseFlags()

	return opt
}

// parseFlags parses the flags string to extract short and long flags
func (o *Option) parseFlags() {
	// Split by comma, space, or pipe
	parts := strings.FieldsFunc(o.Flags, func(r rune) bool {
		return r == ',' || r == ' ' || r == '|'
	})

	for _, part := range parts {
		if strings.HasPrefix(part, "--") {
			o.LongFlag = part
		} else if strings.HasPrefix(part, "-") {
			o.ShortFlag = part
		}
	}

	// Determine if the option requires a value
	o.Required = strings.Contains(o.Flags, "<")
	o.Optional = strings.Contains(o.Flags, "[")
	o.Variadic = strings.Contains(o.Flags, "...")
}

// SetDefault sets the default value for the option
func (o *Option) SetDefault(value interface{}) *Option {
	o.DefaultValue = value
	return o
}

// SetRequired marks the option as required
func (o *Option) SetRequired(required bool) *Option {
	o.Required = required
	return o
}

// SetOptional marks the option as optional
func (o *Option) SetOptional(optional bool) *Option {
	o.Optional = optional
	return o
}

// SetEnvVar sets the environment variable for the option
func (o *Option) SetEnvVar(envVar string) *Option {
	o.EnvVar = envVar
	return o
}

// SetParser sets a custom parser function for the option
func (o *Option) SetParser(parser func(string) (interface{}, error)) *Option {
	o.Parser = parser
	return o
}

// Hide hides the option from help
func (o *Option) Hide() *Option {
	o.Hidden = true
	return o
}

// Name returns the name of the option (long flag preferred)
func (o *Option) Name() string {
	if o.LongFlag != "" {
		return strings.TrimPrefix(o.LongFlag, "--")
	}
	if o.ShortFlag != "" {
		return strings.TrimPrefix(o.ShortFlag, "-")
	}
	return ""
}

// Command represents a command in the CLI
type Command struct {
	Name         string
	Description  string
	Version      string
	Commands     []*Command
	Options      []*Option
	Arguments    []*Argument
	Action       func([]string, map[string]interface{})
	Parent       *Command
	AllowUnknown bool
	HelpOption   *Option
	Aliases      []string
}

// NewCommand creates a new command
func NewCommand(name string) *Command {
	cmd := &Command{
		Name:      name,
		Commands:  make([]*Command, 0),
		Options:   make([]*Option, 0),
		Arguments: make([]*Argument, 0),
		Aliases:   make([]string, 0),
	}

	// Add default help option
	cmd.HelpOption = NewOption("-h, --help", "display help for command")
	cmd.HelpOption.IsHelp = true
	cmd.AddOption(cmd.HelpOption)

	return cmd
}

// AddCommand adds a subcommand
func (c *Command) AddCommand(cmd *Command) *Command {
	cmd.Parent = c
	c.Commands = append(c.Commands, cmd)
	return c
}

// AddOption adds an option
func (c *Command) AddOption(option *Option) *Command {
	// Check for conflicts
	for _, opt := range c.Options {
		if opt.ShortFlag != "" && opt.ShortFlag == option.ShortFlag {
			fmt.Fprintf(os.Stderr, "Warning: conflicting short flag '%s'\n", option.ShortFlag)
		}
		if opt.LongFlag != "" && opt.LongFlag == option.LongFlag {
			fmt.Fprintf(os.Stderr, "Warning: conflicting long flag '%s'\n", option.LongFlag)
		}
	}

	c.Options = append(c.Options, option)
	return c
}

// AddArgument adds an argument
func (c *Command) AddArgument(argument *Argument) *Command {
	// Check if we already have a variadic argument
	if len(c.Arguments) > 0 && c.Arguments[len(c.Arguments)-1].Variadic {
		fmt.Fprintf(os.Stderr, "Error: only the last argument can be variadic\n")
		return c
	}

	c.Arguments = append(c.Arguments, argument)
	return c
}

// SetAction sets the action function
func (c *Command) SetAction(action func([]string, map[string]interface{})) *Command {
	c.Action = action
	return c
}

// SetDescription sets the command description
func (c *Command) SetDescription(desc string) *Command {
	c.Description = desc
	return c
}

// SetVersion sets the command version
func (c *Command) SetVersion(version string) *Command {
	c.Version = version

	// Add version option if not already present
	versionOption := NewOption("-V, --version", "output the version number")
	versionOption.IsVersion = true
	c.AddOption(versionOption)

	return c
}

// FindCommand finds a subcommand by name
func (c *Command) FindCommand(name string) *Command {
	for _, cmd := range c.Commands {
		if cmd.Name == name {
			return cmd
		}
		// Check aliases
		for _, alias := range cmd.Aliases {
			if alias == name {
				return cmd
			}
		}
	}
	return nil
}

// FindOption finds an option by flag
func (c *Command) FindOption(flag string) *Option {
	for _, opt := range c.Options {
		if (opt.ShortFlag != "" && opt.ShortFlag == flag) ||
			(opt.LongFlag != "" && opt.LongFlag == flag) {
			return opt
		}
	}
	return nil
}

// ParseCommand parses command line arguments
func (c *Command) ParseCommand(args []string) error {
	// Parse options and arguments
	parsedOptions := make(map[string]interface{})
	remainingArgs := make([]string, 0)

	i := 0
	for i < len(args) {
		arg := args[i]

		// Check for help option
		if arg == "-h" || arg == "--help" {
			c.ShowHelp()
			os.Exit(0)
		}

		// Check for version option
		if (arg == "-V" || arg == "--version") && c.Version != "" {
			fmt.Println(c.Version)
			os.Exit(0)
		}

		// Check if it's an option
		if strings.HasPrefix(arg, "-") {
			// Find the option
			option := c.FindOption(arg)
			if option == nil {
				if !c.AllowUnknown {
					return fmt.Errorf("unknown option '%s'", arg)
				}
				remainingArgs = append(remainingArgs, arg)
				i++
				continue
			}

			// Handle option value
			if option.Required || option.Optional {
				i++
				if i >= len(args) {
					return fmt.Errorf("option '%s' missing argument", arg)
				}
				value := args[i]
				parsedOptions[option.Name()] = value
			} else {
				// Boolean flag
				parsedOptions[option.Name()] = true
			}
		} else {
			// It's a command or argument
			// Check if it's a subcommand
			subcmd := c.FindCommand(arg)
			if subcmd != nil {
				// Parse subcommand with remaining args
				return subcmd.ParseCommand(args[i+1:])
			}

			// It's an argument
			remainingArgs = append(remainingArgs, arg)
		}

		i++
	}

	// Validate arguments
	if len(remainingArgs) < c.CountRequiredArguments() {
		return fmt.Errorf("missing required arguments")
	}

	// Apply default values for options
	for _, opt := range c.Options {
		if _, exists := parsedOptions[opt.Name()]; !exists && opt.DefaultValue != nil {
			parsedOptions[opt.Name()] = opt.DefaultValue
		}
	}

	// Execute action if defined
	if c.Action != nil {
		c.Action(remainingArgs, parsedOptions)
	}

	return nil
}

// CountRequiredArguments counts the number of required arguments
func (c *Command) CountRequiredArguments() int {
	count := 0
	for _, arg := range c.Arguments {
		if arg.Required {
			count++
		}
	}
	return count
}

// ShowHelp displays help information
type Help struct {
	Command *Command
}

// NewHelp creates a new help generator
func NewHelp(command *Command) *Help {
	return &Help{
		Command: command,
	}
}

// Generate generates the help text
func (h *Help) Generate() string {
	var builder strings.Builder

	// Usage
	builder.WriteString(fmt.Sprintf("Usage: %s [options] [command]\n\n", h.Command.Name))

	// Description
	if h.Command.Description != "" {
		builder.WriteString(fmt.Sprintf("%s\n\n", h.Command.Description))
	}

	// Arguments
	if len(h.Command.Arguments) > 0 {
		builder.WriteString("Arguments:\n")
		for _, arg := range h.Command.Arguments {
			required := ""
			if arg.Required {
				required = " (required)"
			}
			builder.WriteString(fmt.Sprintf("  %s%s  %s\n", arg.Name, required, arg.Description))
		}
		builder.WriteString("\n")
	}

	// Options
	if len(h.Command.Options) > 0 {
		builder.WriteString("Options:\n")
		for _, opt := range h.Command.Options {
			// Skip hidden options
			if opt.Hidden {
				continue
			}

			defaultValue := ""
			if opt.DefaultValue != nil {
				defaultValue = fmt.Sprintf(" (default: %v)", opt.DefaultValue)
			}

			envVar := ""
			if opt.EnvVar != "" {
				envVar = fmt.Sprintf(" (env: %s)", opt.EnvVar)
			}

			builder.WriteString(fmt.Sprintf("  %s  %s%s%s\n", opt.Flags, opt.Description, defaultValue, envVar))
		}
		builder.WriteString("\n")
	}

	// Commands
	if len(h.Command.Commands) > 0 {
		builder.WriteString("Commands:\n")
		for _, cmd := range h.Command.Commands {
			// Skip hidden commands
			if cmd.HelpOption != nil && cmd.HelpOption.Hidden {
				continue
			}

			description := ""
			if cmd.Description != "" {
				description = "  " + cmd.Description
			}

			// Add aliases if any
			aliases := ""
			if len(cmd.Aliases) > 0 {
				aliases = fmt.Sprintf(" (%s)", strings.Join(cmd.Aliases, ", "))
			}

			builder.WriteString(fmt.Sprintf("  %s%s%s\n", cmd.Name, aliases, description))
		}
		builder.WriteString("\n")
	}

	// Version
	if h.Command.Version != "" {
		builder.WriteString(fmt.Sprintf("Version: %s\n", h.Command.Version))
	}

	return builder.String()
}

// ShowHelp displays help information
func (c *Command) ShowHelp() {
	help := NewHelp(c)
	fmt.Print(help.Generate())
}

// AllowUnknownOption allows unknown options
func (c *Command) AllowUnknownOption(allow bool) *Command {
	c.AllowUnknown = allow
	return c
}

// SetAliases sets aliases for the command
func (c *Command) SetAliases(aliases []string) *Command {
	c.Aliases = aliases
	return c
}

// Test function
func testCommand() {
	// Create a root command
	program := NewCommand("test-cli")
	program.SetDescription("A test CLI application")
	program.SetVersion("1.0.0")

	// Add a subcommand
	greetCmd := NewCommand("greet")
	greetCmd.SetDescription("Greet a person")
	greetCmd.AddArgument(NewArgument("<name>", "Name of the person to greet"))
	greetCmd.AddOption(NewOption("-f, --formal", "Use formal greeting").SetDefault(false))
	greetCmd.AddOption(NewOption("-t, --title <title>", "Title for the person").SetDefault("Mr./Ms."))
	greetCmd.SetAction(func(args []string, options map[string]interface{}) {
		name := args[0]
		formal := options["formal"].(bool)
		title := options["title"].(string)

		if formal {
			fmt.Printf("Good day, %s %s. It is a pleasure to meet you.\n", title, name)
		} else {
			fmt.Printf("Hey %s! What's up?\n", name)
		}
	})

	program.AddCommand(greetCmd)

	// Add another subcommand
	calcCmd := NewCommand("calculate")
	calcCmd.SetDescription("Perform basic calculations")
	calcCmd.AddArgument(NewArgument("<operation>", "Operation to perform (add, subtract, multiply, divide)"))
	calcCmd.AddArgument(NewArgument("<numbers...>", "Numbers to operate on"))
	calcCmd.AddOption(NewOption("-p, --precision <digits>", "Number of decimal places").SetDefault("2"))
	calcCmd.SetAction(func(args []string, options map[string]interface{}) {
		operation := args[0]
		precision, _ := strconv.Atoi(options["precision"].(string))

		// Convert string numbers to float64
		numbers := make([]float64, len(args)-1)
		for i, str := range args[1:] {
			num, err := strconv.ParseFloat(str, 64)
			if err != nil {
				fmt.Printf("Error: invalid number '%s'\n", str)
				return
			}
			numbers[i] = num
		}

		var result float64
		switch operation {
		case "add":
			for _, num := range numbers {
				result += num
			}
		case "subtract":
			result = numbers[0]
			for _, num := range numbers[1:] {
				result -= num
			}
		case "multiply":
			result = 1
			for _, num := range numbers {
				result *= num
			}
		case "divide":
			result = numbers[0]
			for _, num := range numbers[1:] {
				if num == 0 {
					fmt.Println("Error: division by zero")
					return
				}
				result /= num
			}
		default:
			fmt.Printf("Unknown operation: %s\n", operation)
			return
		}

		format := fmt.Sprintf("%%.%df\n", precision)
		fmt.Printf(format, result)
	})

	program.AddCommand(calcCmd)

	// Parse command line arguments
	err := program.ParseCommand(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		program.ShowHelp()
		os.Exit(1)
	}
}

// Exported functions for C bindings
// Using proper C types (C.uintptr_t, *C.char) as specified in requirements

// Thread-safe command registry system with automatic cleanup
var (
	commandRegistry = make(map[uintptr]*Command)
	commandRefCount = make(map[uintptr]int)
	nextID          uintptr = 1
	registryMutex   sync.RWMutex
	cleanupTicker   *time.Ticker
	cleanupStop     chan bool
)

// Error codes for C interop
const (
	SUCCESS           = 0
	ERROR_INVALID_ID  = 1
	ERROR_NULL_PARAM  = 2
	ERROR_PARSE_FAIL  = 3
	ERROR_MEMORY      = 4
)

//export CreateCommand
func CreateCommand(name *C.char) C.uintptr_t {
	if name == nil {
		return C.uintptr_t(0) // Invalid ID for null parameter
	}

	goName := C.GoString(name)
	cmd := NewCommand(goName)

	registryMutex.Lock()
	defer registryMutex.Unlock()

	// Store the command in our registry and return its ID
	id := nextID
	nextID++
	commandRegistry[id] = cmd
	commandRefCount[id] = 1 // Initial reference count

	return C.uintptr_t(id)
}

//export AddOption
func AddOption(cmdPtr C.uintptr_t, flags *C.char, desc *C.char, defaultVal *C.char) C.int {
	if flags == nil || desc == nil {
		return ERROR_NULL_PARAM
	}

	cmd, exists := getCommand(uintptr(cmdPtr))
	if !exists {
		return ERROR_INVALID_ID
	}

	goFlags := C.GoString(flags)
	goDesc := C.GoString(desc)
	
	option := NewOption(goFlags, goDesc)
	
	// Set default value if provided
	if defaultVal != nil {
		goDefault := C.GoString(defaultVal)
		option.SetDefault(goDefault)
	}

	cmd.AddOption(option)
	return SUCCESS
}

//export AddArgument
func AddArgument(cmdPtr C.uintptr_t, name *C.char, desc *C.char, required C.int) C.int {
	if name == nil || desc == nil {
		return ERROR_NULL_PARAM
	}

	cmd, exists := getCommand(uintptr(cmdPtr))
	if !exists {
		return ERROR_INVALID_ID
	}

	goName := C.GoString(name)
	goDesc := C.GoString(desc)
	
	argument := NewArgument(goName, goDesc)
	argument.SetRequired(required != 0)

	cmd.AddArgument(argument)
	return SUCCESS
}

//export ParseArgs
func ParseArgs(cmdPtr C.uintptr_t, argc C.int, argv **C.char) *C.char {
	cmd, exists := getCommand(uintptr(cmdPtr))
	if !exists {
		// Return JSON error response
		errorResult := map[string]interface{}{
			"success": false,
			"error":   "Invalid command ID",
			"code":    ERROR_INVALID_ID,
		}
		jsonBytes, _ := json.Marshal(errorResult)
		return C.CString(string(jsonBytes))
	}

	// Convert C argv to Go string slice safely
	args := make([]string, int(argc))
	for i := 0; i < int(argc); i++ {
		// Get the i-th element of argv
		argPtr := *(**C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(argv)) + uintptr(i)*unsafe.Sizeof((*C.char)(nil))))
		if argPtr != nil {
			args[i] = C.GoString(argPtr)
		}
	}

	// Parse the command and return JSON result
	result := parseCommandToJSON(cmd, args)
	return C.CString(result)
}

//export GetHelp
func GetHelp(cmdPtr C.uintptr_t) *C.char {
	cmd, exists := getCommand(uintptr(cmdPtr))
	if !exists {
		return C.CString("")
	}

	help := NewHelp(cmd)
	helpText := help.Generate()
	return C.CString(helpText)
}

//export Initialize
func Initialize() {
	registryMutex.Lock()
	defer registryMutex.Unlock()
	
	// Reset the registry
	commandRegistry = make(map[uintptr]*Command)
	commandRefCount = make(map[uintptr]int)
	nextID = 1
	
	// Start automatic cleanup routine
	startCleanupRoutine()
}

//export Cleanup
func Cleanup() {
	// Stop cleanup routine first
	stopCleanupRoutine()
	
	registryMutex.Lock()
	defer registryMutex.Unlock()
	
	// Clear the registry to free memory
	commandRegistry = make(map[uintptr]*Command)
	commandRefCount = make(map[uintptr]int)
	nextID = 1
}

//export GetGoVersion
func GetGoVersion() *C.char {
	return C.CString("1.0.0")
}

//export AddRef
func AddRef(cmdPtr C.uintptr_t) C.int {
	registryMutex.Lock()
	defer registryMutex.Unlock()

	id := uintptr(cmdPtr)
	if _, exists := commandRegistry[id]; !exists {
		return ERROR_INVALID_ID
	}

	commandRefCount[id]++
	return SUCCESS
}

//export Release
func Release(cmdPtr C.uintptr_t) C.int {
	registryMutex.Lock()
	defer registryMutex.Unlock()

	id := uintptr(cmdPtr)
	if _, exists := commandRegistry[id]; !exists {
		return ERROR_INVALID_ID
	}

	commandRefCount[id]--
	if commandRefCount[id] <= 0 {
		// Clean up the command when reference count reaches zero
		delete(commandRegistry, id)
		delete(commandRefCount, id)
	}

	return SUCCESS
}

// Internal function to start automatic cleanup routine
func startCleanupRoutine() {
	if cleanupTicker != nil {
		return // Already running
	}

	cleanupTicker = time.NewTicker(30 * time.Second) // Cleanup every 30 seconds
	cleanupStop = make(chan bool)

	go func(ticker *time.Ticker) {
		for {
			select {
			case <-ticker.C:
				performCleanup()
			case <-cleanupStop:
				ticker.Stop()
				return
			}
		}
	}(cleanupTicker)
}

// Internal function to stop cleanup routine
func stopCleanupRoutine() {
	if cleanupTicker != nil {
		select {
		case cleanupStop <- true:
		default:
		}
		cleanupTicker.Stop()
		cleanupTicker = nil
		if cleanupStop != nil {
			close(cleanupStop)
			cleanupStop = nil
		}
	}
}

// Internal function to perform cleanup of unused commands
func performCleanup() {
	registryMutex.Lock()
	defer registryMutex.Unlock()

	// Find commands with zero or negative reference counts
	toDelete := make([]uintptr, 0)
	for id, refCount := range commandRefCount {
		if refCount <= 0 {
			toDelete = append(toDelete, id)
		}
	}

	// Clean up unused commands
	for _, id := range toDelete {
		delete(commandRegistry, id)
		delete(commandRefCount, id)
	}
}

// Enhanced registry management functions
func getCommand(id uintptr) (*Command, bool) {
	registryMutex.RLock()
	defer registryMutex.RUnlock()
	
	cmd, exists := commandRegistry[id]
	return cmd, exists
}

func getRegistryStats() (int, int) {
	registryMutex.RLock()
	defer registryMutex.RUnlock()
	
	return len(commandRegistry), len(commandRefCount)
}

// Helper function to parse command and return JSON result
func parseCommandToJSON(cmd *Command, args []string) string {
	// Create a copy of the command for parsing to avoid modifying the original
	parsedOptions := make(map[string]interface{})
	remainingArgs := make([]string, 0)
	errors := make([]string, 0)

	i := 0
	for i < len(args) {
		arg := args[i]

		// Check for help option
		if arg == "-h" || arg == "--help" {
			result := map[string]interface{}{
				"success": true,
				"help":    true,
				"command": cmd.Name,
			}
			jsonBytes, _ := json.Marshal(result)
			return string(jsonBytes)
		}

		// Check for version option
		if (arg == "-V" || arg == "--version") && cmd.Version != "" {
			result := map[string]interface{}{
				"success": true,
				"version": cmd.Version,
				"command": cmd.Name,
			}
			jsonBytes, _ := json.Marshal(result)
			return string(jsonBytes)
		}

		// Check if it's an option
		if strings.HasPrefix(arg, "-") {
			// Find the option
			option := cmd.FindOption(arg)
			if option == nil {
				if !cmd.AllowUnknown {
					errors = append(errors, fmt.Sprintf("unknown option '%s'", arg))
					i++
					continue
				}
				remainingArgs = append(remainingArgs, arg)
				i++
				continue
			}

			// Handle option value
			if option.Required || option.Optional {
				i++
				if i >= len(args) {
					errors = append(errors, fmt.Sprintf("option '%s' missing argument", arg))
					break
				}
				value := args[i]
				parsedOptions[option.Name()] = value
			} else {
				// Boolean flag
				parsedOptions[option.Name()] = true
			}
		} else {
			// It's a command or argument
			// Check if it's a subcommand
			subcmd := cmd.FindCommand(arg)
			if subcmd != nil {
				// Parse subcommand with remaining args
				return parseCommandToJSON(subcmd, args[i+1:])
			}

			// It's an argument
			remainingArgs = append(remainingArgs, arg)
		}

		i++
	}

	// Validate arguments
	if len(remainingArgs) < cmd.CountRequiredArguments() {
		errors = append(errors, "missing required arguments")
	}

	// Apply default values for options
	for _, opt := range cmd.Options {
		if _, exists := parsedOptions[opt.Name()]; !exists && opt.DefaultValue != nil {
			parsedOptions[opt.Name()] = opt.DefaultValue
		}
	}

	// Create result
	result := map[string]interface{}{
		"success":   len(errors) == 0,
		"command":   cmd.Name,
		"options":   parsedOptions,
		"arguments": remainingArgs,
		"errors":    errors,
	}

	jsonBytes, _ := json.Marshal(result)
	return string(jsonBytes)
}

func main() {
	// This is just for testing the Go implementation directly
	if len(os.Args) > 1 && os.Args[1] == "test" {
		testCommand()
	}
}
