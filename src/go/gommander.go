package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"fmt"
	"os"
	"strconv"
	"strings"
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
// We use unsafe.Pointer to pass Go objects to C and back

var commandRegistry = make(map[uintptr]*Command)
var nextID uintptr = 1

//export CreateCommand
func CreateCommand(name *C.char) unsafe.Pointer {
	goName := C.GoString(name)
	cmd := NewCommand(goName)

	// Store the command in our registry and return its ID
	id := nextID
	nextID++
	commandRegistry[id] = cmd

	// Return the ID as an unsafe.Pointer
	return unsafe.Pointer(id)
}

//export AddCommand
func AddCommand(parentPtr unsafe.Pointer, childPtr unsafe.Pointer) {
	// Convert pointers back to commands
	parentID := uintptr(parentPtr)
	childID := uintptr(childPtr)

	parent, parentExists := commandRegistry[parentID]
	child, childExists := commandRegistry[childID]

	if parentExists && childExists {
		parent.AddCommand(child)
	}
}

//export Parse
func Parse(cmdPtr unsafe.Pointer, argc C.int, argv **C.char) C.int {
	// Convert pointer back to command
	cmdID := uintptr(cmdPtr)
	cmd, exists := commandRegistry[cmdID]

	if !exists {
		return 1 // Error
	}

	// Convert C argv to Go string slice safely
	args := make([]string, int(argc))
	for i := 0; i < int(argc); i++ {
		// Get the i-th element of argv
		argPtr := *(**C.char)(unsafe.Pointer(uintptr(unsafe.Pointer(argv)) + uintptr(i)*unsafe.Sizeof((*C.char)(nil))))
		args[i] = C.GoString(argPtr)
	}

	// Parse the command
	err := cmd.ParseCommand(args)
	if err != nil {
		return 1 // Error
	}

	return 0 // Success
}

// Initialize function for C bindings
//
//export Initialize
func Initialize() {
	// Initialization code if needed
	// Reset the registry
	commandRegistry = make(map[uintptr]*Command)
	nextID = 1
}

// Version function for C bindings
//
//export Version
func Version() *C.char {
	return C.CString("1.0.0")
}

func main() {
	// This is just for testing the Go implementation directly
	if len(os.Args) > 1 && os.Args[1] == "test" {
		testCommand()
	}
}
