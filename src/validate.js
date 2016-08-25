import { $validate } from './validation';
import { addDefinition } from 'miruken-callback';
import { decorate } from 'miruken-core';

/**
 * Marks method as providing validation capabilities.
 * @method validate
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validate(...types) {
    return decorate(addDefinition($validate), types);
}

export default validate;
