import { ValidationAcceptor, ValidationChecks } from 'langium';
import { SpecterAstType, Model, FunctionCall, LogicalExpression, ParenthesizedExpression, ArrayLiteral, StringLiteral, Expression, isFunctionCall, isLogicalExpression, isParenthesizedExpression, isArrayLiteral, isStringLiteral, isNumberLiteral, isBooleanLiteral } from './generated/ast';

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
        this.functionRegistry.set('Currency', {
            name: 'Currency',
            parameters: [
                { name: 'amount', type: 'number' },
                { name: 'currencyCode', type: 'string' }
            ],
            returnType: 'currency',
            description: 'Creates a currency value with amount and currency code'
        });

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
        if (isLogicalExpression(expression)) {
            this.checkLogicalExpression(expression, accept);
        } else if (isFunctionCall(expression)) {
            this.checkFunctionCall(expression, accept);
        } else if (isParenthesizedExpression(expression)) {
            this.checkParenthesizedExpression(expression, accept);
        } else if (isArrayLiteral(expression)) {
            this.checkArrayLiteral(expression, accept);
        }
        // Literals (NumberLiteral, StringLiteral, BooleanLiteral) don't need additional validation
    }

    /** Validates logical expressions (AND/OR) */
    checkLogicalExpression(logical: LogicalExpression, accept: ValidationAcceptor): void {
        // LogicalExpression.left and right are PrimaryExpression, which are also Expression
        this.checkExpression(logical.left as Expression, accept);
        if (logical.right) {
            this.checkExpression(logical.right as Expression, accept);
        }
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
                            node: arg
                        });
                    }
                }
                // Recursively validate argument expressions
                this.checkExpression(arg, accept);
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
            if (isStringLiteral(currencyArg)) {
                const currency = currencyArg.value.replace(/"/g, ''); // Remove quotes
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
            if (isStringLiteral(unitArg)) {
                const unit = unitArg.value.replace(/"/g, ''); // Remove quotes
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

    /** Validates array literals */
    checkArrayLiteral(array: ArrayLiteral, accept: ValidationAcceptor): void {
        for (const value of array.values) {
            this.checkExpression(value, accept);
        }
    }

    /** Gets the type of an expression */
    private getExpressionType(expression: Expression): string | null {
        if (isNumberLiteral(expression)) {
            return 'number';
        } else if (isStringLiteral(expression)) {
            return 'string';
        } else if (isBooleanLiteral(expression)) {
            return 'boolean';
        } else if (isArrayLiteral(expression)) {
            return 'array';
        } else if (isFunctionCall(expression)) {
            const signature = this.functionRegistry.get(expression.name);
            return signature?.returnType || null;
        } else if (isLogicalExpression(expression)) {
            return 'boolean';
        } else if (isParenthesizedExpression(expression)) {
            return this.getExpressionType(expression.expression);
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

// Create a single validator instance to reuse
const validator = new SpecterValidator();

export const SpecterValidationRegistry: SpecterValidationRegistry = {
    Model: (model, accept) => validator.checkModel(model, accept),
    FunctionCall: (call, accept) => validator.checkFunctionCall(call, accept),
    LogicalExpression: (logical, accept) => validator.checkLogicalExpression(logical, accept),
    ParenthesizedExpression: (paren, accept) => validator.checkParenthesizedExpression(paren, accept),
    ArrayLiteral: (array, accept) => validator.checkArrayLiteral(array, accept)
};