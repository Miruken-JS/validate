import { Variance, decorate } from "miruken-core";
import { addDefinition, $define } from "miruken-callback";

/**
 * Definition for validating objects
 * @property {Function} $validate
 */
export const $validate = $define(Variance.Contravariant);

/**
 * Marks method as providing validation capabilities.
 * @method validate
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validate(...types) {
    return decorate(addDefinition("validate", $validate), types);
}

