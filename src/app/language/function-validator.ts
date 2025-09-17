export interface FunctionDefinition {
  name: string;
  minArgs: number;
  maxArgs: number;
  argTypes?: string[];
  description: string;
  category: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class FunctionValidator {
  private functionRegistry = new Map<string, FunctionDefinition>();

  constructor() {
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
      category: 'comparison'
    });

    this.registerFunction({
      name: 'LessThan',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is less than second',
      category: 'comparison'
    });

    this.registerFunction({
      name: 'Equals',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['any', 'any'],
      description: 'Returns true if arguments are equal',
      category: 'comparison'
    });

    this.registerFunction({
      name: 'Contains',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['array', 'any'],
      description: 'Returns true if array contains the value',
      category: 'comparison'
    });

    this.registerFunction({
      name: 'GreaterThanOrEqual',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is greater than or equal to second',
      category: 'comparison'
    });

    this.registerFunction({
      name: 'LessThanOrEqual',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns true if first argument is less than or equal to second',
      category: 'comparison'
    });

    // Logical functions
    this.registerFunction({
      name: 'Not',
      minArgs: 1,
      maxArgs: 1,
      argTypes: ['boolean'],
      description: 'Returns the logical negation of the argument',
      category: 'logical'
    });

    this.registerFunction({
      name: 'Empty',
      minArgs: 1,
      maxArgs: 1,
      argTypes: ['any'],
      description: 'Returns true if the argument is empty',
      category: 'logical'
    });

    // Factory functions
    this.registerFunction({
      name: 'Currency',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'string'],
      description: 'Creates a currency value with amount and type',
      category: 'factory'
    });

    this.registerFunction({
      name: 'Duration',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'string'],
      description: 'Creates a duration value with amount and unit',
      category: 'factory'
    });

    // Arithmetic functions
    this.registerFunction({
      name: 'add',
      minArgs: 2,
      maxArgs: 2,
      argTypes: ['number', 'number'],
      description: 'Returns the sum of two numbers',
      category: 'utility'
    });
  }

  registerFunction(definition: FunctionDefinition) {
    this.functionRegistry.set(definition.name, definition);
  }

  validateFunctionCall(functionName: string, args: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if function exists
    const functionDef = this.functionRegistry.get(functionName);
    if (!functionDef) {
      errors.push(`Unknown function: ${functionName}`);
      return { isValid: false, errors, warnings };
    }

    // Check argument count
    if (args.length < functionDef.minArgs) {
      errors.push(`Function ${functionName} requires at least ${functionDef.minArgs} arguments, got ${args.length}`);
    }

    if (args.length > functionDef.maxArgs) {
      errors.push(`Function ${functionName} accepts at most ${functionDef.maxArgs} arguments, got ${args.length}`);
    }

    // Check argument types if defined
    if (functionDef.argTypes && args.length > 0) {
      for (let i = 0; i < Math.min(args.length, functionDef.argTypes.length); i++) {
        const expectedType = functionDef.argTypes[i];
        const actualType = this.getTypeOfValue(args[i]);
        
        if (expectedType !== 'any' && !this.isTypeCompatible(actualType, expectedType)) {
          errors.push(`Argument ${i + 1} of ${functionName} should be ${expectedType}, got ${actualType}`);
        }
      }
    }

    // Validate nested function calls
    this.validateNestedFunctionCalls(args, errors, warnings);

    // Special validation for specific functions
    this.validateSpecialCases(functionName, args, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateSpecialCases(functionName: string, args: any[], errors: string[], warnings: string[]) {
    switch (functionName) {
      case 'Currency':
        if (args.length >= 2) {
          const amount = args[0];
          const type = args[1];
          
          if (typeof amount === 'number' && amount < 0) {
            warnings.push('Currency amount should be positive');
          }
          
          if (typeof type === 'string' && !['USD', 'EUR', 'GBP', 'JPY'].includes(type)) {
            warnings.push(`Uncommon currency type: ${type}`);
          }
        }
        break;

      case 'Duration':
        if (args.length >= 2) {
          const amount = args[0];
          const unit = args[1];
          
          if (typeof amount === 'number' && amount <= 0) {
            errors.push('Duration amount must be positive');
          }
          
          if (typeof unit === 'string' && !['DAYS', 'WEEKS', 'MONTHS', 'YEARS'].includes(unit)) {
            errors.push(`Invalid duration unit: ${unit}. Must be one of: DAYS, WEEKS, MONTHS, YEARS`);
          }
        }
        break;

      case 'Contains':
        if (args.length >= 1 && !Array.isArray(args[0])) {
          errors.push('First argument of Contains must be an array');
        }
        break;
    }
  }

  private validateNestedFunctionCalls(args: any[], errors: string[], warnings: string[]): void {
    args.forEach((arg, index) => {
      if (typeof arg === 'string' && this.isFunctionCall(arg)) {
        const parsed = this.parseFunctionCall(arg);
        if (parsed) {
          // Recursively validate the nested function call
          const nestedValidation = this.validateFunctionCall(parsed.name, parsed.args.map((a: string) => this.parseArgumentValue(a.trim())));
          
          if (!nestedValidation.isValid) {
            errors.push(`Nested function call in argument ${index + 1}: ${nestedValidation.errors[0]}`);
          }
          
          warnings.push(...nestedValidation.warnings.map(w => `Nested function call in argument ${index + 1}: ${w}`));
        }
      }
    });
  }

  private isFunctionCall(value: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)$/.test(value);
  }

  private getTypeOfValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check if it's a function call
      if (this.isFunctionCall(value)) {
        const parsed = this.parseFunctionCall(value);
        if (parsed) {
          return this.getFunctionReturnType(parsed.name);
        }
      }
      return 'string';
    }
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  private getFunctionReturnType(functionName: string): string {
    const functionDef = this.functionRegistry.get(functionName);
    if (!functionDef) return 'unknown';
    
    // Define return types for different function categories
    switch (functionDef.category) {
      case 'comparison':
      case 'logical':
        return 'boolean';
      case 'factory':
        if (functionName === 'Currency') return 'currency';
        if (functionName === 'Duration') return 'duration';
        return 'object';
      case 'utility':
        if (functionName === 'add') return 'number';
        return 'unknown';
      default:
        return 'unknown';
    }
  }

  private isTypeCompatible(actualType: string, expectedType: string): boolean {
    if (expectedType === 'any') return true;
    if (actualType === expectedType) return true;
    
    // Allow some type conversions
    if (expectedType === 'number' && actualType === 'string') {
      return !isNaN(Number(actualType));
    }
    
    return false;
  }

  getFunctionDefinition(name: string): FunctionDefinition | undefined {
    return this.functionRegistry.get(name);
  }

  getAllFunctions(): FunctionDefinition[] {
    return Array.from(this.functionRegistry.values());
  }

  getFunctionsByCategory(category: string): FunctionDefinition[] {
    return this.getAllFunctions().filter(func => func.category === category);
  }

  // Helper method to extract function name and arguments from a function call string
  parseFunctionCall(functionCall: string): any {
    const match = functionCall.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)$/);
    if (!match) return null;

    const name = match[1];
    const argsString = match[2].trim();
    
    if (argsString === '') {
      return { name, args: [] };
    }

    // Simple argument parsing (handles basic cases)
    const args = this.parseArguments(argsString);
    return { name, args: args };
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

  private parseArgumentValue(arg: string): any {
    // Remove quotes from strings
    if (arg.startsWith('"') && arg.endsWith('"')) {
      return arg.slice(1, -1);
    }
    
    // Parse numbers
    if (!isNaN(Number(arg))) {
      return Number(arg);
    }
    
    // Parse booleans
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    
    // Parse arrays (simple case)
    if (arg.startsWith('[') && arg.endsWith(']')) {
      const content = arg.slice(1, -1).trim();
      if (content === '') return [];
      return content.split(',').map(item => this.parseArgumentValue(item.trim()));
    }
    
    // Return as string for identifiers and other cases
    return arg;
  }
}
 