import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, startLanguageServer } from 'langium/lsp';
import { inject } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { EmptyFileSystem } from 'langium';
import { SpecterGeneratedModule, SpecterGeneratedSharedModule } from './generated/module';
import { SpecterCustomModule } from './specter-custom-module';

// Create message reader and writer for web worker communication
const messageReader = new BrowserMessageReader(self as any);
const messageWriter = new BrowserMessageWriter(self as any);
const connection = createConnection(messageReader, messageWriter);

// Create Langium services with Specter grammar and validation
const context: DefaultSharedModuleContext = {
    connection: connection as any,
    fileSystemProvider: () => EmptyFileSystem.fileSystemProvider()
};

const shared = inject(
    createDefaultSharedModule(context),
    SpecterGeneratedSharedModule
);

const Specter = inject(
    createDefaultModule({ shared }),
    SpecterGeneratedModule,
    SpecterCustomModule
);

shared.ServiceRegistry.register(Specter);

// Start the language server
startLanguageServer(shared);
