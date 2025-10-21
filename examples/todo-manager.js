#!/usr/bin/env node

/**
 * Todo Manager CLI
 *
 * A CLI tool for managing todo lists using GoCommander
 */

const { Command } = require("gocommander");
const fs = require("fs");
const path = require("path");

// Default todo file location
const TODO_FILE = path.join(require("os").homedir(), ".todos.json");

// Load todos from file
function loadTodos() {
  try {
    if (fs.existsSync(TODO_FILE)) {
      const data = fs.readFileSync(TODO_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading todos:", err.message);
  }
  return [];
}

// Save todos to file
function saveTodos(todos) {
  try {
    fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2));
    return true;
  } catch (err) {
    console.error("Error saving todos:", err.message);
    return false;
  }
}

// Generate a new ID
function generateId(todos) {
  const ids = todos.map((todo) => todo.id).filter((id) => !isNaN(id));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

const program = new Command();

program
  .name("todo")
  .description("CLI tool for managing todo lists")
  .version("1.0.0");

// Add command
program
  .command("add")
  .description("Add a new todo")
  .argument("<description>", "Description of the todo")
  .option(
    "-p, --priority <level>",
    "Priority level (high, medium, low)",
    "medium"
  )
  .option("-t, --tags <tags>", "Comma-separated list of tags")
  .action((description, options) => {
    const todos = loadTodos();
    const newTodo = {
      id: generateId(todos),
      description: description,
      completed: false,
      priority: options.priority || "medium",
      tags: options.tags
        ? options.tags.split(",").map((tag) => tag.trim())
        : [],
      createdAt: new Date().toISOString(),
    };

    todos.push(newTodo);

    if (saveTodos(todos)) {
      console.log(`✅ Todo added successfully (ID: ${newTodo.id})`);
      console.log(`📝 ${newTodo.description}`);
      console.log(`🏷️  Priority: ${newTodo.priority}`);
      if (newTodo.tags.length > 0) {
        console.log(`🔖 Tags: ${newTodo.tags.join(", ")}`);
      }
    } else {
      console.error("❌ Failed to save todo");
      process.exit(1);
    }
  });

// List command
program
  .command("list")
  .description("List all todos")
  .option("-a, --all", "Show all todos (default: only incomplete)")
  .option("-p, --priority <level>", "Filter by priority (high, medium, low)")
  .option("-t, --tag <tag>", "Filter by tag")
  .action((options) => {
    let todos = loadTodos();

    // Filter by completion status
    if (!options.all) {
      todos = todos.filter((todo) => !todo.completed);
    }

    // Filter by priority
    if (options.priority) {
      todos = todos.filter((todo) => todo.priority === options.priority);
    }

    // Filter by tag
    if (options.tag) {
      todos = todos.filter((todo) => todo.tags.includes(options.tag));
    }

    if (todos.length === 0) {
      console.log("No todos found.");
      return;
    }

    console.log(`${options.all ? "All" : "Incomplete"} todos:\n`);

    // Sort by priority (high first) and creation date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    todos.sort((a, b) => {
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    todos.forEach((todo) => {
      const status = todo.completed ? "✅" : "⏳";
      const priorityEmoji =
        {
          high: "🔴",
          medium: "🟡",
          low: "🟢",
        }[todo.priority] || "⚪";

      console.log(
        `${status} ${priorityEmoji} [${todo.id}] ${todo.description}`
      );
      if (todo.tags.length > 0) {
        console.log(`   🔖 Tags: ${todo.tags.join(", ")}`);
      }
      console.log();
    });
  });

// Complete command
program
  .command("complete")
  .description("Mark a todo as complete")
  .argument("<id>", "ID of the todo to complete")
  .action((id, options) => {
    const todos = loadTodos();
    const todoId = parseInt(id);
    const todo = todos.find((t) => t.id === todoId);

    if (!todo) {
      console.error(`❌ Todo with ID ${todoId} not found`);
      process.exit(1);
    }

    if (todo.completed) {
      console.log(`⚠️  Todo "${todo.description}" is already completed`);
      return;
    }

    todo.completed = true;
    todo.completedAt = new Date().toISOString();

    if (saveTodos(todos)) {
      console.log(`✅ Todo "${todo.description}" marked as complete`);
    } else {
      console.error("❌ Failed to save todo");
      process.exit(1);
    }
  });

// Delete command
program
  .command("delete")
  .description("Delete a todo")
  .argument("<id>", "ID of the todo to delete")
  .action((id, options) => {
    let todos = loadTodos();
    const todoId = parseInt(id);
    const todoIndex = todos.findIndex((t) => t.id === todoId);

    if (todoIndex === -1) {
      console.error(`❌ Todo with ID ${todoId} not found`);
      process.exit(1);
    }

    const todo = todos[todoIndex];
    todos.splice(todoIndex, 1);

    if (saveTodos(todos)) {
      console.log(`🗑️  Todo "${todo.description}" deleted successfully`);
    } else {
      console.error("❌ Failed to save todos");
      process.exit(1);
    }
  });

// Clear command
program
  .command("clear")
  .description("Clear all completed todos")
  .action((options) => {
    let todos = loadTodos();
    const completedCount = todos.filter((todo) => todo.completed).length;

    if (completedCount === 0) {
      console.log("No completed todos to clear");
      return;
    }

    todos = todos.filter((todo) => !todo.completed);

    if (saveTodos(todos)) {
      console.log(`🧹 Cleared ${completedCount} completed todo(s)`);
    } else {
      console.error("❌ Failed to save todos");
      process.exit(1);
    }
  });

program.parse();
