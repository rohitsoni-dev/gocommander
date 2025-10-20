# Makefile for commander-go

# Variables
GO_DIR = src/go
ADDON_DIR = src
BUILD_DIR = build
GO_SOURCES = $(GO_DIR)/main.go $(GO_DIR)/command.go $(GO_DIR)/option.go $(GO_DIR)/argument.go $(GO_DIR)/help.go

# Default target
all: build

# Build the Go library and Node.js addon
build: go-addon node-addon

# Build Go library (placeholder)
go-addon:
	@echo "Building Go library..."
	@echo "In a full implementation, this would build the Go code as a C archive"

# Build Node.js addon
node-addon:
	@echo "Building Node.js addon..."
	pnpm run build

# Install dependencies
install:
	pnpm install

# Run tests
test:
	pnpm test

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf $(BUILD_DIR)
	node-gyp clean

# Run example
example:
	node examples/string-util.js

# Help
help:
	@echo "Available targets:"
	@echo "  all       - Build everything (default)"
	@echo "  build     - Build the Go library and Node.js addon"
	@echo "  install   - Install dependencies"
	@echo "  test      - Run tests"
	@echo "  clean     - Clean build artifacts"
	@echo "  example   - Run example"
	@echo "  help      - Show this help"

.PHONY: all build go-addon node-addon install test clean example help