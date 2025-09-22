import { ValidationAcceptor, ValidationChecks } from 'langium';
import { SpecterAstType, Model, FunctionCall, LogicalExpression, ParenthesizedExpression, ArrayLiteral, Expression, isFunctionCall, isLogicalExpression, isParenthesizedExpression, isArrayLiteral, isStringLiteral, isNumberLiteral, isBooleanLiteral } from './generated/ast';

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
        console.log('[SPECTER-DEBUG] SpecterValidator constructor: Starting');
        this.registerBuiltinFunctions();
        console.log('[SPECTER-DEBUG] SpecterValidator constructor: Completed, registered', this.functionRegistry.size, 'functions');
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
        console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: Starting validation');
        console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: Model type:', model?.$type);
        console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: Expressions array:', model?.expressions);
        console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: Accept function type:', typeof accept);

        try {
            // Add defensive check for model and expressions
            if (!model) {
                console.warn('[SPECTER-DEBUG] SpecterValidator.checkModel: Model is null or undefined');
                return;
            }

            if (!model.expressions || !Array.isArray(model.expressions)) {
                console.warn('[SPECTER-DEBUG] SpecterValidator.checkModel: Model.expressions is not an array:', model.expressions);
                return;
            }

            // Add defensive check for accept function
            if (typeof accept !== 'function') {
                console.error('[SPECTER-DEBUG] SpecterValidator.checkModel: Accept function is not a function:', typeof accept);
                return;
            }

            for (const expression of model.expressions) {
                console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: Processing expression:', expression?.$type);
                this.checkExpression(expression, accept);
            }
            console.log('[SPECTER-DEBUG] SpecterValidator.checkModel: All expressions processed');
        } catch (error) {
            console.error('[SPECTER-DEBUG] SpecterValidator.checkModel: Error in validation loop:', error);
            // Don't re-throw the error to prevent breaking the validation process
            console.error('[SPECTER-DEBUG] SpecterValidator.checkModel: Continuing validation despite error');
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
        // Validate left and right operands recursively
        // Use AstUtils to safely navigate the AST
        const leftExpr = logical.left;
        const rightExpr = logical.right;

        if (leftExpr) {
            this.validatePrimaryExpression(leftExpr, accept);
        }
        if (rightExpr) {
            this.validatePrimaryExpression(rightExpr, accept);
        }
    }

    /** Validates primary expressions (function calls, literals, parentheses) */
    private validatePrimaryExpression(expr: any, accept: ValidationAcceptor): void {
        if (isFunctionCall(expr)) {
            this.checkFunctionCall(expr, accept);
        } else if (isParenthesizedExpression(expr)) {
            this.checkParenthesizedExpression(expr, accept);
        } else if (isArrayLiteral(expr)) {
            this.checkArrayLiteral(expr, accept);
        }
        // Literals don't need additional validation
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
            // Safely access the nested expression
            const nestedExpr = (expression as any).expression;
            return nestedExpr ? this.getExpressionType(nestedExpr) : null;
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

/**
 * Singleton validator instance
 */
console.log('[SPECTER-DEBUG] Creating SpecterValidator singleton instance');
const validatorInstance = new SpecterValidator();
console.log('[SPECTER-DEBUG] SpecterValidator singleton created:', typeof validatorInstance);
console.log('[SPECTER-DEBUG] SpecterValidator methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(validatorInstance)));

/**
 * Validation functions for Specter AST nodes
 */

function validateModel(model: Model, accept: ValidationAcceptor): void {
    console.log('[SPECTER-DEBUG] validateModel: Called with model:', model?.$type);
    console.log('[SPECTER-DEBUG] validateModel: Model expressions count:', model?.expressions?.length);
    try {
        if (!model) {
            console.warn('[SPECTER-DEBUG] validateModel: Model is null or undefined');
            return;
        }
        validatorInstance.checkModel(model, accept);
        console.log('[SPECTER-DEBUG] validateModel: Completed successfully');
    } catch (error) {
        console.error('[SPECTER-DEBUG] validateModel: Error occurred:', error);
        // Don't re-throw to prevent breaking the validation process
        console.error('[SPECTER-DEBUG] validateModel: Continuing validation despite error');
    }
}

function validateFunctionCall(call: FunctionCall, accept: ValidationAcceptor): void {
    console.log('[SPECTER-DEBUG] validateFunctionCall: Called with function:', call?.name);
    console.log('[SPECTER-DEBUG] validateFunctionCall: Function type:', call?.$type);
    try {
        if (!call) {
            console.warn('[SPECTER-DEBUG] validateFunctionCall: FunctionCall is null or undefined');
            return;
        }
        validatorInstance.checkFunctionCall(call, accept);
        console.log('[SPECTER-DEBUG] validateFunctionCall: Completed successfully');
    } catch (error) {
        console.error('[SPECTER-DEBUG] validateFunctionCall: Error occurred:', error);
        // Don't re-throw to prevent breaking the validation process
        console.error('[SPECTER-DEBUG] validateFunctionCall: Continuing validation despite error');
    }
}

function validateLogicalExpression(logical: LogicalExpression, accept: ValidationAcceptor): void {
    console.log('[SPECTER-DEBUG] validateLogicalExpression: Called with operator:', logical?.operator);
    console.log('[SPECTER-DEBUG] validateLogicalExpression: Expression type:', logical?.$type);
    try {
        if (!logical) {
            console.warn('[SPECTER-DEBUG] validateLogicalExpression: LogicalExpression is null or undefined');
            return;
        }
        validatorInstance.checkLogicalExpression(logical, accept);
        console.log('[SPECTER-DEBUG] validateLogicalExpression: Completed successfully');
    } catch (error) {
        console.error('[SPECTER-DEBUG] validateLogicalExpression: Error occurred:', error);
        // Don't re-throw to prevent breaking the validation process
        console.error('[SPECTER-DEBUG] validateLogicalExpression: Continuing validation despite error');
    }
}

console.log('[SPECTER-DEBUG] SpecterValidationRegistry: Creating registry');

/**
 * Register custom validation checks.
 */
export const SpecterValidationRegistry: ValidationChecks<SpecterAstType> = {
    Model: validateModel,
    FunctionCall: validateFunctionCall,
    LogicalExpression: validateLogicalExpression
};

console.log('[SPECTER-DEBUG] SpecterValidationRegistry: Registry created with keys:', Object.keys(SpecterValidationRegistry));
console.log('[SPECTER-DEBUG] SpecterValidationRegistry: Registry functions:', {
    Model: typeof SpecterValidationRegistry.Model,
    FunctionCall: typeof SpecterValidationRegistry.FunctionCall,
    LogicalExpression: typeof SpecterValidationRegistry.LogicalExpression
});