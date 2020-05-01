import { $isNothing, $isPromise } from "miruken-core";
import { Handler } from "miruken-callback";
import { Validation } from "./validation";
import { validateThat } from "./validate-that";

Handler.implement({
    /**
     * Validates the object in the scope.
     * @method validate 
     * @param   {Object} object     -  object to validate
     * @param   {Object} scope      -  scope of validation
     * @param   {Object} [results]  -  validation results
     * @returns {ValidationResult}  validation results.
     * @for Handler
     */                    
    validate(object, scope, results) {
        if ($isNothing(object)) {
            throw new TypeError("Missing object to validate.");
        }
        const validation = new Validation(object, false, scope, results);
        this.handle(validation, true);
        results = validation.results;
        _bindValidationResults(object, results);
        _validateThat(validation, null, this);
        return results;         
    },
    /**
     * Validates the object asynchronously in the scope.
     * @method validateAsync
     * @param   {Object} object     - object to validate
     * @param   {Object} scope      - scope of validation
     * @param   {Object} [results]  - validation results
     * @returns {Promise} promise of validation results.
     * @async
     */
    validateAsync(object, scope, results) {
        if ($isNothing(object)) {
            throw new TypeError("Missing object to validate.");
        }            
        const validation = new Validation(object, true, scope, results);
        this.handle(validation, true);
        return Promise.resolve(validation.callbackResult).then(() => {
            results = validation.results;
            _bindValidationResults(object, results);
            const asyncResults = [];
            _validateThat(validation, asyncResults, this);
            return asyncResults.length > 0
                 ? Promise.all(asyncResults).then(() => results)
                 : results;
        });
    },
    $valid(target, scope) {
        return this.aspect((_, composer) =>
            composer.validate(target, scope).valid);
    },
    $validAsync(target, scope) {
        return this.aspect((_, composer) =>
             composer.validateAsync(target, scope)
                 .then(results => results.valid));
    }
});

function _validateThat(validation, asyncResults, composer) {
    const object  = validation.object;
    validateThat.getKeys(object, (_, key) => {
        const validator   = object[key],
              returnValue = validator.call(object, validation, composer);
        if (asyncResults && $isPromise(returnValue)) {
            asyncResults.push(returnValue);
        }
    });
}

function _bindValidationResults(object, results) {
    Object.defineProperty(object, "$validation", {
        enumerable:   false,
        configurable: true,
        writable:     false,
        value:        results
    });
}
