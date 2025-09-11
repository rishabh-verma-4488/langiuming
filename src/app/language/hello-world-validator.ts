import { ValidationAcceptor, ValidationChecks } from 'langium';
import { Model, GreetingStatement, AssignmentStatement, HelloWorldAstType } from './generated/ast.js';
import { FunctionValidator } from './function-validator.js';

export class HelloWorldValidator {
    private functionValidator = new FunctionValidator();

    checkModel(model: Model, accept: ValidationAcceptor): void {
        const names = new Set<string>();
        for (const statement of model.statements) {
            if (statement.$type === 'AssignmentStatement') {
                const assignment = statement as AssignmentStatement;
                if (names.has(assignment.name)) {
                    accept('error', `Duplicate assignment to variable '${assignment.name}'.`, {
                        node: assignment,
                        property: 'name'
                    });
                }
                names.add(assignment.name);
            }
        }
    }

    checkGreetingStatement(greeting: GreetingStatement, accept: ValidationAcceptor): void {
        if (greeting.target.length < 2) {
            accept('warning', 'Target name should be at least 2 characters long.', {
                node: greeting,
                property: 'target'
            });
        }
    }

    // Method to validate function calls from editor content
    validateFunctionCalls(content: string, accept: ValidationAcceptor): void {
        const lines = content.split('\n');
        
        lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
                // Find all function calls in the line
                const functionCallRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)/g;
                let match: RegExpExecArray | null;
                
                while ((match = functionCallRegex.exec(trimmedLine)) !== null) {
                    const functionCall = match[0];
                    const functionName = match[1];
                    
                    // Parse the function call
                    const parsed = this.functionValidator.parseFunctionCall(functionCall);
                    if (parsed) {
                        // Convert string arguments to their actual types for validation
                        const typedArguments = parsed.args.map((arg: string) => this.parseArgumentValue(arg.trim()));
                        
                        // Validate the function call
                        const validation = this.functionValidator.validateFunctionCall(parsed.name, typedArguments);
                        
                        // Add errors
                        validation.errors.forEach(error => {
                            accept('error', error, {
                                node: { $type: 'Model' } as any, // Create a dummy node for editor validation
                                property: 'statements'
                            });
                        });
                        
                        // Add warnings
                        validation.warnings.forEach(warning => {
                            accept('warning', warning, {
                                node: { $type: 'Model' } as any, // Create a dummy node for editor validation
                                property: 'statements'
                            });
                        });
                    }
                }
            }
        });
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

export type HelloWorldValidationRegistry = ValidationChecks<HelloWorldAstType>;

export const HelloWorldValidationRegistry: HelloWorldValidationRegistry = {
    // Model: new HelloWorldValidator().checkModel,
    // GreetingStatement: new HelloWorldValidator().checkGreetingStatement
};