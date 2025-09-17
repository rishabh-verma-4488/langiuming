import { ValidationAcceptor, ValidationChecks } from 'langium';

// Temporary AST types until Langium generates them
// These will be replaced by the actual generated types from langium.config.js
export interface Model {
    $type: 'Model';
    expressions: Expression[];
}

export interface Expression {
    $type: string;
}

export interface LogicalExpression extends Expression {
    $type: 'LogicalExpression';
    left: Expression;
    right?: Expression;
    operator?: 'AND' | 'OR';
}

export interface PrimaryExpression extends Expression {
    $type: 'PrimaryExpression';
}

export interface FunctionCall extends Expression {
    $type: 'FunctionCall';
    name: string;
    arguments?: FunctionArguments;
}

export interface FunctionArguments {
    values: Expression[];
}

export interface ParenthesizedExpression extends Expression {
    $type: 'ParenthesizedExpression';
    expression: Expression;
}

export interface Literal extends Expression {
    $type: 'Literal';
}

export interface NumberLiteral extends Expression {
    $type: 'NumberLiteral';
    value: number;
}

export interface StringLiteral extends Expression {
    $type: 'StringLiteral';
    value: string;
}

export interface BooleanLiteral extends Expression {
    $type: 'BooleanLiteral';
    value: boolean;
}

export interface ArrayLiteral extends Expression {
    $type: 'ArrayLiteral';
    values: Expression[];
}

export type SpecterAstType = Model | Expression | LogicalExpression | PrimaryExpression | FunctionCall | FunctionArguments | ParenthesizedExpression | Literal | NumberLiteral | StringLiteral | BooleanLiteral | ArrayLiteral;

/** Function signature for built-in functions */
interface FunctionSignature {
    name: string;
    parameters: Array<{ name: string; type: string; optional?: boolean }>;
    returnType: string;
    description?: string;
}

    /** Validates Specter language expressions and function calls */
    export class SpecterValidator {
        private functionRegistry = new Map<string, FunctionSignature>();

        constructor() {
            this.registerBuiltinFunctions();
        }

        /** Registers built-in functions with their signatures */
        private registerBuiltinFunctions(): void {
            // ===== COMPARISON FUNCTIONS =====
            // Functions that return boolean values based on comparisons
            this.functionRegistry.set('GreaterThan', {
                name: 'GreaterThan',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'boolean',
                description: 'Returns true if left is greater than right'
            });

            this.functionRegistry.set('LessThan', {
                name: 'LessThan',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'boolean',
                description: 'Returns true if left is less than right'
            });

            this.functionRegistry.set('Equals', {
                name: 'Equals',
                parameters: [
                    { name: 'left', type: 'any' },
                    { name: 'right', type: 'any' }
                ],
                returnType: 'boolean',
                description: 'Returns true if left equals right'
            });

            this.functionRegistry.set('Not', {
                name: 'Not',
                parameters: [
                    { name: 'value', type: 'boolean' }
                ],
                returnType: 'boolean',
                description: 'Returns the logical NOT of the value'
            });

            this.functionRegistry.set('Empty', {
                name: 'Empty',
                parameters: [
                    { name: 'value', type: 'string' }
                ],
                returnType: 'boolean',
                description: 'Returns true if the string is empty or null'
            });

            this.functionRegistry.set('Contains', {
                name: 'Contains',
                parameters: [
                    { name: 'array', type: 'array' },
                    { name: 'value', type: 'any' }
                ],
                returnType: 'boolean',
                description: 'Returns true if the array contains the value'
            });

            // ===== ARITHMETIC FUNCTIONS =====
            // Functions that perform mathematical operations and return numbers
            this.functionRegistry.set('add', {
                name: 'add',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'number',
                description: 'Adds two numbers'
            });

            this.functionRegistry.set('subtract', {
                name: 'subtract',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'number',
                description: 'Subtracts right from left'
            });

            this.functionRegistry.set('multiply', {
                name: 'multiply',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'number',
                description: 'Multiplies two numbers'
            });

            this.functionRegistry.set('divide', {
                name: 'divide',
                parameters: [
                    { name: 'left', type: 'number' },
                    { name: 'right', type: 'number' }
                ],
                returnType: 'number',
                description: 'Divides left by right'
            });

            // ===== SPECIAL FUNCTIONS =====
            // Functions that create special data types (Currency, Duration)
            this.functionRegistry.set('Currency', {
                name: 'Currency',
                parameters: [
                    { name: 'amount', type: 'number' },
                    { name: 'currencyCode', type: 'string' }
                ],
                returnType: 'currency',
                description: 'Creates a currency value with amount and currency code'
            });

            // Duration functions
            this.functionRegistry.set('Duration', {
                name: 'Duration',
                parameters: [
                    { name: 'value', type: 'number' },
                    { name: 'unit', type: 'string' }
                ],
                returnType: 'duration',
                description: 'Creates a duration value with amount and unit (DAYS, WEEKS, MONTHS, YEARS)'
            });
        }

        /** Validates all expressions in the model */
        checkModel(model: Model, accept: ValidationAcceptor): void {
            for (const expression of model.expressions) {
                this.checkExpression(expression, accept);
            }
        }

        /** Validates an expression and its sub-expressions */
        checkExpression(expression: Expression, accept: ValidationAcceptor): void {
            if (expression.$type === 'LogicalExpression') {
                const logical = expression as LogicalExpression;
                this.checkExpression(logical.left, accept);
                if (logical.right) {
                    this.checkExpression(logical.right, accept);
                }
            }
        }

        /** Validates logical expressions (AND/OR) */
        checkLogicalExpression(logical: LogicalExpression, accept: ValidationAcceptor): void {
            this.checkExpression(logical.left, accept);
            if (logical.right) {
                this.checkExpression(logical.right, accept);
            }
        }

        /** Validates primary expressions (function calls, literals, parentheses) */
        checkPrimaryExpression(primary: PrimaryExpression, accept: ValidationAcceptor): void {
            // PrimaryExpression is a union type, so we need to check the actual type
            if ((primary as any).$type === 'FunctionCall') {
                this.checkFunctionCall(primary as any as FunctionCall, accept);
            } else if ((primary as any).$type === 'ParenthesizedExpression') {
                const paren = primary as any as ParenthesizedExpression;
                this.checkExpression(paren.expression, accept);
            }
            // Literals don't need additional validation beyond parsing
        }

        /** Validates function calls (name, parameters, types) */
        checkFunctionCall(call: FunctionCall, accept: ValidationAcceptor): void {
            const signature = this.functionRegistry.get(call.name);
            
            // Check if function exists in registry
            if (!signature) {
                accept('error', `Unknown function '${call.name}'. Available functions: ${Array.from(this.functionRegistry.keys()).join(', ')}`, {
                    node: call,
                    property: 'name'
                });
                return;
            }

            // Validate parameter count
            const expectedParamCount = signature.parameters.length;
            const actualParamCount = call.arguments?.values.length || 0;

            if (actualParamCount < expectedParamCount) {
                const requiredParams = signature.parameters.filter(p => !p.optional).length;
                if (actualParamCount < requiredParams) {
                    accept('error', `Function '${call.name}' requires at least ${requiredParams} arguments, got ${actualParamCount}.`, {
                        node: call,
                        property: 'arguments'
                    });
                }
            } else if (actualParamCount > expectedParamCount) {
                accept('error', `Function '${call.name}' expects at most ${expectedParamCount} arguments, got ${actualParamCount}.`, {
                    node: call,
                    property: 'arguments'
                });
            }

            // Validate argument types
            if (call.arguments) {
                call.arguments.values.forEach((arg: Expression, index: number) => {
                    if (index < signature.parameters.length) {
                        const expectedType = signature.parameters[index].type;
                        const actualType = this.getExpressionType(arg);
                        
                        if (actualType && !this.isTypeCompatible(actualType, expectedType)) {
                            accept('error', `Argument ${index + 1} of '${call.name}' expects type '${expectedType}', got '${actualType}'.`, {
                                node: arg,
                                property: 'name'
                            });
                        }
                    }
                });
            }

            // Apply function-specific validation rules
            this.validateSpecificFunction(call, accept);
        }

        /** Applies special validation rules for Currency and Duration functions */
        private validateSpecificFunction(call: FunctionCall, accept: ValidationAcceptor): void {
            // Validate Currency function: currency code should be 3 characters
            if (call.name === 'Currency' && call.arguments && call.arguments.values.length >= 2) {
                const currencyArg = call.arguments.values[1];
                if (currencyArg.$type === 'StringLiteral') {
                    const currency = (currencyArg as StringLiteral).value;
                    if (currency.length !== 3) {
                        accept('warning', 'Currency code should be 3 characters long (e.g., "USD")', {
                            node: currencyArg,
                            property: 'value'
                        });
                    }
                }
            } 
            // Validate Duration function: unit should be valid duration unit
            else if (call.name === 'Duration' && call.arguments && call.arguments.values.length >= 2) {
                const unitArg = call.arguments.values[1];
                if (unitArg.$type === 'StringLiteral') {
                    const unit = (unitArg as StringLiteral).value;
                    const validUnits = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
                    if (!validUnits.includes(unit)) {
                        accept('error', `Invalid duration unit '${unit}'. Valid units: ${validUnits.join(', ')}`, {
                            node: unitArg,
                            property: 'value'
                        });
                    }
                }
            }
        }

        /** Validates parenthesized expressions */
        checkParenthesizedExpression(paren: ParenthesizedExpression, accept: ValidationAcceptor): void {
            this.checkExpression(paren.expression, accept);
        }

        /** Validates literals (numbers, strings, booleans) */
        checkLiteral(literal: Literal, accept: ValidationAcceptor): void {
            // Literals are already validated by the parser, no additional validation needed
        }

        /** Validates array literals */
        checkArrayLiteral(array: ArrayLiteral, accept: ValidationAcceptor): void {
            for (const value of array.values) {
                this.checkExpression(value, accept);
            }
        }

        /** Gets the type of an expression */
        private getExpressionType(expression: Expression): string | null {
            if (expression.$type === 'NumberLiteral') {
                return 'number';
            } else if (expression.$type === 'StringLiteral') {
                return 'string';
            } else if (expression.$type === 'BooleanLiteral') {
                return 'boolean';
            } else if (expression.$type === 'ArrayLiteral') {
                return 'array';
            } else if (expression.$type === 'FunctionCall') {
                const call = expression as FunctionCall;
                const signature = this.functionRegistry.get(call.name);
                return signature?.returnType || null;
            } else if (expression.$type === 'LogicalExpression') {
                return 'boolean';
            } else if (expression.$type === 'ParenthesizedExpression') {
                const paren = expression as ParenthesizedExpression;
                return this.getExpressionType(paren.expression);
            }
            
            return null;
        }

        /** Checks if two types are compatible */
        private isTypeCompatible(actual: string, expected: string): boolean {
            if (actual === expected) return true;
            if (expected === 'any') return true;
            return false;
        }
    }

/** Validation registry for AST node types */
export type SpecterValidationRegistry = ValidationChecks<SpecterAstType>;

export const SpecterValidationRegistry: SpecterValidationRegistry = {
    // Note: The actual validation registry will be populated by Langium generation
    // These are placeholder validators that will be replaced with the generated ones
} as any;
