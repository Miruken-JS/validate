import { ContravariantPolicy } from "miruken-callback";

/**
 * Policy for validating instnces.
 * @property {Function} provides
 */        
export const validates = ContravariantPolicy.createDecorator("validates");

