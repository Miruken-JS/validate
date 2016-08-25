import {
    Protocol, StrictProtocol, $isNothing, $isPromise
} from 'miruken-core';

import { CallbackHandler, $composer } from 'miruken-callback';
import { validateThat } from './validateThat';
import { Validation } from './validation';

/**
 * Protocol for validating objects.
 * @class Validating
 * @extends Protocol
 */        
export const Validating = Protocol.extend({
    /**
     * Validates the object in the scope.
     * @method validate 
     * @param   {Object} object     -  object to validate
     * @param   {Object} scope      -  scope of validation
     * @param   {Object} [results]  -  validation results
     * @returns {ValidationResult}  validation results.
     */
    validate(object, scope, results) {},
    /**
     * Validates the object asynchronously in the scope.
     * @method validateAsync
     * @param   {Object} object     - object to validate
     * @param   {Object} scope      - scope of validation
     * @param   {Object} [results]  - validation results
     * @returns {Promise} promise of validation results.
     * @async
     */
    validateAsync(object, scope, results) {}
});

/**
 * Protocol for validating objects strictly.
 * @class Validator
 * @extends StrictProtocol
 * @uses Validating
 */        
export const Validator = StrictProtocol.extend(Validating);

/**
 * CallbackHandler for performing validation.
 * <p>
 * Once an object is validated, it will receive a **$validation** property containing the validation results.
 * </p>
 * @class ValidationCallbackHandler
 * @extends CallbackHandler
 * @uses Validator
 * @uses Validating
 */        
export const ValidationCallbackHandler = CallbackHandler.extend(Validator, {
    validate(object, scope, results) {
        if ($isNothing(object)) {
            throw new TypeError("Missing object to validate.");
        }
        const validation = new Validation(object, false, scope, results);
        $composer.handle(validation, true);
        results = validation.results;
        _bindValidationResults(object, results);
        _validateThat(validation, null, $composer);
        return results;
    },
    validateAsync(object, scope, results) {
        if ($isNothing(object)) {
            throw new TypeError("Missing object to validate.");
        }            
        const validation = new Validation(object, true, scope, results),
              composer   = $composer;
        return composer.deferAll(validation).then(() => {
            results = validation.results;
            _bindValidationResults(object, results);
            const asyncResults = [];
            _validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0
                 ? Promise.all(asyncResults).then(() => results)
                 : results;
        });
    }
});

function _validateThat(validation, asyncResults, composer) {
    const object  = validation.object,
          matches = validateThat.get(object, (_, key) => {
              const validator   = object[key],
                    returnValue = validator.call(object, validation, composer);
              if (asyncResults && $isPromise(returnValue)) {
                  asyncResults.push(returnValue);
              }
          });
}

function _bindValidationResults(object, results) {
    Object.defineProperty(object, '$validation', {
        enumerable:   false,
        configurable: true,
        writable:     false,
        value:        results
    });
}

CallbackHandler.implement({
    $valid(target, scope) {
        return this.aspect((_, composer) =>
            Validator(composer).validate(target, scope).valid);
    },
    $validAsync(target, scope) {
        return this.aspect((_, composer) =>
             Validator(composer).validateAsync(target, scope)
                 .then(results => results.valid));
    }
});
