import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, startLanguageServer } from 'langium/lsp';
import { inject } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { EmptyFileSystem } from 'langium';
import { SpecterGeneratedModule, SpecterGeneratedSharedModule } from './generated/module';
import { SpecterCustomModule } from './specter-custom-module';

console.log('[SPECTER-DEBUG] LangiumWorker: Starting initialization');

// Create message reader and writer for web worker communication
const messageReader = new BrowserMessageReader(self as any);
const messageWriter = new BrowserMessageWriter(self as any);
const connection = createConnection(messageReader, messageWriter);

console.log('[SPECTER-DEBUG] LangiumWorker: Connection created');

// Create Langium services with Specter grammar and validation
const context: DefaultSharedModuleContext = {
    connection: connection as any,
    fileSystemProvider: () => EmptyFileSystem.fileSystemProvider()
};

console.log('[SPECTER-DEBUG] LangiumWorker: Context created');
console.log('[SPECTER-DEBUG] LangiumWorker: SpecterGeneratedSharedModule:', SpecterGeneratedSharedModule);
console.log('[SPECTER-DEBUG] LangiumWorker: SpecterGeneratedModule:', SpecterGeneratedModule);
console.log('[SPECTER-DEBUG] LangiumWorker: SpecterCustomModule:', SpecterCustomModule);

const shared = inject(
    createDefaultSharedModule(context),
    SpecterGeneratedSharedModule
);

console.log('[SPECTER-DEBUG] LangiumWorker: Shared services created');
console.log('[SPECTER-DEBUG] LangiumWorker: Shared services type:', typeof shared);

const Specter = inject(
    createDefaultModule({ shared }),
    SpecterGeneratedModule,
    SpecterCustomModule
);

console.log('[SPECTER-DEBUG] LangiumWorker: Specter services created');
console.log('[SPECTER-DEBUG] LangiumWorker: Specter services type:', typeof Specter);

shared.ServiceRegistry.register(Specter);

console.log('[SPECTER-DEBUG] LangiumWorker: Services registered');

// Start the language server
console.log('[SPECTER-DEBUG] LangiumWorker: Starting language server');
startLanguageServer(shared);
console.log('[SPECTER-DEBUG] LangiumWorker: Language server started');
