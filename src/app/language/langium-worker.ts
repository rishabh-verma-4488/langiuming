import { startLanguageServer } from 'langium/lsp';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, LangiumServices, LangiumSharedServices, PartialLangiumServices } from 'langium/lsp';
import { inject, Module } from 'langium';
import { EmptyFileSystem } from 'langium';
import { SpecterValidator } from './specter-validator';
import { SpecterEvaluator } from './specter-evaluator';

// Create message reader and writer for web worker communication
const messageReader = new BrowserMessageReader(self as any);
const messageWriter = new BrowserMessageWriter(self as any);
const connection = createConnection(messageReader, messageWriter);

// Define Specter services
export type SpecterAddedServices = {
    validation: {
        SpecterValidator: SpecterValidator
    },
    evaluation: {
        SpecterEvaluator: SpecterEvaluator
    }
}

export type SpecterServices = LangiumServices & SpecterAddedServices;

export const SpecterModule: Module<SpecterServices, PartialLangiumServices & SpecterAddedServices> = {
    validation: {
        SpecterValidator: () => new SpecterValidator()
    },
    evaluation: {
        SpecterEvaluator: () => new SpecterEvaluator()
    }
};

// Create Langium services
const context: DefaultSharedModuleContext = {
    connection: connection as any,
    fileSystemProvider: (services) => EmptyFileSystem.fileSystemProvider()
};

const shared = inject(
    createDefaultSharedModule(context)
);

const Specter = inject(
    createDefaultModule({ shared }),
    SpecterModule
);

shared.ServiceRegistry.register(Specter);

// Start the language server
startLanguageServer(shared);
