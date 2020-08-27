import {
    design, decorate, emptyArray,
    isDescriptor, $isNothing, $isFunction
} from "miruken-core";

import { $getComposer } from "miruken-callback";
import { constraint } from "./constraint";
import validatejs from "validate.js";

let validatorsCount = 0;
const validators = validatejs.validators;

/**
 * Register custom validator with [validate.js](http://validatejs.org).
 * <pre>
 *    @customValidator
 *    class CustomValidators {
 *        static uniqueUserName(userName, @type(Database) db) {
 *            if (db.hasUserName(userName)) {
 *               return `UserName ${userName} is already taken`;
 *            }
 *        }
 *    })
 * </pre>
 * would register a uniqueUserName validator with a Database dependency.
 * @function customValidator
 */
export function customValidator(target) {
    if (arguments.length > 1) {
        throw new SyntaxError("@customValidator can only be applied to a class.");
    }

    const prototype = target.prototype;
    Reflect.ownKeys(prototype).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (_isCustomValidator(key, descriptor)) {        
            _assignInstanceValidator(target, prototype, key, descriptor);
        }
    });

    Reflect.ownKeys(target).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (_isCustomValidator(key, descriptor)) {
            _assignStaticValidator(target, key, descriptor);
        }
    });    
}

function _isCustomValidator(key, descriptor) {
    if (key === "constructor" || key.startsWith("_")) {
        return false;
    }
    const { value } = descriptor;
    return $isFunction(value) && value.length > 0;
}

function _assignStaticValidator(target, key, descriptor) {
    const designArgs = design.get(target, key)?.args;
    if (designArgs?.length > 0) {
        const { value }  = descriptor;
        descriptor.value = function (...args) {
            const composer = $getComposer();
            if ($isNothing(composer)) {
                throw new Error(`@customValidator on static method '${target.name}.${key}' not invoked properly.`);
            }
            if (designArgs?.length > 0) {
                const deps = composer.resolveArgs(designArgs);
                if ($isNothing(deps)) {
                    throw new Error(`One or more dependencies could not be resolved for method '${target.name}.${key}'.`);
                }
                return value.call(this, ...deps, ...args);
            }
            return value.apply(this, deps);
        };
    };
    _assignCustomValidator(target, key, descriptor.value);
}

function _assignInstanceValidator(target, prototype, key, descriptor) {
    const designArgs = design.get(prototype, key)?.args;  
    descriptor.value = function (...args) {
        const composer = $getComposer();
        if ($isNothing(composer)) {
            throw new Error(`@customValidator on instance method '${target.name}.${key}' not invoked properly.`);
        }
        const validator = composer.resolve(target) || Reflect.construct(target, emptyArray);
        if (designArgs?.length > 0) {
            const deps = composer.resolveArgs(designArgs);
            if ($isNothing(deps)) {
                throw new Error(`One or more dependencies could not be resolved for method '${target.name}.${key}'.`);
            }
            return validator[key].call(validator, ...deps, ...args);
        }
        return validator[key].apply(validator, args);
    }
    _assignCustomValidator(target, key, descriptor.value);
}

function _assignCustomValidator(target, key, fn) {
    let tag = key;
    if (validators.hasOwnProperty(tag)) {
        tag = `${tag}-${validatorsCount++}`;
    }
    validators[tag] = fn;

    const method = target[key];
    target[key] = function (...args) {
        if (args.length === 3 && isDescriptor(args[2])) {
            return decorate((t, k, d, options) => constraint({[tag]: options})(t, k, d), args);
        }
        if ($isFunction(method)) {
            return method.apply(target, args);
        }
    };
}
