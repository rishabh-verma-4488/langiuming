export interface EvaluationResult {
  value: any;
  type: string;
  success: boolean;
  error?: string;
}

export interface EvaluationContext {
  variables?: Map<string, any>;
  functions?: Map<string, Function>;
}

export class ExpressionEvaluator {
  private functionRegistry = new Map<string, FunctionDefinition>();
  private context: EvaluationContext;

  constructor(context: EvaluationContext = {}) {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      ...context
    };
    this.initializeBuiltInFunctions();
  }

  private initializeBuiltInFunctions() {
    // Comparison functions
    this.registerFunction({
      name: 'GreaterThan',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is greater than second',
      category: 'comparison',
      evaluator: (args: any[]) => args[0] > args[1]
    });

    this.registerFunction({
      name: 'LessThan',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is less than second',
      category: 'comparison',
      evaluator: (args: any[]) => args[0] < args[1]
    });

    this.registerFunction({
      name: 'Equals',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['any', 'any'],
      description: 'Returns true if arguments are equal',
      category: 'comparison',
      evaluator: (args: any[]) => args[0] === args[1]
    });

    this.registerFunction({
      name: 'Contains',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['array', 'any'],
      description: 'Returns true if array contains the value',
      category: 'comparison',
      evaluator: (args: any[]) => Array.isArray(args[0]) && args[0].includes(args[1])
    });

    this.registerFunction({
      name: 'GreaterThanOrEqual',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is greater than or equal to second',
      category: 'comparison',
      evaluator: (args: any[]) => args[0] >= args[1]
    });

    this.registerFunction({
      name: 'LessThanOrEqual',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is less than or equal to second',
      category: 'comparison',
      evaluator: (args: any[]) => args[0] <= args[1]
    });

    // Logical functions
    this.registerFunction({
      name: 'Not',
      minArgs: 1,
      maxArgs: 1,
      argTypes: ['boolean'],
      description: 'Returns the logical negation of the argument',
      category: 'logical',
      evaluator: (args: any[]) => !args[0]
    });

    this.registerFunction({
      name: 'Empty',
      minArgs: 1,
      maxArgs: 1,
      argTypes: ['any'],
      description: 'Returns true if the argument is empty',
      category: 'logical',
      evaluator: (args: any[]) => {
        const value = args[0];
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.length === 0;
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      }
    });

    // Factory functions
    this.registerFunction({
      name: 'Currency',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'string'],
      description: 'Creates a currency value with amount and type',
      category: 'factory',
      evaluator: (args: any[]) => ({
        type: 'currency',
        value: args[0],
        currencyType: args[1]
      })
    });

    this.registerFunction({
      name: 'Duration',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'string'],
      description: 'Creates a duration value with amount and unit',
      category: 'factory',
      evaluator: (args: any[]) => ({
        type: 'duration',
        value: args[0],
        unit: args[1]
      })
    });

    // Arithmetic functions
    this.registerFunction({
      name: 'add',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns the sum of two numbers',
      category: 'utility',
      evaluator: (args: any[]) => args[0] + args[1]
    });
  }

  registerFunction(definition: FunctionDefinition) {
    this.functionRegistry.set(definition.name, definition);
  }

  // Main evaluation method
  evaluate(expression: string): EvaluationResult {
    try {
      const result = this.evaluateExpression(expression);
      return {
        value: result,
        type: this.getTypeOfValue(result),
        success: true
      };
    } catch (error) {
      return {
        value: null,
        type: 'error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private evaluateExpression(expression: string): any {
    const trimmed = expression.trim();
    
    // Handle logical expressions
    if (trimmed.includes(' AND ')) {
      return this.evaluateLogicalExpression(trimmed, 'AND');
    }
    
    if (trimmed.includes(' OR ')) {
      return this.evaluateLogicalExpression(trimmed, 'OR');
    }
    
    // Handle parenthesized expressions
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const innerExpression = trimmed.slice(1, -1);
      return this.evaluateExpression(innerExpression);
    }
    
    // Handle function calls
    if (this.isFunctionCall(trimmed)) {
      return this.evaluateFunctionCall(trimmed);
    }
    
    // Handle simple values
    return this.evaluateSimpleValue(trimmed);
  }

  private evaluateLogicalExpression(expression: string, operator: 'AND' | 'OR'): boolean {
    const parts = expression.split(` ${operator} `);
    const results = parts.map(part => this.evaluateExpression(part.trim()));
    
    if (operator === 'AND') {
      return results.every(result => Boolean(result));
    } else {
      return results.some(result => Boolean(result));
    }
  }

  private evaluateFunctionCall(functionCall: string): any {
    const parsed = this.parseFunctionCall(functionCall);
    if (!parsed) {
      throw new Error(`Invalid function call: ${functionCall}`);
    }

    const functionDef = this.functionRegistry.get(parsed.name);
    if (!functionDef) {
      throw new Error(`Unknown function: ${parsed.name}`);
    }

    // Evaluate arguments recursively
    const evaluatedArgs = parsed.args.map(arg => {
      const trimmedArg = arg.trim();
      
      // If argument is a function call, evaluate it recursively
      if (this.isFunctionCall(trimmedArg)) {
        return this.evaluateFunctionCall(trimmedArg);
      }
      
      // Otherwise, evaluate as simple value
      return this.evaluateSimpleValue(trimmedArg);
    });

    // Execute the function
    if (functionDef.evaluator) {
      return functionDef.evaluator(evaluatedArgs);
    } else {
      throw new Error(`Function ${parsed.name} has no evaluator defined`);
    }
  }

  private evaluateSimpleValue(value: string): any {
    // Remove quotes from strings
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    
    // Parse numbers
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    
    // Parse booleans
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      const content = value.slice(1, -1).trim();
      if (content === '') return [];
      return content.split(',').map(item => this.evaluateSimpleValue(item.trim()));
    }
    
    // Check if it's a variable
    if (this.context.variables?.has(value)) {
      return this.context.variables.get(value);
    }
    
    // Return as string for identifiers
    return value;
  }

  private isFunctionCall(value: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)$/.test(value);
  }

  private parseFunctionCall(functionCall: string): { name: string; args: string[] } | null {
    const match = functionCall.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)$/);
    if (!match) return null;

    const name = match[1];
    const argsString = match[2].trim();
    
    if (argsString === '') {
      return { name, args: [] };
    }

    const args = this.parseArguments(argsString);
    return { name, args };
  }

  private parseArguments(argsString: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        current += char;
      } else if (!inString && char === '(') {
        depth++;
        current += char;
      } else if (!inString && char === ')') {
        depth--;
        current += char;
      } else if (!inString && char === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  private getTypeOfValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') {
      if (value.type === 'currency') return 'currency';
      if (value.type === 'duration') return 'duration';
      return 'object';
    }
    return 'unknown';
  }

  // Helper methods for context management
  setVariable(name: string, value: any): void {
    if (!this.context.variables) {
      this.context.variables = new Map();
    }
    this.context.variables.set(name, value);
  }

  getVariable(name: string): any {
    return this.context.variables?.get(name);
  }

  setFunction(name: string, func: Function): void {
    if (!this.context.functions) {
      this.context.functions = new Map();
    }
    this.context.functions.set(name, func);
  }

  getFunction(name: string): Function | undefined {
    return this.context.functions?.get(name);
  }

  // Batch evaluation for multiple expressions
  evaluateBatch(expressions: string[]): EvaluationResult[] {
    return expressions.map(expr => this.evaluate(expr));
  }

  // Get all available functions
  getAvailableFunctions(): string[] {
    return Array.from(this.functionRegistry.keys());
  }
}

// Extended FunctionDefinition interface to include evaluator
export interface FunctionDefinition {
  name: string;
  minArgs: number;
  maxArgs: number;
  argTypes?: string[];
  description: string;
  category: string;
  evaluator?: (args: any[]) => any;
}

