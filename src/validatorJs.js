import { Undefined, $isFunction} from "miruken-core";
import { CallbackHandler, $composer } from "miruken-callback";
import { Validator } from "./validator";
import { validate } from "./validate";
import {  constraint } from "./constraint";
import validatejs from "validate.js";

validatejs.Promise = Promise;
validatejs.validators.nested = Undefined;

const detailed    = { format: "detailed", cleanAttributes: false },
      validatable = { validate: undefined };

/**
 * CallbackHandler for performing validation using [validate.js](http://validatejs.org)
 * <p>
 * Classes participate in validation by declaring specifying constraints on properties.
 * </p>
 * <pre>
 * const Address = Base.extend({
 *         @is.requried
 *         line:    "",
 *         @is.required
 *         city:    "",
 *         @has.exactLength(2)
 *         @is.required
 *         state:   ""
 *         @has.exactLength(5)
 *         @is.required
 *         zipcode:
 *     }
 * })
 * </pre>
 * @class ValidateJsCallbackHandler
 * @extends CallbackHandler
 */            
export const ValidateJsCallbackHandler = CallbackHandler.extend({
    @validate
    validateJS(validation, composer) {
        const target      = validation.object,
              nested      = {},
              constraints = buildConstraints(target, nested);
        if (constraints) {
            const scope     = validation.scope,
                  results   = validation.results,
                  validator = Validator(composer); 
            if (validation.isAsync) {
                return validatejs.async(target, constraints, detailed)
                    .then(valid => validateNestedAsync(validator, scope, results, nested))
                    .catch(errors => {
                        if (errors instanceof Error) {
                            return Promise.reject(errors);
                        }
                        return validateNestedAsync(validator, scope, results, nested)
                            .then(() => mapResults(results, errors));
                    });
            } else {
                const errors = validatejs(target, constraints, detailed);
                for (let key in nested) {
                    const child = nested[key];
                    if (Array.isArray(child)) {
                        for (let i = 0; i < child.length; ++i) {
                            validator.validate(child[i], scope, results.addKey(key + "." + i));
                        }
                    } else {
                        validator.validate(child, scope, results.addKey(key));
                    }
                }
                mapResults(results, errors);
            }
        }
    }
});

function validateNestedAsync(validator, scope, results, nested) {
    const pending = [];
    for (let key in nested) {
        const child = nested[key];
        if (Array.isArray(child)) {
            for (let i = 0; i < child.length; ++i) {
                let childResults = results.addKey(key + "." + i);
                childResults = validator.validateAsync(child[i], scope, childResults);
                pending.push(childResults);
            }
        } else {
            let childResults = results.addKey(key);
            childResults = validator.validateAsync(child, scope, childResults);
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

function buildConstraints(target, nested) {
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
                    const validator = $composer && $composer.resolve(name);
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
