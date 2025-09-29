# Specter Language Documentation

This document provides a comprehensive overview of the Specter language implementation using Langium, including grammar setup, custom modules, function configuration, validation, and LSP integration.

## 1. Grammar Setup

### Grammar Rules

The Specter language grammar is defined in `src/app/language/specter-grammar.ts`:

```typescript
export const SpecterGrammar = `
grammar Specter

entry Model:
    expressions+=Expression*;

Expression:
    LogicalExpression;

LogicalExpression:
    PrimaryExpression ({LogicalExpression.left=current} operator=('AND' | 'OR') right=PrimaryExpression)*;

PrimaryExpression:
    FunctionCall | Literal | ParenthesizedExpression;

ParenthesizedExpression:
    '(' expression=Expression ')';

FunctionCall:
    name=ID '(' arguments=FunctionArguments? ')';

FunctionArguments:
    values+=Expression (',' values+=Expression)*;

Literal:
    StringLiteral | NumberLiteral | ArrayLiteral | BooleanLiteral;

StringLiteral:
    value=STRING;

NumberLiteral:
    value=NUMBER;

BooleanLiteral:
    value=('true' | 'false');

ArrayLiteral:
    '[' values+=Expression (',' values+=Expression)* ']';

terminal NUMBER returns number:
    /-?\\d+(\\.\\d+)?/;

terminal STRING:
    /"[^"]*"/;

terminal ID:
    /[a-zA-Z_$][a-zA-Z0-9_$]*/;

hidden terminal WS:
    /[\\s\\n\\r]+/;

hidden terminal ML_COMMENT:
    /\\/\\*[\\s\\S]*?\\*\\//;

hidden terminal SL_COMMENT:
    /\\/\\/[^\\n\\r]*/;
`;
```

### Generated AST Example

The grammar generates the following AST structure (from `generated/ast.ts`):

```typescript
export interface Model {
    $type: 'Model';
    expressions: Expression[];
}

export interface FunctionCall {
    $type: 'FunctionCall';
    name: string;
    arguments?: FunctionArguments;
}

export interface FunctionArguments {
    $type: 'FunctionArguments';
    values: Expression[];
}

export interface LogicalExpression {
    $type: 'LogicalExpression';
    left: PrimaryExpression;
    operator: 'AND' | 'OR';
    right: PrimaryExpression;
}

// Type guards
export function isFunctionCall(node: AstNode): node is FunctionCall {
    return node.$type === 'FunctionCall';
}
```

## 2. Custom Module

The custom module (`src/app/language/specter-custom-module.ts`) registers all language services:

```typescript
import { LangiumServices, PartialLangiumServices } from 'langium/lsp';
import { Module } from 'langium';
import { ValidationRegistry } from 'langium';
import { SpecterValidationRegistry } from './specter-validation';
import { SpecterCompletionProvider } from './specter-completion';
import { SpecterHoverProvider } from './specter-hover';

export type SpecterAddedServices = {
    // Add any custom services here if needed
}

export type SpecterServices = LangiumServices & SpecterAddedServices;

export const SpecterCustomModule: Module<SpecterServices, PartialLangiumServices & SpecterAddedServices> = {
    validation: {
        ValidationRegistry: (services) => {
            const registry = new ValidationRegistry(services);
            registry.register(SpecterValidationRegistry);
            return registry;
        }
    },
    lsp: {
        CompletionProvider: (services) => new SpecterCompletionProvider(services),
        HoverProvider: (services) => new SpecterHoverProvider(services)
    }
};
```

### Registered Providers

- **ValidationRegistry**: Handles syntax and semantic validation
- **CompletionProvider**: Provides code completion suggestions
- **HoverProvider**: Provides hover documentation

## 3. Function Configuration

### Function Configuration Interface

```typescript
interface FunctionConfig {
    name: string;
    documentation: string;
    paramCount: number;
    paramTypes: string[];
    returnTypeMapBasedOnParamType: Map<string, string>;
    customValidationBasedOnParam: (params: any[]) => ValidationResult;
    examples: string[];
    category: 'arithmetic' | 'comparison' | 'string' | 'type_constructor';
    isAsync?: boolean;
    deprecated?: boolean;
}

interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
    warningMessage?: string;
}
```

### Example Function Definition

```typescript
const functionConfig: FunctionConfig[] = [
    {
        name: 'add',
        documentation: 'Adds two numbers together. Supports integers and floating-point numbers.',
        paramCount: 2,
        paramTypes: ['number', 'number'],
        returnTypeMapBasedOnParamType: new Map([
            ['number,number', 'number'],
            ['currency,currency', 'currency'],
            ['duration,duration', 'duration']
        ]),
        customValidationBasedOnParam: (params) => {
            if (params.length !== 2) {
                return { isValid: false, errorMessage: 'add() requires exactly 2 parameters' };
            }
            if (typeof params[0] !== 'number' || typeof params[1] !== 'number') {
                return { isValid: false, errorMessage: 'add() parameters must be numbers' };
            }
            return { isValid: true };
        },
        examples: [
            'add(5, 3) // Returns 8',
            'add(10, -5) // Returns 5',
            'add(0.5, 0.3) // Returns 0.8'
        ],
        category: 'arithmetic'
    },
    {
        name: 'GreaterThan',
        documentation: 'Compares two values and returns true if the left operand is greater than the right operand.',
        paramCount: 2,
        paramTypes: ['any', 'any'],
        returnTypeMapBasedOnParamType: new Map([
            ['number,number', 'boolean'],
            ['currency,currency', 'boolean'],
            ['duration,duration', 'boolean']
        ]),
        customValidationBasedOnParam: (params) => {
            if (params.length !== 2) {
                return { isValid: false, errorMessage: 'GreaterThan() requires exactly 2 parameters' };
            }
            // Type-safe comparison validation
            const leftType = this.inferType(params[0]);
            const rightType = this.inferType(params[1]);
            
            if (leftType !== rightType) {
                return { 
                    isValid: false, 
                    errorMessage: `Type mismatch: cannot compare ${leftType} with ${rightType}` 
                };
            }
            return { isValid: true };
        },
        examples: [
            'GreaterThan(10, 5) // Returns true',
            'GreaterThan(Currency(100, "USD"), Currency(50, "USD")) // Returns true'
        ],
        category: 'comparison'
    }
];
```

## 4. Validation Class

### Validation Registry

```typescript
export const SpecterValidationRegistry: ValidationChecks<SpecterAstType> = {
    Model: (node: Model, accept: ValidationAcceptor) => {
        const validator = new SpecterValidator();
        validator.checkModel(node, accept);
    },
    FunctionCall: (node: FunctionCall, accept: ValidationAcceptor) => {
        const validator = new SpecterValidator();
        validator.checkFunctionCall(node, accept);
    }
};
```

### Example Validation Rule

```typescript
export class SpecterValidator {
    private functionRegistry = new Map<string, FunctionSignature>();

    checkFunctionCall(node: FunctionCall, accept: ValidationAcceptor): void {
        const funcName = node.name;
        const signature = this.functionRegistry.get(funcName);
        
        if (!signature) {
            accept('error', `Unknown function '${funcName}'`, { node });
            return;
        }

        // Check parameter count
        const argCount = node.arguments?.values.length || 0;
        if (argCount !== signature.parameters.length) {
            accept('error', 
                `Function '${funcName}' expects ${signature.parameters.length} parameters, got ${argCount}`, 
                { node }
            );
        }

        // Validate parameter types
        if (node.arguments) {
            node.arguments.values.forEach((arg, index) => {
                const expectedType = signature.parameters[index]?.type;
                const actualType = this.inferExpressionType(arg);
                
                if (expectedType && actualType !== expectedType) {
                    accept('error', 
                        `Parameter ${index + 1} of '${funcName}' expects ${expectedType}, got ${actualType}`, 
                        { node: arg }
                    );
                }
            });
        }
    }

    private inferExpressionType(expr: Expression): string {
        if (isNumberLiteral(expr)) return 'number';
        if (isStringLiteral(expr)) return 'string';
        if (isBooleanLiteral(expr)) return 'boolean';
        if (isArrayLiteral(expr)) return 'array';
        if (isFunctionCall(expr)) {
            const signature = this.functionRegistry.get(expr.name);
            return signature?.returnType || 'unknown';
        }
        return 'unknown';
    }
}
```

## 5. Simple Samples

### Completion Class

```typescript
export class SpecterCompletionProvider extends DefaultCompletionProvider {
    private functionNames: string[] = ['add', 'subtract', 'GreaterThan', 'LessThan'];

    override async getCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList | undefined> {
        const specterCompletions = this.getSpecterCompletions(document, params);
        const defaultCompletions = await super.getCompletion(document, params, cancelToken);

        return {
            items: [
                ...(defaultCompletions?.items || []),
                ...specterCompletions
            ],
            isIncomplete: defaultCompletions?.isIncomplete || false
        };
    }

    private getSpecterCompletions(document: LangiumDocument, params: CompletionParams): CompletionItem[] {
        const items: CompletionItem[] = [];
        
        this.functionNames.forEach(funcName => {
            items.push({
                label: funcName,
                kind: CompletionItemKind.Function,
                detail: `${funcName}(...)`,
                documentation: `Built-in Specter function: ${funcName}`,
                insertText: funcName + '('
            });
        });

        return items;
    }
}
```

### Hover Class

```typescript
export class SpecterHoverProvider implements HoverProvider {
    private functionDocumentation = new Map<string, string>();

    constructor() {
        this.functionDocumentation.set('add', 'Adds two numbers together');
        this.functionDocumentation.set('GreaterThan', 'Compares two values');
    }

    async getHoverContent(params: any): Promise<Hover | undefined> {
        const text = params.textDocument._content;
        const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
        
        for (const word of words) {
            if (this.functionDocumentation.has(word)) {
                return {
                    contents: {
                        kind: 'markdown',
                        value: `**${word}**\n\n${this.functionDocumentation.get(word)}`
                    }
                };
            }
        }
        
        return undefined;
    }
}
```

## 6. Langium Worker & LSP Client

### Langium Worker

```typescript
// src/app/language/langium-worker.ts
import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, startLanguageServer } from 'langium/lsp';
import { inject } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { EmptyFileSystem } from 'langium';
import { SpecterGeneratedModule, SpecterGeneratedSharedModule } from './generated/module';
import { SpecterCustomModule } from './specter-custom-module';

// Create message reader and writer for web worker communication
const messageReader = new BrowserMessageReader(self as any);
const messageWriter = new BrowserMessageWriter(self as any);
const connection = createConnection(messageReader, messageWriter);

// Create Langium services
const context: DefaultSharedModuleContext = {
    connection: connection as any,
    fileSystemProvider: () => EmptyFileSystem.fileSystemProvider()
};

const shared = inject(
    createDefaultSharedModule(context),
    SpecterGeneratedSharedModule
);

const Specter = inject(
    createDefaultModule({ shared }),
    SpecterGeneratedModule,
    SpecterCustomModule
);

shared.ServiceRegistry.register(Specter);
startLanguageServer(shared);
```

### LSP Client

```typescript
// src/app/language/monaco-lsp-client.ts
export class MonacoLSPClient {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();

    async initialize(): Promise<void> {
        this.worker = new Worker(new URL('./langium-worker.ts', import.meta.url), { type: 'module' });
        
        this.worker.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        await this.initializeLSP();
    }

    private async initializeLSP(): Promise<void> {
        const initParams = {
            processId: null,
            rootUri: null,
            capabilities: {
                textDocument: {
                    publishDiagnostics: { relatedInformation: true },
                    completion: { dynamicRegistration: true }
                }
            },
            workspaceFolders: null
        };

        await this.sendRequest('initialize', initParams);
        this.sendNotification('initialized', {});
    }

    async getCompletion(uri: string, position: { line: number; character: number }): Promise<any> {
        return await this.sendRequest('textDocument/completion', {
            textDocument: { uri },
            position: { line: position.line, character: position.character }
        });
    }

    async getHover(uri: string, position: { line: number; character: number }): Promise<any> {
        return await this.sendRequest('textDocument/hover', {
            textDocument: { uri },
            position: { line: position.line, character: position.character }
        });
    }
}
```

## 7. Editor Changes

### Monaco Editor Integration

```typescript
// src/app/components/editor.component.ts
export class EditorComponent {
    private lspClient = new MonacoLSPClient();

    onEditorInit(editor: any) {
        const monaco = (window as any).monaco;
        
        // Register Specter language
        monaco.languages.register({ id: 'specter' });
        
        // Set up completion provider
        monaco.languages.registerCompletionItemProvider('specter', {
            provideCompletionItems: async (model: any, position: any) => {
                const lspPosition = {
                    line: position.lineNumber - 1,
                    character: position.column - 1
                };
                
                const completion = await this.lspClient.getCompletion(model.uri.toString(), lspPosition);
                return { suggestions: this.convertLSPToMonaco(completion.items) };
            }
        });

        // Set up hover provider
        monaco.languages.registerHoverProvider('specter', {
            provideHover: async (model: any, position: any) => {
                const lspPosition = {
                    line: position.lineNumber - 1,
                    character: position.column - 1
                };
                
                return await this.lspClient.getHover(model.uri.toString(), lspPosition);
            }
        });

        // Listen for content changes
        editor.onDidChangeModelContent(() => {
            const content = editor.getValue();
            this.lspClient.updateDocument('file:///specter-document', content, Date.now());
        });
    }

    private convertLSPToMonaco(items: any[]): any[] {
        return items.map(item => ({
            label: item.label,
            kind: this.convertLSPKindToMonaco(item.kind),
            detail: item.detail,
            documentation: item.documentation,
            insertText: item.insertText || item.label
        }));
    }
}
```

## Usage Examples

### Valid Specter Code

```specter
// Arithmetic operations
add(5, 3)
subtract(10, 4)
multiply(2, 6)
divide(15, 3)

// Comparison operations
GreaterThan(10, 5)
LessThan(3, 7)
Equals(5, 5)

// Logical operations
GreaterThan(10, 5) AND LessThan(3, 7)
Equals(5, 5) OR Not(Empty("hello"))

// Type constructors
Currency(100, "USD")
Duration(30, "DAYS")

// String operations
Length("hello")
ToUpper("world")
Concat("hello", "world")
```

### Error Examples

```specter
// Type mismatch errors
add(5, "hello")  // Error: cannot add number and string
GreaterThan(Currency(100, "USD"), 50)  // Error: type mismatch

// Parameter count errors
add(5)  // Error: add() requires exactly 2 parameters
GreaterThan(10, 5, 3)  // Error: GreaterThan() requires exactly 2 parameters

// Unknown function errors
unknownFunction(5, 3)  // Error: Unknown function 'unknownFunction'
```

This documentation provides a complete overview of the Specter language implementation, from grammar definition to editor integration, enabling developers to understand and extend the language system.
