import { createDefaultSharedCoreModule, createDefaultCoreModule, DefaultSharedCoreModuleContext, inject, LangiumCoreServices, LangiumSharedCoreServices, Module, PartialLangiumCoreServices } from 'langium';
import { SpecterGeneratedModule, SpecterGeneratedSharedModule } from './generated/module';
import { SpecterValidationRegistry } from './specter-validation';

export type SpecterAddedServices = {
    // Add any custom services here if needed
}

export type SpecterServices = LangiumCoreServices & SpecterAddedServices;

export const SpecterCustomModule: Module<SpecterServices, PartialLangiumCoreServices & SpecterAddedServices> = {
    validation: {
        ValidationRegistry: () => SpecterValidationRegistry
    }
};

export function createSpecterServices(context: DefaultSharedCoreModuleContext): {
    shared: LangiumSharedCoreServices,
    Specter: SpecterServices
} {
    const shared = inject(
        createDefaultSharedCoreModule(context),
        SpecterGeneratedSharedModule
    );

    const Specter = inject(
        createDefaultCoreModule({ shared }),
        SpecterGeneratedModule,
        SpecterCustomModule
    );

    shared.ServiceRegistry.register(Specter);
    return { shared, Specter };
}