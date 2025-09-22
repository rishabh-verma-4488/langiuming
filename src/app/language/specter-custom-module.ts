import { LangiumServices, PartialLangiumServices } from 'langium/lsp';
import { Module } from 'langium';
import { ValidationRegistry } from 'langium';
import { SpecterValidationRegistry } from './specter-validation';

export type SpecterAddedServices = {
    // Add any custom services here if needed
}

export type SpecterServices = LangiumServices & SpecterAddedServices;

console.log('[SPECTER-DEBUG] SpecterCustomModule: Initializing module');
console.log('[SPECTER-DEBUG] SpecterCustomModule: SpecterValidationRegistry type:', typeof SpecterValidationRegistry);
console.log('[SPECTER-DEBUG] SpecterCustomModule: SpecterValidationRegistry keys:', Object.keys(SpecterValidationRegistry));

export const SpecterCustomModule: Module<SpecterServices, PartialLangiumServices & SpecterAddedServices> = {
    validation: {
        ValidationRegistry: (services) => {
            console.log('[SPECTER-DEBUG] SpecterCustomModule: Creating ValidationRegistry with services');
            try {
                const registry = new ValidationRegistry(services);
                console.log('[SPECTER-DEBUG] SpecterCustomModule: ValidationRegistry created successfully');
                console.log('[SPECTER-DEBUG] SpecterCustomModule: Registering validation checks');
                registry.register(SpecterValidationRegistry);
                console.log('[SPECTER-DEBUG] SpecterCustomModule: Validation checks registered successfully');
                console.log('[SPECTER-DEBUG] SpecterCustomModule: Registry checksBefore:', registry.checksBefore);
                console.log('[SPECTER-DEBUG] SpecterCustomModule: Registry checksAfter:', registry.checksAfter);
                return registry;
            } catch (error) {
                console.error('[SPECTER-DEBUG] SpecterCustomModule: Error creating ValidationRegistry:', error);
                throw error;
            }
        }
    }
};