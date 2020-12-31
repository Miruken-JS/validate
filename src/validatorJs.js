import { 
    Undefined, $isFunction, Handler,
    provides, singleton
} from "@miruken/core";

import { validates } from "./validates";
import { constraint } from "./constraint";
import validatejs from "validate.js";

validatejs.Promise = Promise;
validatejs.validators.nested = Undefined;

const detailed    = { format: "detailed", cleanAttributes: false },
      validatable = { validate: undefined };

/**
 * Handler for performing validation using [validate.js](http://validatejs.org)
 * <p>
 * Classes participate in validation by declaring specifying constraints on properties.
 * </p>
 * <pre>
 * class Address {
 *         @requried
 *         line:    "",
 *         @is.required
 *         city:    "",
 *         @length.is(2)
 *         @required
 *         state:   ""
 *         @length.is(5)
 *         @required
 *         zipcode:
 *     }
 * }
 * </pre>
 * @class ValidateJsHandler
 * @extends Handler
 */
@provides() @singleton()   
export class ValidateJsHandler extends Handler {
    @validates
    validateJS(validation, { composer }) {
        const target      = validation.object,
              nested      = {},
              constraints = buildConstraints(target, nested, composer);
        if (constraints) {
            const scope     = validation.scope,
                  results   = validation.results;
            if (validation.isAsync) {
                return composer.$compose(
                    () => validatejs.async(target, constraints, detailed))
                    .then(valid => validateNestedAsync(composer, scope, results, nested))
                    .catch(errors => {
                        if (errors instanceof Error) {
                            return Promise.reject(errors);
                        }
                        return validateNestedAsync(composer, scope, results, nested)
                            .then(() => mapResults(results, errors));
                    });
            } else {
                const errors = composer.$compose(
                    () => validatejs(target, constraints, detailed));
                for (let key in nested) {
                    const child = nested[key];
                    if (Array.isArray(child)) {
                        for (let i = 0; i < child.length; ++i) {
                            composer.validate(child[i], scope, results.addKey(key + "." + i));
                        }
                    } else {
                        composer.validate(child, scope, results.addKey(key));
                    }
                }
                mapResults(results, errors);
            }
        }
    }
}

function validateNestedAsync(composer, scope, results, nested) {
    const pending = [];
    for (let key in nested) {
        const child = nested[key];
        if (Array.isArray(child)) {
            for (let i = 0; i < child.length; ++i) {
                let childResults = results.addKey(key + "." + i);
                childResults = composer.validateAsync(child[i], scope, childResults);
                pending.push(childResults);
            }
        } else {
            let childResults = results.addKey(key);
            childResults = composer.validateAsync(child, scope, childResults);
            pending.push(childResults);
        }
    }
    return Promise.all(pending);
}

function mapResults(results, errors) {
    if (errors) {
        errors.forEach(error => results.addKey(error.attribute)
            .addError(error.validator, {
                message: error.error,
                value:   error.value 
            })
        );
    }
}

function buildConstraints(target, nested, composer) {
    let constraints; 
    constraint.getKeys(target, (criteria, key) => {
        (constraints || (constraints = {}))[key] = criteria;
        for (let name in criteria) {
            if (name === "nested") {
                const child = target[key];
                if (child) {
                    nested[key] = child;
                }
            } else if (!(name in validatejs.validators)) {
                validatejs.validators[name] = function (...args) {
                    const validator = composer.resolve(name);
                    if (!validator) {
                        throw new Error(`Unable to resolve validator '${name}'.`);
                    }
                    if (!$isFunction(validator.validate)) {
                        throw new Error(`Validator '${name}' is missing 'validate' method.`);
                    }
                    return validator.validate(...args);
                };
            }
        }
    });
    return constraints;
}
