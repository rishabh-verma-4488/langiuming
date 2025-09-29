import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';

export class MonacoLSPClient {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
    private isConnected = false;
    private monaco: any = null;
    private editor: any = null;

    async initialize(): Promise<void> {
        try {
            // Create web worker for Langium LSP server using the proper langium-worker.ts
            this.worker = new Worker(new URL('./langium-worker.ts', import.meta.url), { type: 'module' });

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
                    },
                    completion: {
                        dynamicRegistration: true,
                        completionItem: {
                            snippetSupport: true,
                            commitCharactersSupport: true,
                            documentationFormat: ['markdown', 'plaintext']
                        }
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

    // Handle completion requests from Monaco
    async getCompletion(uri: string, position: { line: number; character: number }): Promise<any> {
        console.log('[LSP-DEBUG] getCompletion called with URI:', uri, 'position:', position);
        console.log('[LSP-DEBUG] LSP connected:', this.isConnected);

        if (!this.isConnected) {
            console.log('[LSP-DEBUG] LSP not connected, returning empty completion');
            return { items: [] };
        }

        console.log('[LSP-DEBUG] Requesting completion for:', uri, 'at position:', position);

        try {
            const response = await this.sendRequest('textDocument/completion', {
                textDocument: { uri },
                position: {
                    line: position.line,
                    character: position.character
                }
            });

            console.log('[LSP-DEBUG] Completion response:', response);
            return response || { items: [] };
        } catch (error) {
            console.error('[LSP-DEBUG] Error getting completion:', error);
            return { items: [] };
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
