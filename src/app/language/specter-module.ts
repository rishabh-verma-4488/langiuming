import { createDefaultCoreModule, createDefaultSharedCoreModule, DefaultSharedCoreModuleContext, inject, LangiumCoreServices, LangiumSharedCoreServices, Module, PartialLangiumCoreServices } from 'langium';
import { SpecterValidator, SpecterValidationRegistry } from './specter-validator';
import { SpecterEvaluator } from './specter-evaluator';

    export type SpecterAddedServices = {
        validation: {
            SpecterValidator: SpecterValidator
        },
        evaluation: {
            SpecterEvaluator: SpecterEvaluator
        }
    }

    export type SpecterServices = LangiumCoreServices & SpecterAddedServices;

    export const SpecterModule: Module<SpecterServices, PartialLangiumCoreServices & SpecterAddedServices> = {
        validation: {
            SpecterValidator: () => new SpecterValidator()
        },
        evaluation: {
            SpecterEvaluator: () => new SpecterEvaluator()
        }
    };

    export function createSpecterServices(context: DefaultSharedCoreModuleContext): {
        shared: LangiumSharedCoreServices,
        Specter: SpecterServices
    } {
        const shared = inject(
            createDefaultSharedCoreModule(context)
        );
        const Specter = inject(
            createDefaultCoreModule({ shared }),
            SpecterModule
        );
        (shared as any).ServiceRegistry.register(Specter);
        return { shared, Specter };
    }
