import {
    Invoking, inject, decorate, $isFunction, $use
} from "miruken-core";

import { $composer } from "miruken-callback";
import constraint from "./constraint";
import validatejs from "validate.js";

let counter = 0;
const validators = validatejs.validators;

/**
 * Register custom validator with [validate.js](http://validatejs.org).
 * <pre>
 *    const CustomValidators = Base.extend(customValidator, {
 *        @inject(Database)
 *        uniqueUserName(db, userName) {
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
        throw new SyntaxError("customValidator can only be applied to a class");
    }

    const prototype = target.prototype;
    
    Reflect.ownKeys(prototype).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        _customValidatorMethod(target, prototype, key, descriptor);
    });
}

function _customValidatorMethod(target, prototype, key, descriptor) {
    if (!descriptor.enumerable || key === "constructor") return;    
    const fn = descriptor.value;
    if (!$isFunction(fn)) return;
    inject.get(prototype, key, dependencies => {
        if (dependencies.length > 0) {
            descriptor.value = function (...args) {
                if (!$composer) {
                    throw new Error(`Unable to invoke validator '${key}'.`);
                }
                const deps = dependencies.concat(args.map($use));
                return Invoking($composer).invoke(fn, deps);
            }
        }
    });

    let tag = key;
    if (validators.hasOwnProperty(tag)) {
        tag = `${tag}-${counter++}`;
    }
    validators[tag] = descriptor.value;
    
    target[key] = function (...args) {
        return decorate((t, k, d, options) =>
            constraint({[tag]: options})(t, k, d), args);
    };
}

export default customValidator;
