import {
    Invoking, inject, decorate, $isFunction, $use
} from 'miruken-core';

import { $composer } from 'miruken-callback';
import { constraint } from './constraint';
import validatejs from 'validate.js';

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
export function customValidator(...args) {
    if (args.length === 0) {
        return function () {
            return _customValidator(arguments);
        };
    } else {
        return _customValidator(args);
    }
}

function _customValidator(args) {
    return args.length === 1
         ? _customValidatorClass(...args)
         : _customValidatorMethod(...args);
}

function _customValidatorClass(target) {
    if ($isFunction(target)) {
        target = target.prototype;
    }
    Reflect.ownKeys(target).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        _customValidatorMethod(target, key, descriptor);
    });
}

function _customValidatorMethod(target, key, descriptor) {
    if (key === 'constructor') return;    
    const fn = descriptor.value;
    if (!$isFunction(fn)) return;
    inject.get(target, key, dependencies => {
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
    constraint[key] = function (...options) {
        return decorate((t, k, d) => {
            return constraint({[key]: options})(t, k, d);
        }, options);
    };
    validatejs.validators[key] = descriptor.value;    
}

export default customValidator;
