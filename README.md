# Langium Language Studio - Specter DSL

A comprehensive domain-specific language (DSL) development environment built with Angular, Monaco Editor, and Langium. This project demonstrates how to create a custom language with syntax highlighting, validation, and Language Server Protocol (LSP) integration.

## 🏗️ Architecture Overview

### Core Components Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Angular Application                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   App Component │    │ Editor Component│    │ Monaco LSP  │  │
│  │   (main.ts)     │───▶│ (editor.component)│───▶│   Client    │  │
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Language Services Layer                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   Langium       │    │   Validation    │    │  Evaluation │  │
│  │   Worker        │    │   Services      │    │  Services   │  │
│  │ (langium-worker)│    │(specter-validation)│  │(specter-evaluator)│
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Generated Language Files                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐  │
│  │   AST Types     │    │   Grammar       │    │   Module    │  │
│  │  (generated/ast)│    │ (generated/grammar)│  │(generated/module)│
│  └─────────────────┘    └─────────────────┘    └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 File Structure

### Frontend Layer
- **`src/main.ts`** - Angular application bootstrap and configuration
- **`src/app/components/editor.component.ts`** - Monaco Editor integration component
- **`src/global_styles.css`** - Global application styles

### Language Definition Layer
- **`src/app/language/specter.langium`** - Langium grammar definition
- **`src/app/language/specter-grammar.ts`** - Grammar export utilities

### Generated Language Files
- **`src/app/language/generated/ast.ts`** - Abstract Syntax Tree type definitions
- **`src/app/language/generated/grammar.ts`** - Generated grammar parser
- **`src/app/language/generated/module.ts`** - Generated Langium module

### Language Services Layer
- **`src/app/language/langium-worker.ts`** - Web Worker for LSP server
- **`src/app/language/specter-custom-module.ts`** - Custom Langium module configuration
- **`src/app/language/specter-validation.ts`** - Validation services and rules
- **`src/app/language/specter-evaluator.ts`** - Expression evaluation engine
- **`src/app/language/monaco-lsp-client.ts`** - Monaco Editor LSP integration

### Configuration
- **`angular.json`** - Angular build configuration
- **`package.json`** - Dependencies and scripts
- **`tsconfig.*.json`** - TypeScript configuration files

## 🔄 Data Flow

### 1. User Input Flow
```
User Types in Editor
        │
        ▼
Monaco Editor (editor.component.ts)
        │
        ▼
Content Change Event
        │
        ▼
Monaco LSP Client (monaco-lsp-client.ts)
        │
        ▼
Web Worker Communication
        │
        ▼
Langium Worker (langium-worker.ts)
        │
        ▼
Language Server Protocol
```

### 2. Validation Flow
```
Document Change
        │
        ▼
LSP Document Update
        │
        ▼
Langium Parser
        │
        ▼
AST Generation
        │
        ▼
Validation Registry (specter-validation.ts)
        │
        ▼
Custom Validation Rules
        │
        ▼
Diagnostics Generation
        │
        ▼
Monaco Editor Markers
```

### 3. Evaluation Flow
```
Expression AST
        │
        ▼
Specter Evaluator (specter-evaluator.ts)
        │
        ▼
Function Registry Lookup
        │
        ▼
Built-in Function Execution
        │
        ▼
Result with Type Information
```

## 🛠️ Key Components

### Editor Component (`editor.component.ts`)
- **Purpose**: Main UI component integrating Monaco Editor
- **Features**:
  - Syntax highlighting for Specter language
  - Real-time error display
  - Code formatting and clearing
  - Cursor position tracking
  - LSP client integration

### Monaco LSP Client (`monaco-lsp-client.ts`)
- **Purpose**: Bridge between Monaco Editor and Langium LSP server
- **Features**:
  - Web Worker communication
  - Document lifecycle management (open/update/close)
  - Diagnostic conversion (LSP → Monaco markers)
  - Request/response handling with timeouts

### Langium Worker (`langium-worker.ts`)
- **Purpose**: Web Worker hosting the LSP server
- **Features**:
  - Langium service initialization
  - Module injection and configuration
  - LSP protocol implementation
  - Validation service integration

### Validation Services (`specter-validation.ts`)
- **Purpose**: Custom validation rules for Specter language
- **Features**:
  - Function signature validation
  - Parameter count and type checking
  - Built-in function registry
  - Error reporting with detailed messages

### Evaluation Engine (`specter-evaluator.ts`)
- **Purpose**: Runtime evaluation of Specter expressions
- **Features**:
  - Expression tree traversal
  - Function execution
  - Type-safe result handling
  - Error handling and reporting

## 🔧 Validation Services Connection

### Validation Registry Setup
```typescript
// specter-custom-module.ts
ValidationRegistry: (services) => {
    const registry = new ValidationRegistry(services);
    registry.register(SpecterValidationRegistry);
    return registry;
}
```

### Validation Rules
- **Model Validation**: Checks expression structure
- **Function Call Validation**: Validates function names, parameters, and types
- **Logical Expression Validation**: Ensures proper operator usage
- **Type Checking**: Validates argument types against function signatures

### Error Handling
- **Defensive Programming**: Null/undefined checks throughout
- **Graceful Degradation**: Errors don't break the validation process
- **Comprehensive Logging**: Detailed debug information
- **User-Friendly Messages**: Clear error descriptions

## 🎯 Monaco Error Handling

### Diagnostic Processing
1. **LSP Diagnostics** received from Langium worker
2. **Severity Conversion** (LSP → Monaco format)
3. **Range Mapping** (0-based LSP → 1-based Monaco)
4. **Marker Application** to editor model

### Error Display
- **Real-time Validation**: As you type
- **Visual Indicators**: Red squiggly lines for errors
- **Status Bar**: Error/warning counts
- **Hover Information**: Detailed error messages

### Error Types Handled
- **Syntax Errors**: Invalid grammar constructs
- **Semantic Errors**: Type mismatches, unknown functions
- **Validation Errors**: Parameter count mismatches
- **Runtime Errors**: Division by zero, invalid operations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Angular CLI
- Langium CLI

### Installation
```bash
npm install
```

### Development
```bash
# Start development server
npm start

# Generate language files (if grammar changes)
npm run langium:generate

# Watch for grammar changes
npm run langium:watch
```

### Building
```bash
npm run build
```

## 📝 Specter Language Features

### Supported Expressions
- **Logical Operations**: `AND`, `OR`
- **Function Calls**: `GreaterThan(100, 50)`
- **Literals**: Numbers, strings, booleans, arrays
- **Parentheses**: `(expression)`

### Built-in Functions
- **Comparison**: `GreaterThan`, `LessThan`, `Equals`, `Not`
- **Array Operations**: `Contains`
- **Arithmetic**: `add`, `subtract`, `multiply`, `divide`
- **Special Types**: `Currency`, `Duration`

### Example Usage
```specter
// Valid expressions
GreaterThan(100, 50) AND LessThan(200, 300)
Equals(Not(Empty("test")), true) OR Contains([1, 2, 3], 2)
Currency(50000, "USD")
Duration(6, "MONTHS")
add(10, 20)
```

## 🔍 Debugging

### Console Logging
- **LSP Communication**: Request/response logging
- **Validation Process**: Step-by-step validation logging
- **Error Handling**: Detailed error information
- **Monaco Integration**: Editor state and marker updates

### Common Issues
1. **Worker Not Loading**: Check browser console for worker errors
2. **Validation Errors**: Check Langium grammar and validation rules
3. **Monaco Not Available**: Ensure Monaco is loaded before initialization
4. **LSP Connection**: Verify worker communication and LSP protocol

## 🏆 Best Practices

### Code Organization
- **Separation of Concerns**: Clear separation between UI, language services, and validation
- **Error Handling**: Comprehensive error handling at all levels
- **Type Safety**: Strong typing throughout the application
- **Modularity**: Reusable components and services

### Performance
- **Debounced Updates**: Prevent excessive LSP requests while typing
- **Worker Communication**: Efficient message passing
- **Memory Management**: Proper cleanup of resources
- **Lazy Loading**: On-demand service initialization

This architecture provides a robust foundation for building domain-specific languages with modern web technologies, offering real-time validation, syntax highlighting, and a professional development experience.