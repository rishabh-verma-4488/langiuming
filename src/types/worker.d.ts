// Type declarations for web worker support
declare global {
  interface DedicatedWorkerGlobalScope {
    postMessage(message: any, transfer?: Transferable[]): void;
    close(): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
    dispatchEvent(event: Event): boolean;
  }
}

export {};
