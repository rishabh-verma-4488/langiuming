import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, startLanguageServer } from 'langium/lsp';
import { inject } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { EmptyFileSystem, FileSystemProvider } from 'langium';
import { SpecterGeneratedModule, SpecterGeneratedSharedModule } from './generated/module';
import { SpecterCustomModule } from './specter-custom-module';

console.log('[SPECTER-DEBUG] LangiumWorker: Starting initialization');

// Create a custom file system provider for browser environment
class BrowserFileSystemProvider implements FileSystemProvider {
    private documents = new Map<string, string>();

    readFile(uri: string): Promise<string> {
        const content = this.documents.get(uri) || '';
        return Promise.resolve(content);
    }

    writeFile(uri: string, content: string): Promise<void> {
        this.documents.set(uri, content);
        return Promise.resolve();
    }

    readFileSync(uri: string): string {
        return this.documents.get(uri) || '';
    }

    writeFileSync(uri: string, content: string): void {
        this.documents.set(uri, content);
    }

    exists(uri: string): Promise<boolean> {
        return Promise.resolve(this.documents.has(uri));
    }

    existsSync(uri: string): boolean {
        return this.documents.has(uri);
    }

    stat(uri: string): Promise<{ isFile(): boolean; isDirectory(): boolean; mtime: Date; size: number }> {
        const exists = this.documents.has(uri);
        return Promise.resolve({
            isFile: () => exists,
            isDirectory: () => false,
            mtime: new Date(),
            size: exists ? this.documents.get(uri)!.length : 0
        });
    }

    statSync(uri: string): { isFile(): boolean; isDirectory(): boolean; mtime: Date; size: number } {
        const exists = this.documents.has(uri);
        return {
            isFile: () => exists,
            isDirectory: () => false,
            mtime: new Date(),
            size: exists ? this.documents.get(uri)!.length : 0
        };
    }

    readDirectory(uri: string): Promise<Array<{ name: string; isFile(): boolean; isDirectory(): boolean }>> {
        return Promise.resolve([]);
    }

    readDirectorySync(uri: string): Array<{ name: string; isFile(): boolean; isDirectory(): boolean }> {
        return [];
    }

    createDirectory(uri: string): Promise<void> {
        return Promise.resolve();
    }

    createDirectorySync(uri: string): void {
        // No-op
    }

    delete(uri: string): Promise<void> {
        this.documents.delete(uri);
        return Promise.resolve();
    }

    deleteSync(uri: string): void {
        this.documents.delete(uri);
    }

    rename(oldUri: string, newUri: string): Promise<void> {
        const content = this.documents.get(oldUri);
        if (content) {
            this.documents.set(newUri, content);
            this.documents.delete(oldUri);
        }
        return Promise.resolve();
    }

    renameSync(oldUri: string, newUri: string): void {
        const content = this.documents.get(oldUri);
        if (content) {
            this.documents.set(newUri, content);
            this.documents.delete(oldUri);
        }
    }

    watch(uri: string): { dispose(): void } {
        return { dispose: () => { } };
    }
}

// Create message reader and writer for web worker communication
const messageReader = new BrowserMessageReader(self as any);
const messageWriter = new BrowserMessageWriter(self as any);
const connection = createConnection(messageReader, messageWriter);

console.log('[SPECTER-DEBUG] LangiumWorker: Connection created');

// Create Langium services with Specter grammar and validation
const context: DefaultSharedModuleContext = {
    connection: connection as any,
    fileSystemProvider: () => new BrowserFileSystemProvider()
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
