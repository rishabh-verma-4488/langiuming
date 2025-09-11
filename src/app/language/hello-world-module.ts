import { createDefaultModule, createDefaultSharedModule, DefaultSharedModuleContext, inject, LangiumServices, LangiumSharedServices, Module, PartialLangiumServices } from 'langium';
import { HelloWorldGeneratedModule, HelloWorldGeneratedSharedModule } from './generated/module.js';
import { HelloWorldValidator, HelloWorldValidationRegistry } from './hello-world-validator.js';

export type HelloWorldAddedServices = {
    validation: {
        HelloWorldValidator: HelloWorldValidator
    }
}

export type HelloWorldServices = LangiumServices & HelloWorldAddedServices;

export const HelloWorldModule: Module<HelloWorldServices, PartialLangiumServices & HelloWorldAddedServices> = {
    validation: {
        HelloWorldValidator: () => new HelloWorldValidator()
    }
};

export function createHelloWorldServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    HelloWorld: HelloWorldServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        HelloWorldGeneratedSharedModule
    );
    const HelloWorld = inject(
        createDefaultModule({ shared }),
        HelloWorldGeneratedModule,
        HelloWorldModule
    );
    shared.ServiceRegistry.register(HelloWorld);
    return { shared, HelloWorld };
}