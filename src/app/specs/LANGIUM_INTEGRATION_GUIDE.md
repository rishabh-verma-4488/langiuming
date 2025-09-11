# Langium Integration Guide for Specter Library

## Overview

Langium is a powerful language server framework that can significantly enhance the Specter library by providing advanced type checking, validation, and IDE features. This guide explains how to integrate Langium to add sophisticated data type-based rules and validation.

## Why Langium for Specter?

### Current Limitations with Chevrotain
- **Limited Type Checking**: Basic token-based parsing without deep semantic analysis
- **No IDE Integration**: No language server features for autocomplete, error highlighting
- **Manual Validation**: Type checking must be implemented manually in the interpreter
- **No Cross-Reference Resolution**: Limited support for complex variable relationships

### Langium Benefits
- **Advanced Type System**: Built-in type checking and inference
- **Language Server Protocol**: Full IDE integration with autocomplete, diagnostics, hover info
- **Semantic Validation**: Deep semantic analysis beyond syntax
- **Cross-Reference Resolution**: Automatic linking and scoping
- **Extensibility**: Easy to add new features and rules

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                Langium-Enhanced Specter                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Langium       │  │   Specter       │  │   Monaco     │ │
│  │   Language      │  │   Core          │  │   Editor     │ │
│  │   Server        │  │   Library       │  │   Integration│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                    │       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Type          │  │   Validation    │  │   IDE        │ │
│  │   System        │  │   Engine        │  │   Features   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Langium Grammar Definition

#### 1.1 Create Langium Grammar File (`specter.langium`)

```langium
grammar Specter

entry Expression:
    LogicalExpression;

LogicalExpression:
    AndExpression ({LogicalExpression.left=current} 'OR' right=AndExpression)*;

AndExpression:
    AtomicExpression ({AndExpression.left=current} 'AND' right=AtomicExpression)*;

AtomicExpression:
    ParenthesizedExpression | FunctionCall;

ParenthesizedExpression:
    '(' expression=Expression ')';

FunctionCall:
    BinaryFunction | UnaryFunction | FactoryFunction;

BinaryFunction:
    name=BinaryFunctionName '(' left=Value ',' right=Value ')';

UnaryFunction:
    name=UnaryFunctionName '(' argument=Value ')';

FactoryFunction:
    name=FactoryFunctionName '(' arguments=FactoryArguments ')';

FactoryArguments:
    CurrencyArguments | DurationArguments;

CurrencyArguments:
    value=Value ',' type=StringLiteral;

DurationArguments:
    value=Value ',' unit=DurationUnit;

Value:
    Identifier | Literal | ParenthesizedExpression;

Literal:
    NumberLiteral | StringLiteral | BooleanLiteral;

// Type System
Type:
    'number' | 'string' | 'boolean' | 'currency' | 'duration' | 'array' | 'object';

TypeAnnotation:
    ':' type=Type;

// Variable Declarations with Types
VariableDeclaration:
    'var' name=ID type=TypeAnnotation? '=' value=Expression;

// Type Constraints
TypeConstraint:
    'where' condition=Expression;

// Advanced Type Rules
TypeRule:
    'rule' name=ID '(' parameters=ParameterList ')' ':' returnType=Type
    '{' body=Expression '}';

ParameterList:
    parameters+=Parameter (',' parameters+=Parameter)*;

Parameter:
    name=ID ':' type=Type;

// Data Type Specific Rules
CurrencyRule:
    'currency' name=ID ':' value=NumberLiteral ',' type=StringLiteral;

DurationRule:
    'duration' name=ID ':' value=NumberLiteral ',' unit=DurationUnit;

// Function Names
BinaryFunctionName:
    'GreaterThan' | 'LessThan' | 'Equals' | 'Contains' | 'GreaterThanOrEqual' | 'LessThanOrEqual';

UnaryFunctionName:
    'Not' | 'Empty';

FactoryFunctionName:
    'Currency' | 'Duration';

DurationUnit:
    'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS';

// Literals
NumberLiteral:
    value=NUMBER;

StringLiteral:
    value=STRING;

BooleanLiteral:
    value=('true' | 'false');

Identifier:
    name=ID;

terminal NUMBER returns number:
    /-?\d+(\.\d+)?/;

terminal STRING:
    /"[^"]*"/;

terminal ID:
    /[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*/;

terminal WS:
    /[\s\n\r]+/;
```

#### 1.2 Type System Definition

```typescript
// types.ts
export interface SpecterType {
  name: string;
  baseType?: SpecterType;
  properties?: Map<string, SpecterType>;
  constraints?: TypeConstraint[];
}

export interface TypeConstraint {
  condition: Expression;
  message: string;
}

export interface TypeRule {
  name: string;
  parameters: Parameter[];
  returnType: SpecterType;
  body: Expression;
}

export interface Parameter {
  name: string;
  type: SpecterType;
}

// Built-in Types
export const SPECTER_TYPES = {
  NUMBER: { name: 'number' },
  STRING: { name: 'string' },
  BOOLEAN: { name: 'boolean' },
  CURRENCY: { 
    name: 'currency',
    properties: new Map([
      ['value', { name: 'number' }],
      ['type', { name: 'string' }]
    ])
  },
  DURATION: {
    name: 'duration',
    properties: new Map([
      ['value', { name: 'number' }],
      ['type', { name: 'string' }],
      ['days', { name: 'number' }]
    ])
  },
  ARRAY: { name: 'array' },
  OBJECT: { name: 'object' }
};
```

### Phase 2: Type Checking Implementation

#### 2.1 Type Checker Service

```typescript
// type-checker.ts
import { AstNode, AstReflection, Reference } from 'langium';
import { SpecterType, TypeConstraint } from './types';

export class SpecterTypeChecker {
  private typeRegistry = new Map<string, SpecterType>();
  private typeRules = new Map<string, TypeRule>();

  constructor() {
    this.initializeBuiltInTypes();
  }

  private initializeBuiltInTypes() {
    Object.values(SPECTER_TYPES).forEach(type => {
      this.typeRegistry.set(type.name, type);
    });
  }

  // Type inference for expressions
  inferType(node: AstNode): SpecterType | null {
    switch (node.$type) {
      case 'NumberLiteral':
        return SPECTER_TYPES.NUMBER;
      
      case 'StringLiteral':
        return SPECTER_TYPES.STRING;
      
      case 'BooleanLiteral':
        return SPECTER_TYPES.BOOLEAN;
      
      case 'Identifier':
        return this.getVariableType(node.name);
      
      case 'BinaryFunction':
        return this.inferBinaryFunctionType(node);
      
      case 'UnaryFunction':
        return this.inferUnaryFunctionType(node);
      
      case 'FactoryFunction':
        return this.inferFactoryFunctionType(node);
      
      default:
        return null;
    }
  }

  // Type checking for binary functions
  private inferBinaryFunctionType(node: BinaryFunction): SpecterType {
    const leftType = this.inferType(node.left);
    const rightType = this.inferType(node.right);
    
    // Type compatibility rules
    if (this.areTypesCompatible(leftType, rightType, node.name)) {
      return SPECTER_TYPES.BOOLEAN;
    }
    
    throw new Error(`Type mismatch in ${node.name}: ${leftType?.name} vs ${rightType?.name}`);
  }

  // Type compatibility checking
  private areTypesCompatible(left: SpecterType | null, right: SpecterType | null, operation: string): boolean {
    if (!left || !right) return false;

    // Same type comparison
    if (left.name === right.name) return true;

    // Cross-type compatibility rules
    const compatibilityRules = {
      'GreaterThan': this.canCompareNumbers,
      'LessThan': this.canCompareNumbers,
      'Equals': this.canCompareAny,
      'Contains': this.canCheckContains
    };

    const rule = compatibilityRules[operation];
    return rule ? rule(left, right) : false;
  }

  private canCompareNumbers(left: SpecterType, right: SpecterType): boolean {
    return (left.name === 'number' || left.name === 'currency' || left.name === 'duration') &&
           (right.name === 'number' || right.name === 'currency' || right.name === 'duration');
  }

  private canCompareAny(left: SpecterType, right: SpecterType): boolean {
    return left.name === right.name || 
           (left.name === 'currency' && right.name === 'currency') ||
           (left.name === 'duration' && right.name === 'duration');
  }

  private canCheckContains(left: SpecterType, right: SpecterType): boolean {
    return left.name === 'array' && (right.name === 'string' || right.name === 'number');
  }
}
```

#### 2.2 Validation Rules Engine

```typescript
// validation-rules.ts
export class SpecterValidationRules {
  private typeChecker: SpecterTypeChecker;
  private customRules = new Map<string, ValidationRule>();

  constructor(typeChecker: SpecterTypeChecker) {
    this.typeChecker = typeChecker;
    this.initializeBuiltInRules();
  }

  private initializeBuiltInRules() {
    // Currency validation rules
    this.addRule('currency-value-positive', {
      condition: (node) => {
        if (node.$type === 'CurrencyArguments') {
          const value = this.evaluateConstant(node.value);
          return typeof value === 'number' && value >= 0;
        }
        return true;
      },
      message: 'Currency value must be positive',
      severity: 'error'
    });

    // Duration validation rules
    this.addRule('duration-unit-valid', {
      condition: (node) => {
        if (node.$type === 'DurationArguments') {
          const unit = node.unit;
          return ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'].includes(unit);
        }
        return true;
      },
      message: 'Invalid duration unit',
      severity: 'error'
    });

    // Type constraint validation
    this.addRule('type-constraint-satisfied', {
      condition: (node) => {
        if (node.$type === 'TypeConstraint') {
          return this.evaluateConstraint(node.condition);
        }
        return true;
      },
      message: 'Type constraint not satisfied',
      severity: 'warning'
    });
  }

  addRule(name: string, rule: ValidationRule) {
    this.customRules.set(name, rule);
  }

  validate(node: AstNode): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const [ruleName, rule] of this.customRules) {
      if (!rule.condition(node)) {
        results.push({
          rule: ruleName,
          message: rule.message,
          severity: rule.severity,
          node: node
        });
      }
    }

    return results;
  }
}
```

### Phase 3: Advanced Type Rules

#### 3.1 Data Type Specific Rules

```typescript
// data-type-rules.ts
export class DataTypeRules {
  private typeChecker: SpecterTypeChecker;

  constructor(typeChecker: SpecterTypeChecker) {
    this.typeChecker = typeChecker;
  }

  // Currency-specific rules
  addCurrencyRules() {
    // Rule: Currency comparisons must be same type
    this.addRule('currency-same-type', {
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && 
            ['GreaterThan', 'LessThan', 'Equals'].includes(node.name)) {
          const leftType = this.typeChecker.inferType(node.left);
          const rightType = this.typeChecker.inferType(node.right);
          
          if (leftType?.name === 'currency' && rightType?.name === 'currency') {
            return this.haveSameCurrencyType(node.left, node.right);
          }
        }
        return true;
      },
      message: 'Currency comparisons must use same currency type',
      severity: 'error'
    });

    // Rule: Currency values must be reasonable
    this.addRule('currency-reasonable-value', {
      condition: (node) => {
        if (node.$type === 'CurrencyArguments') {
          const value = this.evaluateConstant(node.value);
          return typeof value === 'number' && value >= 0 && value <= 1000000;
        }
        return true;
      },
      message: 'Currency value must be between 0 and 1,000,000',
      severity: 'warning'
    });
  }

  // Duration-specific rules
  addDurationRules() {
    // Rule: Duration comparisons must be same unit
    this.addRule('duration-same-unit', {
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && 
            ['GreaterThan', 'LessThan', 'Equals'].includes(node.name)) {
          const leftType = this.typeChecker.inferType(node.left);
          const rightType = this.typeChecker.inferType(node.right);
          
          if (leftType?.name === 'duration' && rightType?.name === 'duration') {
            return this.haveSameDurationUnit(node.left, node.right);
          }
        }
        return true;
      },
      message: 'Duration comparisons must use same unit',
      severity: 'error'
    });

    // Rule: Duration values must be positive
    this.addRule('duration-positive-value', {
      condition: (node) => {
        if (node.$type === 'DurationArguments') {
          const value = this.evaluateConstant(node.value);
          return typeof value === 'number' && value > 0;
        }
        return true;
      },
      message: 'Duration value must be positive',
      severity: 'error'
    });
  }

  // Array-specific rules
  addArrayRules() {
    // Rule: Array operations must be type-safe
    this.addRule('array-type-safe', {
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && node.name === 'Contains') {
          const leftType = this.typeChecker.inferType(node.left);
          const rightType = this.typeChecker.inferType(node.right);
          
          if (leftType?.name === 'array') {
            return this.isArrayElementType(leftType, rightType);
          }
        }
        return true;
      },
      message: 'Array contains operation must use compatible element type',
      severity: 'error'
    });
  }
}
```

#### 3.2 Custom Type Rules

```typescript
// custom-type-rules.ts
export class CustomTypeRules {
  private rules = new Map<string, CustomRule>();

  // Define custom business rules
  addBusinessRules() {
    // Rule: Contract value must be within budget
    this.addRule('contract-within-budget', {
      name: 'contract-within-budget',
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && node.name === 'LessThan') {
          const left = this.extractVariable(node.left);
          const right = this.extractVariable(node.right);
          
          if (left === 'contract.value' && right === 'budget.max_value') {
            return true; // This is a valid business rule
          }
        }
        return true;
      },
      message: 'Contract value must be within budget constraints',
      severity: 'warning'
    });

    // Rule: Duration must not exceed maximum
    this.addRule('duration-max-limit', {
      name: 'duration-max-limit',
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && node.name === 'LessThanOrEqual') {
          const left = this.extractVariable(node.left);
          const right = this.extractConstant(node.right);
          
          if (left === 'project.duration' && typeof right === 'number') {
            return right <= 365; // Max 1 year
          }
        }
        return true;
      },
      message: 'Project duration cannot exceed 1 year',
      severity: 'error'
    });
  }

  // Rule: Type-specific validation
  addTypeValidationRules() {
    // Rule: String length validation
    this.addRule('string-length-validation', {
      name: 'string-length-validation',
      condition: (node) => {
        if (node.$type === 'StringLiteral') {
          const value = node.value;
          return value.length <= 1000; // Max string length
        }
        return true;
      },
      message: 'String length cannot exceed 1000 characters',
      severity: 'warning'
    });

    // Rule: Number range validation
    this.addRule('number-range-validation', {
      name: 'number-range-validation',
      condition: (node) => {
        if (node.$type === 'NumberLiteral') {
          const value = node.value;
          return value >= -1000000 && value <= 1000000;
        }
        return true;
      },
      message: 'Number must be within valid range',
      severity: 'warning'
    });
  }
}
```

### Phase 4: IDE Integration

#### 4.1 Language Server Implementation

```typescript
// specter-language-server.ts
import { createConnection, TextDocuments, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createSpecterServices } from './specter-module';

export class SpecterLanguageServer {
  private connection = createConnection();
  private documents = new TextDocuments(TextDocument);
  private services: ReturnType<typeof createSpecterServices>;

  constructor() {
    this.services = createSpecterServices();
    this.setupHandlers();
  }

  private setupHandlers() {
    // Document change handler
    this.documents.onDidChangeContent(change => {
      this.validateDocument(change.document);
    });

    // Completion handler
    this.connection.onCompletion(params => {
      return this.provideCompletions(params);
    });

    // Hover handler
    this.connection.onHover(params => {
      return this.provideHover(params);
    });
  }

  private async validateDocument(document: TextDocument) {
    const model = this.services.shared.workspace.LangiumDocuments.getOrCreateDocument(document);
    const diagnostics: Diagnostic[] = [];

    // Parse and validate
    const parseResult = this.services.Specter.parse(model);
    if (parseResult.lexerErrors.length > 0) {
      // Add lexical errors
      parseResult.lexerErrors.forEach(error => {
        diagnostics.push({
          range: this.getRange(error),
          message: error.message,
          severity: DiagnosticSeverity.Error
        });
      });
    }

    if (parseResult.parserErrors.length > 0) {
      // Add parser errors
      parseResult.parserErrors.forEach(error => {
        diagnostics.push({
          range: this.getRange(error),
          message: error.message,
          severity: DiagnosticSeverity.Error
        });
      });
    }

    // Add semantic validation
    const validationResults = this.services.Specter.validation.ValidationRegistry.validate(model);
    validationResults.forEach(result => {
      diagnostics.push({
        range: this.getRange(result.node),
        message: result.message,
        severity: this.getSeverity(result.severity)
      });
    });

    // Send diagnostics
    this.connection.sendDiagnostics({
      uri: document.uri,
      diagnostics
    });
  }

  private async provideCompletions(params: CompletionParams) {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return [];

    const model = this.services.shared.workspace.LangiumDocuments.getOrCreateDocument(document);
    const completions = this.services.Specter.completion.CompletionProvider.getCompletion(
      model,
      params.position
    );

    return completions.map(completion => ({
      label: completion.label,
      kind: this.getCompletionKind(completion.kind),
      detail: completion.detail,
      documentation: completion.documentation,
      insertText: completion.insertText
    }));
  }
}
```

#### 4.2 Monaco Editor Integration

```typescript
// monaco-langium-integration.ts
import * as monaco from 'monaco-editor';
import { createSpecterServices } from './specter-module';

export class MonacoLangiumIntegration {
  private services: ReturnType<typeof createSpecterServices>;
  private languageId = 'specter';

  constructor() {
    this.services = createSpecterServices();
    this.registerLanguage();
  }

  private registerLanguage() {
    // Register language
    monaco.languages.register({ id: this.languageId });

    // Register completion provider
    monaco.languages.registerCompletionItemProvider(this.languageId, {
      provideCompletionItems: (model, position) => {
        return this.provideCompletions(model, position);
      },
      triggerCharacters: ['(', ',', ' ', '.', 'A', 'G', 'L', 'E', 'C', 'N', 'D']
    });

    // Register hover provider
    monaco.languages.registerHoverProvider(this.languageId, {
      provideHover: (model, position) => {
        return this.provideHover(model, position);
      }
    });

    // Register diagnostic provider
    monaco.languages.registerDocumentFormattingEditProvider(this.languageId, {
      provideDocumentFormattingEdits: (model) => {
        return this.provideFormatting(model);
      }
    });
  }

  private async provideCompletions(model: monaco.editor.ITextModel, position: monaco.Position) {
    const document = this.services.shared.workspace.LangiumDocuments.getOrCreateDocument({
      uri: model.uri.toString(),
      text: model.getValue()
    });

    const completions = this.services.Specter.completion.CompletionProvider.getCompletion(
      document,
      { line: position.lineNumber, character: position.column }
    );

    return {
      suggestions: completions.map(completion => ({
        label: completion.label,
        kind: this.getMonacoCompletionKind(completion.kind),
        detail: completion.detail,
        documentation: completion.documentation,
        insertText: completion.insertText,
        range: this.getRange(completion.range)
      }))
    };
  }
}
```

### Phase 5: Advanced Features

#### 5.1 Type Inference and Validation

```typescript
// advanced-type-inference.ts
export class AdvancedTypeInference {
  private typeChecker: SpecterTypeChecker;
  private context: Map<string, SpecterType> = new Map();

  constructor(typeChecker: SpecterTypeChecker) {
    this.typeChecker = typeChecker;
  }

  // Infer types with context
  inferTypeWithContext(node: AstNode, context: Map<string, SpecterType>): SpecterType | null {
    this.context = context;
    return this.inferType(node);
  }

  // Type narrowing based on conditions
  narrowType(node: AstNode, condition: Expression): SpecterType | null {
    const baseType = this.inferType(node);
    if (!baseType) return null;

    // Apply type narrowing based on condition
    if (condition.$type === 'BinaryFunction' && condition.name === 'Equals') {
      const rightType = this.inferType(condition.right);
      if (rightType && this.areTypesCompatible(baseType, rightType, 'Equals')) {
        return this.narrowToSpecificType(baseType, rightType);
      }
    }

    return baseType;
  }

  // Type constraints validation
  validateTypeConstraints(node: AstNode, constraints: TypeConstraint[]): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    for (const constraint of constraints) {
      if (!this.evaluateConstraint(constraint.condition)) {
        results.push({
          rule: 'type-constraint',
          message: constraint.message,
          severity: 'error',
          node: node
        });
      }
    }

    return results;
  }
}
```

#### 5.2 Custom Validation Rules

```typescript
// custom-validation-rules.ts
export class CustomValidationRules {
  private rules = new Map<string, ValidationRule>();

  // Business logic validation
  addBusinessLogicRules() {
    // Rule: Contract value must be within budget
    this.addRule('contract-budget-validation', {
      condition: (node) => {
        if (node.$type === 'BinaryFunction' && node.name === 'LessThan') {
          const left = this.extractVariable(node.left);
          const right = this.extractVariable(node.right);
          
          if (left === 'contract.value' && right === 'budget.max_value') {
            return this.validateBudgetConstraint(node);
          }
        }
        return true;
      },
      message: 'Contract value exceeds budget constraints',
      severity: 'error'
    });

    // Rule: Duration must be reasonable
    this.addRule('duration-reasonableness', {
      condition: (node) => {
        if (node.$type === 'DurationArguments') {
          const value = this.evaluateConstant(node.value);
          const unit = node.unit;
          
          if (typeof value === 'number') {
            const days = this.convertToDays(value, unit);
            return days <= 365 * 5; // Max 5 years
          }
        }
        return true;
      },
      message: 'Duration exceeds reasonable project timeline',
      severity: 'warning'
    });
  }

  // Data integrity validation
  addDataIntegrityRules() {
    // Rule: Required fields must be present
    this.addRule('required-fields', {
      condition: (node) => {
        if (node.$type === 'FunctionCall') {
          return this.validateRequiredFields(node);
        }
        return true;
      },
      message: 'Required fields are missing',
      severity: 'error'
    });

    // Rule: Data consistency
    this.addRule('data-consistency', {
      condition: (node) => {
        if (node.$type === 'BinaryFunction') {
          return this.validateDataConsistency(node);
        }
        return true;
      },
      message: 'Data consistency violation detected',
      severity: 'error'
    });
  }
}
```

## Migration Strategy

### Phase 1: Parallel Implementation
1. Keep existing Chevrotain implementation
2. Implement Langium grammar alongside
3. Create translation layer between formats

### Phase 2: Feature Parity
1. Implement all existing features in Langium
2. Add advanced type checking
3. Create comprehensive test suite

### Phase 3: Gradual Migration
1. Switch editor to use Langium language server
2. Migrate validation to Langium
3. Deprecate Chevrotain implementation

### Phase 4: Advanced Features
1. Add custom validation rules
2. Implement advanced IDE features
3. Add cross-reference resolution

## Benefits of Langium Integration

### 1. Advanced Type System
- **Type Inference**: Automatic type inference for expressions
- **Type Checking**: Compile-time type validation
- **Type Constraints**: Custom type validation rules
- **Type Narrowing**: Context-aware type refinement

### 2. Enhanced IDE Features
- **Intelligent Autocomplete**: Context-aware suggestions
- **Real-time Validation**: Live error detection
- **Hover Information**: Rich type information
- **Go to Definition**: Cross-reference navigation

### 3. Extensibility
- **Custom Rules**: Easy addition of business logic rules
- **Plugin System**: Modular rule system
- **Type Extensions**: Custom data type support
- **Validation Hooks**: Custom validation logic

### 4. Performance
- **Incremental Parsing**: Only re-parse changed sections
- **Caching**: Intelligent result caching
- **Lazy Evaluation**: On-demand computation
- **Parallel Processing**: Multi-threaded validation

This integration would transform the Specter library into a powerful, type-safe, and highly extensible expression evaluation system with full IDE support and advanced validation capabilities.


