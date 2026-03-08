# Java 8 Code Visualizer

An interactive educational tool that visualizes Java 8 code execution at the bytecode level, helping users understand JVM internals including memory areas, stack frames, and data structures.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Java](https://img.shields.io/badge/Java-8-orange)

## ✨ Features

### 🎯 Core Functionality
- **Interactive Code Editor** - Write and edit Java 8 code directly in the browser
- **Step-by-Step Execution** - Execute bytecode instructions one at a time with full visualization
- **Real-time Visualization** - See JVM memory areas update as code executes
- **Variable History** - Track how variable values change throughout program execution

### 🧠 JVM Memory Areas

#### **Java Stack (Thread-private)**
- Visualize stack frames being pushed and popped
- See local variables and operand stacks in action
- Track method calls and returns
- View program counters for each thread

#### **Heap (Shared)**
- Object allocation and storage
- Array creation and manipulation
- Reference tracking between objects and stack frames
- Three view modes: All Objects, Instance Only, Array Only

#### **Method Area**
- Class structure visualization
- Field and method information
- Static members display
- Bytecode instruction listing

#### **Threads View**
- Main thread visualization
- Thread state tracking
- Program counter per thread

### 🎨 Data Structure Detection
Automatic detection and enhanced visualization for:
- **Linked Lists** - Node-based structure with next pointers
- **Stacks** - LIFO structure with push/pop operations  
- **Queues** - FIFO structure with front/rear pointers
- **Trees** - Hierarchical structure with left/right children
- **Graphs** - Nodes with multiple connections

### 💻 Code Editor Features
- **Syntax Highlighting** - Java keywords, types, operators, and strings
- **Line Numbers** - Easy reference during debugging
- **Auto-indentation** - Clean, formatted code automatically
- **Snippet Shortcuts** - Quick insert common Java patterns:
  - Hello World
  - Variables & Types
  - Arrays
  - Loops (for, while)
  - Conditionals (if-else, switch)
  - Methods
  - Classes & Objects
  - Recursion (Fibonacci, Factorial)
  - Data Structures (LinkedList, Stack, Queue, Tree, Graph)
  - Algorithms (Bubble Sort, Binary Search, Trapping Rain Water)

### 🎛️ Execution Controls
- **Compile** - Convert Java source to bytecode
- **Run** - Execute entire program at once
- **Step** - Execute one bytecode instruction at a time
- **Reset** - Clear execution state and start fresh
- **Speed Control** - Adjust step execution delay (100ms - 2000ms)

### 📝 Integrated Notepad
Built-in text area for taking notes while learning and experimenting

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone or navigate to the project directory
cd java9visualizer

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will open at `http://localhost:5173`

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## 📖 Usage Guide

### 1. Write Java Code
Use the code editor to write Java 8 code or select from pre-loaded snippets using the shortcuts panel.

**Example:**
```java
public class Test {
    public static void main(String[] args) {
        int x = 5;
        int y = 10;
        int sum = x + y;
        System.out.println("Sum: " + sum);
    }
}
```

### 2. Compile to Bytecode
Click the **Compile** button to convert your Java source code into JVM bytecode instructions.

### 3. Execute Code
- **Run**: Execute the entire program at once
- **Step**: Execute one bytecode instruction at a time to see exactly how the JVM works

### 4. Observe JVM Internals
Watch as the visualizations update in real-time:
- **Stack Frames**: See local variables being stored and operand stack being used
- **Heap**: Watch objects and arrays being created
- **Method Area**: View class structure and bytecode
- **Threads**: Track execution flow

### 5. Track Variable Changes
The Variable History panel shows how each variable's value changes throughout execution with color coding:
- 🔵 Blue circles: Primitive values
- 🟢 Green circles: String values  
- 🟡 Yellow circles: Object references

## 🏗️ Project Structure

```
java9visualizer/
├── src/
│   ├── components/          # React UI components
│   │   ├── CodeEditor/      # Editor components
│   │   ├── Layout/          # Main layout components
│   │   └── Visualizations/  # JVM visualization components
│   ├── jvm/                 # Core JVM simulation engine
│   │   ├── parser/          # Lexer and Parser (Java → AST)
│   │   ├── compiler/        # Bytecode compiler (AST → Bytecode)
│   │   ├── runtime/         # JVM simulator (Bytecode execution)
│   │   └── types/           # Type definitions
│   ├── state/               # State management (Zustand)
│   ├── utils/               # Utility functions
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
└── package.json
```

## 🔧 Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite (fast HMR and bundling)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **UI Components**: Radix UI primitives
- **Code Editor**: Custom implementation with syntax highlighting

## 🎓 Educational Use Cases

### For Students
- Understand how Java code executes at the bytecode level
- Visualize object-oriented concepts like inheritance and polymorphism
- Debug code by stepping through execution
- Learn about JVM memory management

### For Teachers
- Demonstrate JVM internals in computer science courses
- Explain stack vs heap allocation
- Show how data structures work internally
- Illustrate algorithm execution step-by-step

### For Interview Prep
- Practice coding problems with visual feedback
- Understand time/space complexity through execution
- Master data structure manipulation algorithms

## 📋 Sample Programs

The visualizer includes built-in examples:
- Basic syntax and variables
- Control flow (loops, conditionals)
- Arrays and collections
- Object-oriented programming
- Recursion
- Classic algorithms (sorting, searching)
- Data structure implementations
- LeetCode-style problems (Trapping Rain Water)

## ⚙️ Configuration

### Editor Settings
Access via the Settings button (⚙️):
- **Font Size**: Adjust code editor text size (12px - 20px)
- **Theme**: Light/Dark mode (planned)
- **Auto-close Braces**: Enable/disable automatic bracket closing
- **Tab Size**: Configure indentation width

## 🐛 Known Limitations

This is an educational simulator, not a full Java VM. Current limitations:
- Single-threaded execution only (main thread)
- Limited exception handling
- No support for generics, annotations, or inner classes
- Simplified garbage collection (no automatic cleanup)
- Method overloading resolution by parameter count only
- Some Java 8 features not yet implemented (lambdas partially supported)

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional Java 8 language features
- More sample programs and algorithms
- Enhanced data structure detection
- Better error messages and debugging tools
- Performance optimizations

## 📄 License

MIT License - feel free to use this project for learning and teaching.

## 🙏 Acknowledgments

This project is inspired by:
- OpenJDK JVM specification
- Java Virtual Machine architecture
- Various Java visualization tools

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation
- Review sample programs for examples

---

**Built with ❤️ for Java education and visualization**

*Last updated: March 2026*
