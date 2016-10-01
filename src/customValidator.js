import {
    Invoking, inject, decorate,
    emptyArray, $isFunction, $use
} from "miruken-core";

import { $composer } from "miruken-callback";
import { constraint } from "./constraint";
import validatejs from "validate.js";

let validatorsCount = 0;
const validators = validatejs.validators;

/**
 * Register custom validator with [validate.js](http://validatejs.org).
 * <pre>
 *    const CustomValidators = Base.extend(customValidator, null, {
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
        throw new SyntaxError("@customValidator can only be applied to a class");
    }

    const prototype = target.prototype;
    
    Reflect.ownKeys(target).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (_isCustomValidator(key, descriptor)) {
            _assignStaticCustomValidator(target, key, descriptor);
        }
    });
    
    Reflect.ownKeys(prototype).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (_isCustomValidator(key, descriptor)) {        
            _assignInstanceCustomValidator(target, prototype, key, descriptor);
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

function _assignStaticCustomValidator(target, key, descriptor) {
    const { value }    = descriptor,    
          dependencies = inject.get(target, key);
    if (dependencies && dependencies.length > 0) {
        descriptor.value = function (...args) {
            if (!$composer) {
                throw new Error(`@customValidator unable to invoke static method '${key}' on ${target.name}`);
            }
            const deps = dependencies.concat(args.map($use));
            return Invoking($composer).invoke(value, deps, target);
        }
    };
    _assignCustomValidator(target, key, descriptor.value);
}

function _assignInstanceCustomValidator(target, prototype, key, descriptor) {
    const dependencies = inject.get(prototype, key);
    if (dependencies && dependencies.length > 0) {
        throw new SyntaxError(`@customValidator can\'t use dependencies for instance method '${key}' on ${target.name}`);
    }    
    descriptor.value = function (...args) {
        let validator;
        if ($composer) {
            validator = $composer.resolve(target);
        }
        if (!validator) {
            validator = Reflect.construct(target, emptyArray);
        }
        if (!validator) {
            throw Error(`@customValidator unable to resolve or create validator ${target.name}`);
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

    target[key] = function (...args) {
        return decorate((t, k, d, options) => constraint({[tag]: options})(t, k, d), args);
    };
}

