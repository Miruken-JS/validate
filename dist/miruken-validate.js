import {Protocol,StrictProtocol,$isNothing,Base,MetaMacro,$isFunction,$isPromise} from 'miruken-core';
import {CallbackHandler,$composer} from 'mirukren-callback';
import {$define} from 'miruken-callback';

/**
 * Protocol for validating objects.
 * @class Validating
 * @extends miruken.Protocol
 */        
export const Validating = Protocol.extend({
    /**
     * Validates the object in the scope.
     * @method validate 
     * @param   {Object} object     -  object to validate
     * @param   {Object} scope      -  scope of validation
     * @param   {Object} [results]  -  validation results
     * @returns {miruken.validate.ValidationResult}  validation results.
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
 * @extends miruken.StrictProtocol
 * @uses miruken.validate.Validating
 */        
export const Validator = StrictProtocol.extend(Validating);

/**
 * CallbackHandler for performing validation.
 * <p>
 * Once an object is validated, it will receive a **$validation** property containing the validation results.
 * </p>
 * @class ValidationCallbackHandler
 * @extends miruken.callback.CallbackHandler
 * @uses miruken.validate.Validator
 * @uses miruken.validate.Validating
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
            var asyncResults = [];
            _validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0
                 ? Promise.all(asyncResults).return(results)
                 : results;
        });
    }
});

function _validateThat(validation, asyncResults, composer) {
    const object = validation.object;
    for (let key in object) {
        if (key.lastIndexOf('validateThat', 0) == 0) {
            const validator   = object[key],
                  returnValue = validator.call(object, validation, composer);
            if (asyncResults && $isPromise(returnValue)) {
                asyncResults.push(returnValue);
            }
        }
    }
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
        return this.aspect((_, composer) => {
            return Validator(composer).validate(target, scope).valid;
        });
    },
    $validAsync(target, scope) {
        return this.aspect( (_, composer) => {
            return Validator(composer).validateAsync(target, scope)
                .then(results => results.valid);
        });
    }
});

/**
 * Captures structured validation errors.
 * @class ValidationResult
 * @constructor
 * @extends Base
 */    
export const ValidationResult = Base.extend({
    constructor() {
        let _errors, _summary;
        this.extend({
            /**
             * true if object is valid, false otherwisw.
             * @property {boolean} valid
             * @readOnly
             */                
            get valid() {
                if (_errors || _summary) {
                    return false;
                }
                const ownKeys = Object.getOwnPropertyNames(this);
                for (let i = 0; i < ownKeys.length; ++i) {
                    const key = ownKeys[i];
                    if (_isReservedKey(key)) {
                        continue;
                    }
                    const result = this[key];
                    if ((result instanceof ValidationResult) && !result.valid) {
                        return false;
                    }
                }
                return true;
            },
            /**
             * Gets aggregated validation errors.
             * @property {Object} errors
             * @readOnly
             */                                
            get errors() {
                if (_summary) {
                    return _summary;
                }
                if (_errors) {
                    _summary = {};
                    for (let name in _errors) {
                        _summary[name] = _errors[name].slice(0);
                    }
                }
                const ownKeys = Object.getOwnPropertyNames(this);
                for (let i = 0; i < ownKeys.length; ++i) {
                    const key = ownKeys[i];
                    if (_isReservedKey(key)) {
                        continue;
                    }
                    const result = this[key],
                          errors = (result instanceof ValidationResult) && result.errors;
                    if (errors) {
                        _summary = _summary || {};
                        for (name in errors) {
                            const named    = errors[name];
                            let   existing = _summary[name];
                            for (let ii = 0; ii < named.length; ++ii) {
                                const error = pcopy(named[ii]);
                                error.key = error.key ? (key + "." + error.key) : key;
                                if (existing) {
                                    existing.push(error);
                                } else {
                                    _summary[name] = existing = [error];
                                }
                            }
                        }
                    }
                }
                return _summary;
            },
            /**
             * Gets or adds validation results for the key.
             * @method addKey
             * @param  {string} key  -  property name
             * @results {miruken.validate.ValidationResult} named validation results.
             */                
            addKey(key) {
                return this[key] || (this[key] = new ValidationResult);
            },
            /**
             * Adds a named validation error.
             * @method addError
             * @param  {string}  name   -  validator name
             * @param  {Object}  error  -  literal error details
             * @example
             *     Standard Keys:
             *        key      => contains the invalid key
             *        message  => contains the error message
             *        value    => contains the invalid valid
             */
            addError(name, error) {
                const errors = (_errors || (_errors = {})),
                      named  = errors[name];
                if (named) {
                    named.push(error);
                } else {
                    errors[name] = [error];
                }
                _summary = null;
                return this;
            },
            /**
             * Clears all validation results.
             * @method reset
             * @returns {miruken.validate.ValidationResult} receiving results
             * @chainable
             */
            reset() { 
                _errors = _summary = undefined;
                const ownKeys = Object.getOwnPropertyNames(this);
                for (let i = 0; i < ownKeys.length; ++i) {
                    const key = ownKeys[i];
                    if (_isReservedKey(key)) {
                        continue;
                    }
                    const result = this[key];
                    if ((result instanceof ValidationResult)) {
                        delete this[key];
                    }
                }
                return this;
            }
        });
    }
});

function _isReservedKey(key) {
    return key in ValidationResult.prototype;
}

/**
 * Validation definition group.
 * @property {Function} $validate
 * @for miruken.validate.$
 */
export const $validate = $define('$validate');

/**
 * Callback representing the validation of an object.
 * @class Validation
 * @constructor
 * @param   {Object}    object  -  object to validate
 * @param   {boolean}   async   -  true if validate asynchronously
 * @param   {Any}       scope   -  scope of validation
 * @param   {miruken.validate.ValidationResult} results  -  results to validate to
 * @extends Base
 */
export const Validation = Base.extend({
    constructor(object, async, scope, results) {
        let _asyncResults;
        async   = !!async;
        results = results || new ValidationResult();
        this.extend({
            /**
             * true if asynchronous, false if synchronous.
             * @property {boolean} async
             * @readOnly
             */                
            get isAsync() { return async; },
            /**
             * Gets the target object to validate.
             * @property {Object} object
             * @readOnly
             */                                
            get object() { return object; },
            /**
             * Gets the scope of validation.
             * @property {Any} scope
             * @readOnly
             */                                                
            get scope() { return scope; },
            /**
             * Gets the validation results.
             * @property {miruken.validate.ValidationResult} results
             * @readOnly
             */                                                                
            get results() { return results; },
            /**
             * Gets the async validation results.
             * @property {miruken.validate.ValidationResult} results
             * @readOnly
             */                                                                                
            get asyncResults() { return _asyncResults; },
            /**
             * Adds an async validation result. (internal)
             * @method addAsyncResult
             */                        
            addAsyncResult(result) {
                if ($isPromise(result)) {
                    (_asyncResults || (_asyncResults = [])).push(result);
                }
            }
        });
    }
});

$handle(CallbackHandler, Validation, function (validation, composer) {
    const target = validation.object,
          source = $classOf(target);
    if (source) {
        $validate.dispatch(this, validation, source, composer, true, validation.addAsyncResult);
        var asyncResults = validation.asyncResults;
        if (asyncResults) {
            return Promise.all(asyncResults);
        }
    }
});

/**
 * Metamacro for class-based validation.
 * @class $validateThat
 * @extends miruken.MetaMacro
 */    
export const $validateThat = MetaMacro.extend({
    execute: function _(step, metadata, target, definition) {
        const validateThat = this.extractProperty('$validateThat', target, definition);
        if (!validateThat) {
            return;
        }
        const validators = {};
        for (let name in validateThat) {
            let validator = validateThat[name];
            if (Array.isArray(validator)) {
                const dependencies = validator.slice(0);
                validator = dependencies.pop();
                if (!$isFunction(validator)) {
                    continue;
                }
                if (dependencies.length > 0) {
                    let fn = validator;
                    validator = function (validation, composer) {
                        const d = dependencies.concat($use(validation), $use(composer));
                        return Invoking(composer).invoke(fn, d, this);
                    };
                }
            }
            if ($isFunction(validator)) {
                name = 'validateThat' + name.charAt(0).toUpperCase() + name.slice(1);
                validators[name] = validator;
            }
            if (step == MetaStep.Extend) {
                target.extend(validators);
            } else {
                metadata.type.implement(validators);
            }
        }
    },
    /**
     * Determines if the macro should be inherited
     * @method shouldInherit
     * @returns {boolean} true
     */         
    shouldInherit: True,
    /**
     * Determines if the macro should be applied on extension.
     * @method isActive
     * @returns {boolean} true
     */
    isActive: True
});
