#!/usr/bin/env node

/**
 * Project Boilerplate Generator CLI
 *
 * A CLI tool for generating project boilerplates using GoCommander
 */

const { Command } = require("gocommander");
const fs = require("fs");
const path = require("path");

const program = new Command();

program
  .name("boilerplate-gen")
  .description("CLI tool for generating project boilerplates")
  .version("1.0.0");

// Define available project templates
const templates = {
  "node-express": {
    name: "Node.js Express API",
    description: "A basic Express.js REST API with MongoDB",
    files: [
      {
        name: "package.json",
        content: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "A basic Express.js REST API",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^6.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.0"
  }
}`,
      },
      {
        name: "index.js",
        content: `const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/{{projectName}}', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to {{projectName}} API' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      },
      {
        name: ".gitignore",
        content: `node_modules/
.env
*.log`,
      },
    ],
  },
  "react-app": {
    name: "React Application",
    description: "A basic React application with webpack",
    files: [
      {
        name: "package.json",
        content: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "A basic React application",
  "main": "index.js",
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.0.0",
    "@babel/preset-env": "^7.0.0",
    "@babel/preset-react": "^7.0.0",
    "babel-loader": "^8.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^4.0.0",
    "webpack-dev-server": "^4.0.0"
  }
}`,
      },
      {
        name: "src/index.js",
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`,
      },
      {
        name: "src/App.js",
        content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to {{projectName}}</h1>
    </div>
  );
}

export default App;`,
      },
      {
        name: "public/index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{projectName}}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`,
      },
      {
        name: "webpack.config.js",
        content: `const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    port: 3000
  }
};`,
      },
      {
        name: ".gitignore",
        content: `node_modules/
dist/
.env
*.log`,
      },
    ],
  },
  "python-flask": {
    name: "Python Flask API",
    description: "A basic Flask REST API",
    files: [
      {
        name: "requirements.txt",
        content: `Flask==2.0.0
Flask-SQLAlchemy==2.5.0`,
      },
      {
        name: "app.py",
        content: `from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///{{projectName}}.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)

@app.route('/')
def home():
    return jsonify({'message': 'Welcome to {{projectName}} API'})

if __name__ == '__main__':
    db.create_all()
    app.run(debug=True)`,
      },
      {
        name: ".gitignore",
        content: `__pycache__/
*.pyc
.env
*.db`,
      },
    ],
  },
};

// Generate command
program
  .command("generate")
  .description("Generate a new project from a template")
  .argument(
    "<template>",
    "Template to use (node-express, react-app, python-flask)"
  )
  .argument(
    "[directory]",
    "Directory to create project in (defaults to project name)"
  )
  .option("-n, --name <name>", "Project name (defaults to directory name)")
  .action((template, directory, options) => {
    // Validate template
    if (!templates[template]) {
      console.error(
        `Error: Unknown template '${template}'. Available templates:`
      );
      Object.keys(templates).forEach((key) => {
        console.error(`  ${key}: ${templates[key].description}`);
      });
      process.exit(1);
    }

    // Determine project name and directory
    const projectName = options.name || directory || template;
    const projectDir = directory || projectName;

    // Create project directory
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
      console.log(`📁 Created directory: ${projectDir}`);
    } else {
      console.log(`⚠️  Directory ${projectDir} already exists`);
    }

    // Generate files
    console.log(`\n🚀 Generating ${templates[template].name} project...`);

    templates[template].files.forEach((file) => {
      // Create subdirectories if needed
      const filePath = path.join(projectDir, file.name);
      const dirPath = path.dirname(filePath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Replace placeholders in content
      const content = file.content.replace(/\{\{projectName\}\}/g, projectName);

      // Write file
      fs.writeFileSync(filePath, content);
      console.log(`✅ Created: ${file.name}`);
    });

    console.log(`\n🎉 Project '${projectName}' created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectDir}`);
    console.log(`  # Install dependencies and start coding!`);
  });

// List command
program
  .command("list")
  .description("List available templates")
  .action(() => {
    console.log("Available templates:\n");
    Object.keys(templates).forEach((key) => {
      console.log(`  ${key}: ${templates[key].description}`);
    });
    console.log(
      '\nUse "boilerplate-gen generate <template>" to create a new project.'
    );
  });

program.parse();
