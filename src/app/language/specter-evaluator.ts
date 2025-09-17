import { 
    Model, 
    Expression, 
    LogicalExpression,
    PrimaryExpression,
    FunctionCall,
    ParenthesizedExpression,
    Literal,
    NumberLiteral,
    StringLiteral,
    BooleanLiteral,
    ArrayLiteral
} from './generated/ast.js';

export interface EvaluationResult {
    value: any;
    type: string;
    success: boolean;
    error?: string;
}

export class SpecterEvaluator {
    private functionRegistry = new Map<string, FunctionImplementation>();

    constructor() {
        this.registerBuiltinFunctions();
    }

    private registerBuiltinFunctions(): void {
        this.functionRegistry.set('GreaterThan', {
            name: 'GreaterThan',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('GreaterThan expects 2 arguments');
                return { value: args[0] > args[1], type: 'boolean' };
            }
        });

        this.functionRegistry.set('LessThan', {
            name: 'LessThan',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('LessThan expects 2 arguments');
                return { value: args[0] < args[1], type: 'boolean' };
            }
        });

        this.functionRegistry.set('Equals', {
            name: 'Equals',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('Equals expects 2 arguments');
                return { value: args[0] === args[1], type: 'boolean' };
            }
        });

        this.functionRegistry.set('Not', {
            name: 'Not',
            implementation: (args: any[]) => {
                if (args.length !== 1) throw new Error('Not expects 1 argument');
                return { value: !args[0], type: 'boolean' };
            }
        });

        this.functionRegistry.set('Empty', {
            name: 'Empty',
            implementation: (args: any[]) => {
                if (args.length !== 1) throw new Error('Empty expects 1 argument');
                return { value: !args[0] || args[0].length === 0, type: 'boolean' };
            }
        });

        this.functionRegistry.set('Contains', {
            name: 'Contains',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('Contains expects 2 arguments');
                if (!Array.isArray(args[0])) throw new Error('First argument must be an array');
                return { value: args[0].includes(args[1]), type: 'boolean' };
            }
        });

        this.functionRegistry.set('add', {
            name: 'add',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('add expects 2 arguments');
                return { value: args[0] + args[1], type: 'number' };
            }
        });

        this.functionRegistry.set('subtract', {
            name: 'subtract',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('subtract expects 2 arguments');
                return { value: args[0] - args[1], type: 'number' };
            }
        });

        this.functionRegistry.set('multiply', {
            name: 'multiply',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('multiply expects 2 arguments');
                return { value: args[0] * args[1], type: 'number' };
            }
        });

        this.functionRegistry.set('divide', {
            name: 'divide',
            implementation: (args: any[]) => {
                if (args.length !== 2) throw new Error('divide expects 2 arguments');
                if (args[1] === 0) throw new Error('Division by zero');
                return { value: args[0] / args[1], type: 'number' };
            }
        });
    }

    evaluateModel(model: Model): EvaluationResult[] {
        const results: EvaluationResult[] = [];
        
        for (const expression of model.expressions) {
            const result = this.evaluateExpression(expression);
            results.push(result);
        }
        
        return results;
    }

    evaluateExpression(expression: Expression): EvaluationResult {
        try {
            if (expression.$type === 'LogicalExpression') {
                const logical = expression as LogicalExpression;
                const leftResult = this.evaluateExpression(logical.left);
                if (!leftResult.success) return leftResult;
                
                if (logical.right) {
                    const rightResult = this.evaluateExpression(logical.right);
                    if (!rightResult.success) return rightResult;
                    
                    // Handle both AND and OR operators
                    if (logical.operator === 'AND') {
                        return { value: leftResult.value && rightResult.value, type: 'boolean', success: true };
                    } else if (logical.operator === 'OR') {
                        return { value: leftResult.value || rightResult.value, type: 'boolean', success: true };
                    }
                }
                
                return leftResult;
            } else if (expression.$type === 'PrimaryExpression') {
                const primary = expression as PrimaryExpression;
                return this.evaluatePrimaryExpression(primary);
            }
            
            return { value: null, type: 'error', success: false, error: 'Unknown expression type' };
        } catch (error) {
            return { 
                value: null, 
                type: 'error', 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }

    private evaluatePrimaryExpression(primary: PrimaryExpression): EvaluationResult {
        if (primary.$type === 'FunctionCall') {
            return this.evaluateFunctionCall(primary as FunctionCall);
        } else if (primary.$type === 'ParenthesizedExpression') {
            const paren = primary as ParenthesizedExpression;
            return this.evaluateExpression(paren.expression);
        } else if (primary.$type === 'Literal') {
            return this.evaluateLiteral(primary as Literal);
        }
        
        return { value: null, type: 'error', success: false, error: 'Unknown primary expression type' };
    }

    private evaluateLiteral(literal: Literal): EvaluationResult {
        if (literal.$type === 'NumberLiteral') {
            const numLiteral = literal as NumberLiteral;
            return { value: numLiteral.value, type: 'number', success: true };
        } else if (literal.$type === 'StringLiteral') {
            const strLiteral = literal as StringLiteral;
            return { value: strLiteral.value, type: 'string', success: true };
        } else if (literal.$type === 'BooleanLiteral') {
            const boolLiteral = literal as BooleanLiteral;
            return { value: boolLiteral.value, type: 'boolean', success: true };
        } else if (literal.$type === 'ArrayLiteral') {
            const arrayLiteral = literal as ArrayLiteral;
            const values = arrayLiteral.values.map(expr => this.evaluateExpression(expr).value);
            return { value: values, type: 'array', success: true };
        }
        
        return { value: null, type: 'error', success: false, error: 'Unknown literal type' };
    }

    private evaluateFunctionCall(call: FunctionCall): EvaluationResult {
        const args = call.arguments?.values.map(expr => this.evaluateExpression(expr).value) || [];
        const func = this.functionRegistry.get(call.name);
        
        if (!func) {
            return { value: null, type: 'error', success: false, error: `Unknown function: ${call.name}` };
        }
        
        const result = func.implementation(args);
        return { value: result.value, type: result.type, success: true };
    }
}

interface FunctionImplementation {
    name: string;
    implementation: (args: any[]) => { value: any; type: string };
}
