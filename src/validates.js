import { decorate } from "miruken-core";

import { 
    ContravariantPolicy, registerHandlers
} from "miruken-callback";

/**
 * Definition for validating objects
 * @property {Function} $validate
 */
export const $validate = new ContravariantPolicy("validate");

/**
 * Marks method as providing validation capabilities.
 * @method validates
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validates(...types) {
    return decorate(registerHandlers("validate", $validate), types);
}
