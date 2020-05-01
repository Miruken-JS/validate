import { Variance, decorate } from "miruken-core";
import { $policy, addPolicy } from "miruken-callback";

/**
 * Definition for validating objects
 * @property {Function} $validate
 */
export const $validate = $policy(Variance.Contravariant, "validate");

/**
 * Marks method as providing validation capabilities.
 * @method validates
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validates(...types) {
    return decorate(addPolicy("validate", $validate), types);
}

