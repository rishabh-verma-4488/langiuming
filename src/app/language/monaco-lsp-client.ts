import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { SpecterValidator } from './specter-validator';

export class MonacoLSPClient {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
    private isConnected = false;
    private monaco: any = null;
    private editor: any = null;

    async initialize(): Promise<void> {
        try {
            // Create web worker for Langium LSP server
            // Use hybrid approach: working inline worker + Langium validation
            this.worker = this.createHybridWorker();
            
            // Set up message handling
            this.worker.onmessage = (event) => {
                console.log('Worker message received:', event.data);
                this.handleMessage(event.data);
            };

            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
            };

            this.worker.onmessageerror = (error) => {
                console.error('Worker message error:', error);
            };

            // Wait a bit for worker to be ready
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Initialize the LSP connection
            await this.initializeLSP();
            console.log('Monaco LSP client started successfully');
        } catch (error) {
            console.error('Failed to initialize Monaco LSP client:', error);
            throw error;
        }
    }

    private async initializeLSP(): Promise<void> {
        const initParams = {
            processId: null,
            rootUri: null,
            capabilities: {
                textDocument: {
                    publishDiagnostics: {
                        relatedInformation: true
                    }
                }
            },
            workspaceFolders: null
        };

        const response = await this.sendRequest('initialize', initParams);
        console.log('LSP initialized:', response);
        
        // Send initialized notification
        this.sendNotification('initialized', {});
        this.isConnected = true;
    }

    private sendRequest(method: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            this.pendingRequests.set(id, { resolve, reject });

            this.worker?.postMessage({
                jsonrpc: '2.0',
                id,
                method,
                params
            });

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`Request timeout: ${method}`));
                }
            }, 30000);
        });
    }

    private sendNotification(method: string, params: any): void {
        this.worker?.postMessage({
            jsonrpc: '2.0',
            method,
            params
        });
    }

    private handleMessage(message: any): void {
        if (message.jsonrpc === '2.0') {
            if (message.id !== undefined) {
                // Response to a request
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    this.pendingRequests.delete(message.id);
                    if (message.error) {
                        pending.reject(new Error(message.error.message || 'LSP Error'));
                    } else {
                        pending.resolve(message.result);
                    }
                }
            } else if (message.method) {
                // Notification
                this.handleNotification(message.method, message.params);
            }
        }
    }

    private handleNotification(method: string, params: any): void {
        switch (method) {
            case 'textDocument/publishDiagnostics':
                this.handleDiagnostics(params);
                break;
            case 'worker/ready':
                console.log('Worker is ready:', params);
                break;
            default:
                console.log('Unhandled notification:', method, params);
        }
    }

    private handleDiagnostics(params: any): void {
        console.log('=== DIAGNOSTICS RECEIVED ===');
        console.log('Params:', params);
        console.log('Monaco available:', !!this.monaco);
        console.log('Editor available:', !!this.editor);
        
        if (!this.monaco || !this.editor) {
            console.log('Monaco editor not set, skipping diagnostics');
            return;
        }

        const diagnostics = params.diagnostics || [];
        const uri = params.uri;
        
        console.log('Number of diagnostics:', diagnostics.length);
        console.log('URI:', uri);
        
        // Convert LSP diagnostics to Monaco markers
        const markers = diagnostics.map((diagnostic: any) => {
            const severity = this.convertLSPSeverityToMonaco(diagnostic.severity);
            const range = diagnostic.range;
            
            const marker = {
                startLineNumber: range.start.line + 1, // LSP is 0-based, Monaco is 1-based
                startColumn: range.start.character + 1,
                endLineNumber: range.end.line + 1,
                endColumn: range.end.character + 1,
                message: diagnostic.message,
                severity: severity,
                source: diagnostic.source || 'Specter LSP'
            };
            
            console.log('Created marker:', marker);
            return marker;
        });

        console.log('All markers:', markers);

        // Apply markers to the editor
        try {
            this.monaco.editor.setModelMarkers(this.editor.getModel(), 'specter-lsp', markers);
            console.log(`✅ Applied ${markers.length} markers to editor`);
            
            // Also try to get current markers to verify
            const currentMarkers = this.monaco.editor.getModelMarkers({ resource: this.editor.getModel().uri });
            console.log('Current markers in editor:', currentMarkers);
        } catch (error) {
            console.error('Error applying markers:', error);
        }
    }

    private convertLSPSeverityToMonaco(lspSeverity: number): number {
        // LSP severity: 1=Error, 2=Warning, 3=Info, 4=Hint
        // Monaco severity: 8=Error, 4=Warning, 2=Info, 1=Hint
        switch (lspSeverity) {
            case 1: return 8; // Error
            case 2: return 4; // Warning
            case 3: return 2; // Info
            case 4: return 1; // Hint
            default: return 8; // Default to error
        }
    }

    // Public methods for document management
    async openDocument(uri: string, content: string): Promise<void> {
        if (!this.isConnected) {
            console.log('LSP not connected, skipping document open');
            return;
        }
        
        console.log('Opening document:', uri, 'Content length:', content.length);
        this.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri,
                languageId: 'specter',
                version: 1,
                text: content
            }
        });
    }

    async updateDocument(uri: string, content: string, version: number): Promise<void> {
        if (!this.isConnected) {
            console.log('LSP not connected, skipping document update');
            return;
        }
        
        console.log('Updating document:', uri, 'Version:', version, 'Content length:', content.length);
        this.sendNotification('textDocument/didChange', {
            textDocument: {
                uri,
                version
            },
            contentChanges: [{
                text: content
            }]
        });
    }

    async closeDocument(uri: string): Promise<void> {
        if (!this.isConnected) return;
        
        this.sendNotification('textDocument/didClose', {
            textDocument: {
                uri
            }
        });
    }

    async dispose(): Promise<void> {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isConnected = false;
        this.pendingRequests.clear();
    }

    isInitialized(): boolean {
        return this.isConnected;
    }

    setMonacoEditor(monaco: any, editor: any): void {
        this.monaco = monaco;
        this.editor = editor;
        
        // Test: Add a simple marker to verify Monaco is working
        console.log('Setting up Monaco editor, testing markers...');
        this.testMarkers();
    }

    private createHybridWorker(): Worker {
        // Create a hybrid worker: working inline structure + Specter validation logic
        const workerCode = `
            // Specter Validator - Simplified version for inline worker
            class SpecterValidator {
                constructor() {
                    console.log('SpecterValidator initialized');
                    this.functionRegistry = new Map();
                    this.registerBuiltinFunctions();
                }
                
                registerBuiltinFunctions() {
                    // Comparison functions
                    this.functionRegistry.set('GreaterThan', {
                        name: 'GreaterThan',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    this.functionRegistry.set('LessThan', {
                        name: 'LessThan',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    this.functionRegistry.set('Equals', {
                        name: 'Equals',
                        parameters: [
                            { name: 'left', type: 'any' },
                            { name: 'right', type: 'any' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    this.functionRegistry.set('Not', {
                        name: 'Not',
                        parameters: [
                            { name: 'value', type: 'boolean' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    this.functionRegistry.set('Empty', {
                        name: 'Empty',
                        parameters: [
                            { name: 'value', type: 'string' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    this.functionRegistry.set('Contains', {
                        name: 'Contains',
                        parameters: [
                            { name: 'array', type: 'array' },
                            { name: 'value', type: 'any' }
                        ],
                        returnType: 'boolean'
                    });
                    
                    // Arithmetic functions
                    this.functionRegistry.set('add', {
                        name: 'add',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'number'
                    });
                    
                    this.functionRegistry.set('subtract', {
                        name: 'subtract',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'number'
                    });
                    
                    this.functionRegistry.set('multiply', {
                        name: 'multiply',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'number'
                    });
                    
                    this.functionRegistry.set('divide', {
                        name: 'divide',
                        parameters: [
                            { name: 'left', type: 'number' },
                            { name: 'right', type: 'number' }
                        ],
                        returnType: 'number'
                    });
                    
                    // Special functions
                    this.functionRegistry.set('Currency', {
                        name: 'Currency',
                        parameters: [
                            { name: 'amount', type: 'number' },
                            { name: 'currencyCode', type: 'string' }
                        ],
                        returnType: 'currency'
                    });
                    
                    this.functionRegistry.set('Duration', {
                        name: 'Duration',
                        parameters: [
                            { name: 'value', type: 'number' },
                            { name: 'unit', type: 'string' }
                        ],
                        returnType: 'duration'
                    });
                }
                
                validateContent(content) {
                    const diagnostics = [];
                    const lines = content.split('\\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line && !line.startsWith('//')) {
                            const lineDiagnostics = this.validateLine(line, i);
                            diagnostics.push(...lineDiagnostics);
                        }
                    }
                    
                    return diagnostics;
                }
                
                validateLine(line, lineNumber) {
                    const diagnostics = [];
                    
                    // Simple regex-based parsing for function calls
                    const functionCallRegex = /\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*\\(/g;
                    let match;
                    
                    while ((match = functionCallRegex.exec(line)) !== null) {
                        const functionName = match[1];
                        const startPos = match.index;
                        const endPos = match.index + functionName.length;
                        
                        // Find the matching closing parenthesis
                        let parenCount = 1;
                        let pos = match.index + match[0].length;
                        let args = [];
                        
                        while (pos < line.length && parenCount > 0) {
                            if (line[pos] === '(') parenCount++;
                            else if (line[pos] === ')') parenCount--;
                            else if (line[pos] === ',' && parenCount === 1) {
                                // Simple argument splitting (not perfect but works for basic cases)
                                const arg = line.substring(match.index + match[0].length, pos).trim();
                                if (arg) args.push(arg);
                            }
                            pos++;
                        }
                        
                        // Validate the function call
                        const signature = this.functionRegistry.get(functionName);
                        
                        if (!signature) {
                            const availableFunctions = Array.from(this.functionRegistry.keys()).join(', ');
                            diagnostics.push({
                                range: {
                                    start: { line: lineNumber, character: startPos },
                                    end: { line: lineNumber, character: endPos }
                                },
                                message: \`Unknown function '\${functionName}'. Available functions: \${availableFunctions}\`,
                                severity: 1 // Error
                            });
                        } else {
                            // Validate argument count
                            const expectedParamCount = signature.parameters.length;
                            const actualParamCount = args.length;
                            
                            if (actualParamCount < expectedParamCount) {
                                const requiredParams = signature.parameters.filter(p => !p.optional).length;
                                if (actualParamCount < requiredParams) {
                                    diagnostics.push({
                                        range: {
                                            start: { line: lineNumber, character: startPos },
                                            end: { line: lineNumber, character: startPos + functionName.length }
                                        },
                                        message: \`Function '\${functionName}' requires at least \${requiredParams} arguments, got \${actualParamCount}\`,
                                        severity: 1 // Error
                                    });
                                }
                            } else if (actualParamCount > expectedParamCount) {
                                diagnostics.push({
                                    range: {
                                        start: { line: lineNumber, character: startPos },
                                        end: { line: lineNumber, character: startPos + functionName.length }
                                    },
                                    message: \`Function '\${functionName}' expects at most \${expectedParamCount} arguments, got \${actualParamCount}\`,
                                    severity: 1 // Error
                                });
                            }
                            
                            // Special validation for Currency and Duration
                            if (functionName === 'Currency' && args.length >= 2) {
                                const currencyCode = args[1].replace(/"/g, '');
                                if (currencyCode.length !== 3) {
                                    diagnostics.push({
                                        range: {
                                            start: { line: lineNumber, character: startPos },
                                            end: { line: lineNumber, character: startPos + functionName.length }
                                        },
                                        message: 'Currency code should be 3 characters long (e.g., "USD")',
                                        severity: 2 // Warning
                                    });
                                }
                            } else if (functionName === 'Duration' && args.length >= 2) {
                                const unit = args[1].replace(/"/g, '');
                                const validUnits = ['DAYS', 'WEEKS', 'MONTHS', 'YEARS'];
                                if (!validUnits.includes(unit)) {
                                    diagnostics.push({
                                        range: {
                                            start: { line: lineNumber, character: startPos },
                                            end: { line: lineNumber, character: startPos + functionName.length }
                                        },
                                        message: \`Invalid duration unit '\${unit}'. Valid units: \${validUnits.join(', ')}\`,
                                        severity: 1 // Error
                                    });
                                }
                            }
                        }
                    }
                    
                    return diagnostics;
                }
            }
            
            // Initialize validator
            const validator = new SpecterValidator();
            let currentContent = '';
            
            // Handle LSP messages
            self.onmessage = function(event) {
                console.log('Worker received message:', event.data);
                
                if (event.data.jsonrpc === '2.0') {
                    if (event.data.method === 'initialize') {
                        // Send initialize response
                        self.postMessage({
                            jsonrpc: '2.0',
                            id: event.data.id,
                            result: {
                                capabilities: {
                                    textDocument: {
                                        publishDiagnostics: {
                                            relatedInformation: true
                                        }
                                    }
                                }
                            }
                        });
                    } else if (event.data.method === 'textDocument/didOpen') {
                        // Handle document open
                        currentContent = event.data.params.textDocument.text;
                        validateAndSendDiagnostics();
                    } else if (event.data.method === 'textDocument/didChange') {
                        // Handle document change
                        if (event.data.params.contentChanges && event.data.params.contentChanges.length > 0) {
                            currentContent = event.data.params.contentChanges[0].text;
                            validateAndSendDiagnostics();
                        }
                    }
                }
            };
            
            function validateAndSendDiagnostics() {
                if (!currentContent) return;
                
                // Validate the content using Specter validator
                const diagnostics = validator.validateContent(currentContent);
                
                // Send diagnostics back to the editor
                self.postMessage({
                    jsonrpc: '2.0',
                    method: 'textDocument/publishDiagnostics',
                    params: {
                        uri: 'file:///specter-document',
                        diagnostics: diagnostics
                    }
                });
            }
            
            console.log('Hybrid Specter LSP worker started successfully');
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    }

    private testMarkers(): void {
        if (!this.monaco || !this.editor) return;
        
        // Add a test marker to verify Monaco markers work
        const testMarkers = [{
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 10,
            message: 'Test marker - Monaco is working!',
            severity: 8, // Error
            source: 'Test'
        }];
        
        this.monaco.editor.setModelMarkers(this.editor.getModel(), 'test', testMarkers);
        console.log('Test markers applied');
        
        // Remove test markers after 3 seconds
        setTimeout(() => {
            this.monaco.editor.setModelMarkers(this.editor.getModel(), 'test', []);
            console.log('Test markers removed');
        }, 3000);
    }
}
