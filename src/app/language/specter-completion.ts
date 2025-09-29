import { CompletionItem, CompletionItemKind, CompletionList, CompletionParams, CancellationToken } from 'vscode-languageserver';
import { LangiumDocument, AstNode } from 'langium';
import { SpecterServices } from './specter-custom-module';
import { DefaultCompletionProvider } from 'langium/lsp';

/**
 * LSP Completion Provider for Specter language
 * Provides intelligent code completion with function names and context-aware suggestions
 */
export class SpecterCompletionProvider extends DefaultCompletionProvider {
    private functionNames: string[] = [
        // Comparison functions
        'GreaterThan', 'LessThan', 'Equals', 'Not', 'Empty', 'Contains',
        // Arithmetic functions
        'add', 'subtract', 'multiply', 'divide',
        // Special type constructors
        'Currency', 'Duration',
        // Additional utility functions
        'Length', 'Substring', 'Concat', 'ToUpper', 'ToLower'
    ];

    constructor(services: SpecterServices) {
        super(services);
        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Initialized with', this.functionNames.length, 'functions');
    }

    /**
     * Gets all available function names for Specter completion
     */
    getFunctionNames(): string[] {
        return [...this.functionNames];
    }

    /**
     * Gets function signature information for a specific function
     */
    getFunctionSignature(funcName: string): { name: string; parameters: string[]; returnType: string } | null {
        const signatures: { [key: string]: { name: string; parameters: string[]; returnType: string } } = {
            'GreaterThan': { name: 'GreaterThan', parameters: ['left: any', 'right: any'], returnType: 'boolean' },
            'LessThan': { name: 'LessThan', parameters: ['left: any', 'right: any'], returnType: 'boolean' },
            'Equals': { name: 'Equals', parameters: ['left: any', 'right: any'], returnType: 'boolean' },
            'Not': { name: 'Not', parameters: ['value: boolean'], returnType: 'boolean' },
            'Empty': { name: 'Empty', parameters: ['value: string'], returnType: 'boolean' },
            'Contains': { name: 'Contains', parameters: ['array: array', 'value: any'], returnType: 'boolean' },
            'add': { name: 'add', parameters: ['left: number', 'right: number'], returnType: 'number' },
            'subtract': { name: 'subtract', parameters: ['left: number', 'right: number'], returnType: 'number' },
            'multiply': { name: 'multiply', parameters: ['left: number', 'right: number'], returnType: 'number' },
            'divide': { name: 'divide', parameters: ['left: number', 'right: number'], returnType: 'number' },
            'Currency': { name: 'Currency', parameters: ['amount: number', 'currencyCode: string'], returnType: 'currency' },
            'Duration': { name: 'Duration', parameters: ['value: number', 'unit: string'], returnType: 'duration' },
            'Length': { name: 'Length', parameters: ['value: string | array'], returnType: 'number' },
            'Substring': { name: 'Substring', parameters: ['text: string', 'start: number', 'length: number'], returnType: 'string' },
            'Concat': { name: 'Concat', parameters: ['left: string | array', 'right: string | array'], returnType: 'string | array' },
            'ToUpper': { name: 'ToUpper', parameters: ['text: string'], returnType: 'string' },
            'ToLower': { name: 'ToLower', parameters: ['text: string'], returnType: 'string' }
        };

        return signatures[funcName] || null;
    }

    /**
     * Provides completion suggestions for Specter language
     * This method implements the Langium CompletionProvider interface
     */
    override async getCompletion(document: LangiumDocument, params: CompletionParams, cancelToken?: CancellationToken): Promise<CompletionList | undefined> {
        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Getting completion for document:', document.uri.toString());
        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Position:', params.position);

        try {
            // Get default completions from parent class
            const defaultCompletions = await super.getCompletion(document, params, cancelToken);
            console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Default completions received:', defaultCompletions);

            // Get Specter-specific completions
            const specterCompletions = this.getSpecterCompletions(document, params);

            console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Generated', specterCompletions.length, 'Specter completion items');
            console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Default completions:', defaultCompletions?.items?.length || 0, 'items');

            // Combine default and Specter completions
            const allItems = [
                ...(defaultCompletions?.items || []),
                ...specterCompletions
            ];

            const result = {
                items: allItems,
                isIncomplete: defaultCompletions?.isIncomplete || false
            };

            console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Final result:', result);
            return result;
        } catch (error) {
            console.error('[SPECTER-DEBUG] SpecterCompletionProvider: Error in getCompletion:', error);
            return {
                items: this.getSpecterCompletions(document, params),
                isIncomplete: false
            };
        }
    }


    /**
     * Provides Specter-specific completion suggestions
     */
    private getSpecterCompletions(document: LangiumDocument, params: CompletionParams): CompletionItem[] {
        const text = document.textDocument.getText();
        const offset = document.textDocument.offsetAt(params.position);

        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Text around cursor:', text.substring(Math.max(0, offset - 10), offset + 10));
        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Cursor offset:', offset);

        // Find the current context
        const context = this.getCompletionContext(text, offset);
        console.log('[SPECTER-DEBUG] SpecterCompletionProvider: Completion context:', context);

        const items: CompletionItem[] = [];

        if (context === 'function' || context === 'any') {
            // Provide function name completions
            this.functionNames.forEach(funcName => {
                items.push({
                    label: funcName,
                    kind: CompletionItemKind.Function,
                    detail: this.getFunctionDetail(funcName),
                    documentation: this.getFunctionDocumentation(funcName),
                    insertText: funcName + '('
                });
            });
        }

        if (context === 'logical' || context === 'any') {
            // Provide logical operators
            items.push({
                label: 'AND',
                kind: CompletionItemKind.Operator,
                detail: 'Logical AND operator',
                documentation: 'Logical AND operator for combining boolean expressions',
                insertText: ' AND '
            });

            items.push({
                label: 'OR',
                kind: CompletionItemKind.Operator,
                detail: 'Logical OR operator',
                documentation: 'Logical OR operator for combining boolean expressions',
                insertText: ' OR '
            });
        }

        if (context === 'literal' || context === 'any') {
            // Provide literal completions
            items.push({
                label: 'true',
                kind: CompletionItemKind.Value,
                detail: 'Boolean true',
                documentation: 'Boolean literal true',
                insertText: 'true'
            });

            items.push({
                label: 'false',
                kind: CompletionItemKind.Value,
                detail: 'Boolean false',
                documentation: 'Boolean literal false',
                insertText: 'false'
            });
        }

        return items;
    }

    /**
     * Determines the completion context based on the current position
     */
    private getCompletionContext(text: string, offset: number): string {
        // Look backwards from the current position to determine context
        let context = 'any';

        // Find the last non-whitespace character before the cursor
        let i = offset - 1;
        while (i >= 0 && /\s/.test(text[i])) {
            i--;
        }

        if (i >= 0) {
            const char = text[i];

            // If we're after a function name or opening parenthesis, suggest function parameters
            if (char === '(') {
                context = 'parameter';
            }
            // If we're after a logical operator, suggest expressions
            else if (text.substring(Math.max(0, i - 4), i + 1).match(/\b(AND|OR)\s*$/)) {
                context = 'logical';
            }
            // If we're at the start of a line or after certain characters, suggest functions
            else if (i === 0 || text[i] === ';' || text[i] === '\n' || text[i] === '(') {
                context = 'function';
            }
            // If we're in a comparison context, suggest literals
            else if (text.substring(Math.max(0, i - 10), i + 1).match(/\b(GreaterThan|LessThan|Equals|Not|Empty|Contains)\s*\(\s*$/)) {
                context = 'literal';
            }
        }

        return context;
    }

    /**
     * Gets detailed information about a function for completion
     */
    private getFunctionDetail(funcName: string): string {
        const details: { [key: string]: string } = {
            'GreaterThan': 'Compare two values (left > right)',
            'LessThan': 'Compare two values (left < right)',
            'Equals': 'Compare two values for equality',
            'Not': 'Logical NOT operation',
            'Empty': 'Check if string is empty',
            'Contains': 'Check if array contains value',
            'add': 'Add two numbers',
            'subtract': 'Subtract two numbers',
            'multiply': 'Multiply two numbers',
            'divide': 'Divide two numbers',
            'Currency': 'Create currency value',
            'Duration': 'Create duration value',
            'Length': 'Get string or array length',
            'Substring': 'Extract substring from string',
            'Concat': 'Concatenate strings or arrays',
            'ToUpper': 'Convert string to uppercase',
            'ToLower': 'Convert string to lowercase'
        };

        return details[funcName] || 'Specter function';
    }

    /**
     * Gets documentation for a function
     */
    private getFunctionDocumentation(funcName: string): string {
        const docs: { [key: string]: string } = {
            'GreaterThan': 'Returns true if the left operand is greater than the right operand. Supports numbers, currencies, and durations.',
            'LessThan': 'Returns true if the left operand is less than the right operand. Supports numbers, currencies, and durations.',
            'Equals': 'Returns true if the left operand equals the right operand. Supports all types.',
            'Not': 'Returns the logical NOT of the boolean value.',
            'Empty': 'Returns true if the string is empty or null.',
            'Contains': 'Returns true if the array contains the specified value.',
            'add': 'Adds two numbers, currencies, or durations together.',
            'subtract': 'Subtracts the right operand from the left operand.',
            'multiply': 'Multiplies two numbers, or a currency/duration by a number.',
            'divide': 'Divides the left operand by the right operand.',
            'Currency': 'Creates a currency value with amount and currency code (e.g., Currency(100, "USD")).',
            'Duration': 'Creates a duration value with amount and unit (e.g., Duration(30, "DAYS")).',
            'Length': 'Returns the length of a string or array.',
            'Substring': 'Extracts a substring from a string (e.g., Substring("hello", 1, 3) returns "ell").',
            'Concat': 'Concatenates strings or arrays together.',
            'ToUpper': 'Converts a string to uppercase.',
            'ToLower': 'Converts a string to lowercase.'
        };

        return docs[funcName] || 'Specter built-in function';
    }
}

// Export the completion provider class for use in modules

/**
 * Utility function to get Specter function names for completion
 * This can be used by other parts of the application
 */
export function getSpecterFunctionNames(): string[] {
    const provider = new SpecterCompletionProvider({} as SpecterServices);
    return provider.getFunctionNames();
}

/**
 * Utility function to get Specter function signature
 * This can be used by other parts of the application
 */
export function getSpecterFunctionSignature(funcName: string): { name: string; parameters: string[]; returnType: string } | null {
    const provider = new SpecterCompletionProvider({} as SpecterServices);
    return provider.getFunctionSignature(funcName);
}
