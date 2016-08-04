import { $validate } from './meta';
import { addDefinition } from 'miruken-callback';
import { decorate } from 'miruken-core';

export function validate(...args) {
    return decorate(addDefinition($validate), args);
}
