import { Hover, AstNode, MaybePromise } from 'vscode-languageserver';
import { HoverProvider, LangiumDocument } from 'langium';
import { SpecterServices } from './specter-custom-module';

/**
 * Langium Hover Provider for Specter language
 * Provides rich documentation on hover for functions and other language elements
 */
export class SpecterHoverProvider implements HoverProvider {
    private functionDocumentation: Map<string, FunctionDocumentation> = new Map();

    constructor(services: SpecterServices) {
        this.initializeFunctionDocumentation();
        console.log('[SPECTER-DEBUG] SpecterHoverProvider: Initialized with', this.functionDocumentation.size, 'functions');
    }

    /**
     * Initialize comprehensive function documentation
     */
    private initializeFunctionDocumentation(): void {
        const functions: FunctionDocumentation[] = [
            // Comparison functions
            {
                name: 'GreaterThan',
                signature: 'GreaterThan(left: any, right: any)',
                description: 'Compares two values and returns true if the left operand is greater than the right operand.',
                parameters: [
                    { name: 'left', type: 'any', description: 'The left operand to compare' },
                    { name: 'right', type: 'any', description: 'The right operand to compare' }
                ],
                returnType: 'boolean',
                examples: [
                    'GreaterThan(10, 5) // Returns true',
                    'GreaterThan(Currency(100, "USD"), Currency(50, "USD")) // Returns true',
                    'GreaterThan(Duration(2, "MONTHS"), Duration(1, "MONTHS")) // Returns true'
                ],
                notes: 'Supports numbers, currencies, and durations. Type-safe comparisons are enforced.'
            },
            {
                name: 'LessThan',
                signature: 'LessThan(left: any, right: any)',
                description: 'Compares two values and returns true if the left operand is less than the right operand.',
                parameters: [
                    { name: 'left', type: 'any', description: 'The left operand to compare' },
                    { name: 'right', type: 'any', description: 'The right operand to compare' }
                ],
                returnType: 'boolean',
                examples: [
                    'LessThan(5, 10) // Returns true',
                    'LessThan(Currency(50, "USD"), Currency(100, "USD")) // Returns true'
                ],
                notes: 'Supports numbers, currencies, and durations. Type-safe comparisons are enforced.'
            },
            {
                name: 'Equals',
                signature: 'Equals(left: any, right: any)',
                description: 'Compares two values for equality and returns true if they are equal.',
                parameters: [
                    { name: 'left', type: 'any', description: 'The left operand to compare' },
                    { name: 'right', type: 'any', description: 'The right operand to compare' }
                ],
                returnType: 'boolean',
                examples: [
                    'Equals(5, 5) // Returns true',
                    'Equals("hello", "hello") // Returns true',
                    'Equals(Currency(100, "USD"), Currency(100, "USD")) // Returns true'
                ],
                notes: 'Supports all types. Performs deep equality comparison.'
            },
            {
                name: 'Not',
                signature: 'Not(value: boolean)',
                description: 'Returns the logical NOT of the boolean value.',
                parameters: [
                    { name: 'value', type: 'boolean', description: 'The boolean value to negate' }
                ],
                returnType: 'boolean',
                examples: [
                    'Not(true) // Returns false',
                    'Not(false) // Returns true',
                    'Not(Empty("hello")) // Returns true'
                ],
                notes: 'Only accepts boolean values. Use with comparison functions.'
            },
            {
                name: 'Empty',
                signature: 'Empty(value: string)',
                description: 'Checks if a string is empty or null.',
                parameters: [
                    { name: 'value', type: 'string', description: 'The string to check' }
                ],
                returnType: 'boolean',
                examples: [
                    'Empty("") // Returns true',
                    'Empty("hello") // Returns false',
                    'Empty(null) // Returns true'
                ],
                notes: 'Returns true for null, undefined, or empty strings.'
            },
            {
                name: 'Contains',
                signature: 'Contains(array: array, value: any)',
                description: 'Checks if an array contains the specified value.',
                parameters: [
                    { name: 'array', type: 'array', description: 'The array to search in' },
                    { name: 'value', type: 'any', description: 'The value to search for' }
                ],
                returnType: 'boolean',
                examples: [
                    'Contains([1, 2, 3], 2) // Returns true',
                    'Contains(["a", "b", "c"], "d") // Returns false',
                    'Contains([], "anything") // Returns false'
                ],
                notes: 'Performs strict equality comparison for array elements.'
            },
            // Arithmetic functions
            {
                name: 'add',
                signature: 'add(left: number, right: number)',
                description: 'Adds two numbers together.',
                parameters: [
                    { name: 'left', type: 'number', description: 'The first number' },
                    { name: 'right', type: 'number', description: 'The second number' }
                ],
                returnType: 'number',
                examples: [
                    'add(5, 3) // Returns 8',
                    'add(10, -5) // Returns 5',
                    'add(0.5, 0.3) // Returns 0.8'
                ],
                notes: 'Supports integers and floating-point numbers.'
            },
            {
                name: 'subtract',
                signature: 'subtract(left: number, right: number)',
                description: 'Subtracts the right operand from the left operand.',
                parameters: [
                    { name: 'left', type: 'number', description: 'The number to subtract from' },
                    { name: 'right', type: 'number', description: 'The number to subtract' }
                ],
                returnType: 'number',
                examples: [
                    'subtract(10, 3) // Returns 7',
                    'subtract(5, 8) // Returns -3',
                    'subtract(0.8, 0.3) // Returns 0.5'
                ],
                notes: 'Supports integers and floating-point numbers.'
            },
            {
                name: 'multiply',
                signature: 'multiply(left: number, right: number)',
                description: 'Multiplies two numbers together.',
                parameters: [
                    { name: 'left', type: 'number', description: 'The first number' },
                    { name: 'right', type: 'number', description: 'The second number' }
                ],
                returnType: 'number',
                examples: [
                    'multiply(4, 5) // Returns 20',
                    'multiply(2.5, 4) // Returns 10',
                    'multiply(-3, 4) // Returns -12'
                ],
                notes: 'Supports integers and floating-point numbers.'
            },
            {
                name: 'divide',
                signature: 'divide(left: number, right: number)',
                description: 'Divides the left operand by the right operand.',
                parameters: [
                    { name: 'left', type: 'number', description: 'The dividend' },
                    { name: 'right', type: 'number', description: 'The divisor' }
                ],
                returnType: 'number',
                examples: [
                    'divide(10, 2) // Returns 5',
                    'divide(7, 3) // Returns 2.333...',
                    'divide(0, 5) // Returns 0'
                ],
                notes: 'Division by zero will throw an error. Returns floating-point result.'
            },
            // Special type constructors
            {
                name: 'Currency',
                signature: 'Currency(amount: number, currencyCode: string)',
                description: 'Creates a currency value with the specified amount and currency code.',
                parameters: [
                    { name: 'amount', type: 'number', description: 'The monetary amount' },
                    { name: 'currencyCode', type: 'string', description: 'The ISO currency code (e.g., "USD", "EUR")' }
                ],
                returnType: 'currency',
                examples: [
                    'Currency(100, "USD") // Creates $100 USD',
                    'Currency(50.25, "EUR") // Creates €50.25 EUR',
                    'Currency(0, "JPY") // Creates ¥0 JPY'
                ],
                notes: 'Currency codes should follow ISO 4217 standard. Supports all major currencies.'
            },
            {
                name: 'Duration',
                signature: 'Duration(value: number, unit: string)',
                description: 'Creates a duration value with the specified amount and time unit.',
                parameters: [
                    { name: 'value', type: 'number', description: 'The duration amount' },
                    { name: 'unit', type: 'string', description: 'The time unit ("DAYS", "WEEKS", "MONTHS", "YEARS")' }
                ],
                returnType: 'duration',
                examples: [
                    'Duration(30, "DAYS") // Creates 30 days',
                    'Duration(6, "MONTHS") // Creates 6 months',
                    'Duration(1, "YEARS") // Creates 1 year'
                ],
                notes: 'Supported units: DAYS, WEEKS, MONTHS, YEARS. Case-sensitive.'
            },
            // String functions
            {
                name: 'Length',
                signature: 'Length(value: string | array)',
                description: 'Returns the length of a string or array.',
                parameters: [
                    { name: 'value', type: 'string | array', description: 'The string or array to measure' }
                ],
                returnType: 'number',
                examples: [
                    'Length("hello") // Returns 5',
                    'Length([1, 2, 3, 4]) // Returns 4',
                    'Length("") // Returns 0'
                ],
                notes: 'Works with both strings and arrays. Returns 0 for empty values.'
            },
            {
                name: 'Substring',
                signature: 'Substring(text: string, start: number, length: number)',
                description: 'Extracts a substring from a string starting at the specified position.',
                parameters: [
                    { name: 'text', type: 'string', description: 'The source string' },
                    { name: 'start', type: 'number', description: 'The starting position (0-based)' },
                    { name: 'length', type: 'number', description: 'The number of characters to extract' }
                ],
                returnType: 'string',
                examples: [
                    'Substring("hello", 1, 3) // Returns "ell"',
                    'Substring("world", 0, 2) // Returns "wo"',
                    'Substring("test", 2, 10) // Returns "st" (truncated)'
                ],
                notes: 'Start position is 0-based. Returns empty string if start is beyond string length.'
            },
            {
                name: 'Concat',
                signature: 'Concat(left: string | array, right: string | array)',
                description: 'Concatenates two strings or arrays together.',
                parameters: [
                    { name: 'left', type: 'string | array', description: 'The first string or array' },
                    { name: 'right', type: 'string | array', description: 'The second string or array' }
                ],
                returnType: 'string | array',
                examples: [
                    'Concat("hello", "world") // Returns "helloworld"',
                    'Concat([1, 2], [3, 4]) // Returns [1, 2, 3, 4]',
                    'Concat("", "test") // Returns "test"'
                ],
                notes: 'Both operands must be of the same type (string or array).'
            },
            {
                name: 'ToUpper',
                signature: 'ToUpper(text: string)',
                description: 'Converts a string to uppercase.',
                parameters: [
                    { name: 'text', type: 'string', description: 'The string to convert' }
                ],
                returnType: 'string',
                examples: [
                    'ToUpper("hello") // Returns "HELLO"',
                    'ToUpper("World") // Returns "WORLD"',
                    'ToUpper("123") // Returns "123"'
                ],
                notes: 'Only affects alphabetic characters. Numbers and symbols remain unchanged.'
            },
            {
                name: 'ToLower',
                signature: 'ToLower(text: string)',
                description: 'Converts a string to lowercase.',
                parameters: [
                    { name: 'text', type: 'string', description: 'The string to convert' }
                ],
                returnType: 'string',
                examples: [
                    'ToLower("HELLO") // Returns "hello"',
                    'ToLower("World") // Returns "world"',
                    'ToLower("123") // Returns "123"'
                ],
                notes: 'Only affects alphabetic characters. Numbers and symbols remain unchanged.'
            }
        ];

        // Store in map for quick lookup
        functions.forEach(func => {
            this.functionDocumentation.set(func.name, func);
        });
    }

    /**
     * Implement the HoverProvider interface for Langium
     * Langium passes a different parameter structure than standard LSP
     */
    async getHoverContent(params: any): Promise<Hover | undefined> {
        console.log('[SPECTER-DEBUG] SpecterHoverProvider: Getting hover content for params:', params);
        console.log('[SPECTER-DEBUG] SpecterHoverProvider: Params keys:', Object.keys(params || {}));

        try {
            // Simple fix: access the _content property directly
            const text = params.textDocument._content;

            if (!text) {
                console.log('[SPECTER-DEBUG] SpecterHoverProvider: No text found in _content');
                return undefined;
            }

            console.log('[SPECTER-DEBUG] SpecterHoverProvider: Text length:', text.length);

            // Find any function names in the text and return hover for the first one found
            const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
            console.log('[SPECTER-DEBUG] SpecterHoverProvider: Found words in text:', words);

            // Look for any function names we know about
            for (const word of words) {
                if (this.functionDocumentation.has(word)) {
                    const documentation = this.functionDocumentation.get(word);
                    if (documentation) {
                        console.log('[SPECTER-DEBUG] SpecterHoverProvider: Returning hover for word:', word);
                        return this.createFunctionHover(documentation);
                    }
                }
            }

            console.log('[SPECTER-DEBUG] SpecterHoverProvider: No known function names found in text');
            return undefined;
        } catch (error) {
            console.error('[SPECTER-DEBUG] SpecterHoverProvider: Error in getHoverContent:', error);
            return undefined;
        }
    }

    /**
     * Get the word at the specified offset in text
     */
    private getWordAtOffset(text: string, offset: number): string | null {
        try {
            // Find word boundaries
            let start = offset;
            let end = offset;

            // Move start backwards to find word start
            while (start > 0 && /\w/.test(text[start - 1])) {
                start--;
            }

            // Move end forwards to find word end
            while (end < text.length && /\w/.test(text[end])) {
                end++;
            }

            if (start < end) {
                return text.substring(start, end);
            }

            return null;
        } catch (error) {
            console.error('[SPECTER-DEBUG] SpecterHoverProvider: Error getting word at offset:', error);
            return null;
        }
    }

    /**
     * Check if the AST node is a function call
     */
    private isFunctionCall(node: AstNode): boolean {
        // This would need to be adapted based on your AST structure
        // For now, we'll check if the node has a 'function' property
        return node && typeof node === 'object' && 'function' in node;
    }

    /**
     * Extract function name from AST node
     */
    private getFunctionName(node: AstNode): string | null {
        // This would need to be adapted based on your AST structure
        if (node && typeof node === 'object' && 'function' in node) {
            const funcNode = (node as any).function;
            if (funcNode && typeof funcNode === 'object' && 'name' in funcNode) {
                return funcNode.name;
            }
        }
        return null;
    }

    /**
     * Create hover content for a function
     */
    private createFunctionHover(doc: FunctionDocumentation): Hover {
        const markdown = this.formatFunctionDocumentation(doc);

        return {
            contents: {
                kind: 'markdown',
                value: markdown
            }
        };
    }

    /**
     * Format function documentation as markdown
     */
    private formatFunctionDocumentation(doc: FunctionDocumentation): string {
        let markdown = `## **${doc.name}**\n\n`;

        // Signature
        markdown += `\`\`\`specter\n${doc.signature}\n\`\`\`\n\n`;

        // Description
        markdown += `**Description:** ${doc.description}\n\n`;

        // Parameters
        if (doc.parameters && doc.parameters.length > 0) {
            markdown += `**Parameters:**\n`;
            doc.parameters.forEach(param => {
                markdown += `- \`${param.name}: ${param.type}\` - ${param.description}\n`;
            });
            markdown += `\n`;
        }

        // Return type
        markdown += `**Returns:** \`${doc.returnType}\`\n\n`;

        // Examples
        if (doc.examples && doc.examples.length > 0) {
            markdown += `**Examples:**\n\`\`\`specter\n`;
            doc.examples.forEach(example => {
                markdown += `${example}\n`;
            });
            markdown += `\`\`\`\n\n`;
        }

        // Notes
        if (doc.notes) {
            markdown += `**Notes:** ${doc.notes}\n`;
        }

        return markdown;
    }

    /**
     * Get function documentation by name (for use by other providers)
     */
    getFunctionDocumentation(funcName: string): FunctionDocumentation | undefined {
        return this.functionDocumentation.get(funcName);
    }
}

/**
 * Interface for function documentation
 */
interface FunctionDocumentation {
    name: string;
    signature: string;
    description: string;
    parameters: Array<{
        name: string;
        type: string;
        description: string;
    }>;
    returnType: string;
    examples: string[];
    notes?: string;
}
