import { ContravariantPolicy } from "@miruken/core";

/**
 * Policy for validating instnces.
 * @property {Function} provides
 */        
export const validates = ContravariantPolicy.createDecorator("validates");

