import {Base,pcopy,True,MetaStep,MetaMacro,Invoking,$isFunction,$isPromise,$classOf,$use,Protocol,StrictProtocol,$isNothing,Undefined,Abstract,Metadata} from 'miruken-core';
import {$define,$handle,CallbackHandler,$composer} from 'miruken-callback';

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

const IGNORE = ['valid', 'errors', 'addKey', 'addError', 'reset'];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
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
            const asyncResults = [];
            _validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0
                 ? Promise.all(asyncResults).then(() => results)
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
        return this.aspect((_, composer) =>
            Validator(composer).validate(target, scope).valid);
    },
    $validAsync(target, scope) {
        return this.aspect((_, composer) =>
             Validator(composer).validateAsync(target, scope)
                 .then(results => results.valid));
    }
});

import validatejs from 'validate.js';

validatejs.Promise = Promise;

/**
 * Shortcut to indicate required property.
 * @property {Object} $required
 * @readOnly
 * @for miruken.validate.$ 
 */
export const $required = Object.freeze({ presence: true });

/**
 * Shortcut to indicate nested validation.
 * @property {Object} $nested
 * @readOnly
 * @for miruken.validate.$ 
 */
export const $nested = Object.freeze({ nested: true });

validatejs.validators.nested = Undefined;

/**
 * Metamacro to register custom validators with [validate.js](http://validatejs.org).
 * <pre>
 *    const CustomValidators = Base.extend($registerValidators, {
 *        uniqueUserName: [Database, function (db, userName) {
 *            if (db.hasUserName(userName)) {
 *               return "UserName " + userName + " is already taken";
 *            }
 *        }]
 *    })
 * </pre>
 * would register a uniqueUserName validator with a Database dependency.
 * @class $registerValidators
 * @extends miruken.MetaMacro
 */    
export const $registerValidators = MetaMacro.extend({
    execute(step, metadata, target, definition) {
        if (step === MetaStep.Subclass || step === MetaStep.Implement) {
            for (let name in definition) {
                let validator = definition[name];
                if (Array.isArray(validator)) {
                    const dependencies = validator.slice(0);
                    validator = dependencies.pop();
                    if (!$isFunction(validator)) {
                        continue;
                    }
                    if (dependencies.length > 0) {
                        const fn = validator;
                        validator = function (...args) {
                            if (!$composer) {
                                throw new Error(`Unable to invoke validator '${nm}'.`);
                            }
                            const d = dependencies.concat(args.map($use));
                            return Invoking($composer).invoke(fn, d);
                        };
                    }
                }
                if ($isFunction(validator)) {
                    validatejs.validators[name] = validator;
                }
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

/**
 * Base class to define custom validators using
 * {{#crossLink "miruken.validate.$registerValidators"}}{{/crossLink}}.
 * <pre>
 *    const CustomValidators = ValidationRegistry.extend({
 *        creditCardNumber: function (cardNumber, options, key, attributes) {
 *           // do the check...
 *        }
 *    })
 * </pre>
 * would register a creditCardNumber validator function.
 * @class ValidationRegistry
 * @constructor
 * @extends Abstract
 */        
export const ValidationRegistry = Abstract.extend($registerValidators);

const DETAILED    = { format: "detailed", cleanAttributes: false },
      VALIDATABLE = { validate: undefined };

/**
 * CallbackHandler for performing validation using [validate.js](http://validatejs.org)
 * <p>
 * Classes participate in validation by declaring **validate** constraints on properties.
 * </p>
 * <pre>
 * const Address = Base.extend({
 *     $properties: {
 *         line:    { <b>validate</b>: { presence: true } },
 *         city:    { <b>validate</b>: { presence: true } },
 *         state:   { 
 *             <b>validate</b>: {
 *                 presence: true,
 *                 length: { is: 2 }
 *             }
 *         },
 *         zipcode: { 
 *             <b>validate</b>: {
 *                 presence: true,
 *                 length: { is: 5 }
 *         }
 *     }
 * })
 * </pre>
 * @class ValidateJsCallbackHandler
 * @extends miruken.callback.CallbackHandler
 */            
export const ValidateJsCallbackHandler = CallbackHandler.extend({
    $validate: [
        null,  function (validation, composer) {
            const target      = validation.object,
                  nested      = {},
                  constraints = _buildConstraints(target, nested);
            if (constraints) {
                const scope     = validation.scope,
                      results   = validation.results,
                      validator = Validator(composer); 
                if (validation.isAsync) {
                    return validatejs.async(target, constraints, DETAILED)
                        .then(valid => _validateNestedAsync(validator, scope, results, nested))
                    	.catch(errors => {
                            if (errors instanceof Error) {
                                return Promise.reject(errors);
                            }
                            return _validateNestedAsync(validator, scope, results, nested).then(function () {
                                _mapResults(results, errors);
                            });
                        });
                } else {
                    const errors = validatejs(target, constraints, DETAILED);
                    for (let key in nested) {
                        const child = nested[key];
                        if (Array.isArray(child)) {
                            for (let i = 0; i < child.length; ++i) {
                                validator.validate(child[i], scope, results.addKey(key + '.' + i));
                            }
                        } else {
                            validator.validate(child, scope, results.addKey(key));
                        }
                    }
                    _mapResults(results, errors);
                }
            }
        }]
});

function _validateNestedAsync(validator, scope, results, nested) {
    const pending = [];
    for (let key in nested) {
        const child = nested[key];
        if (Array.isArray(child)) {
            for (let i = 0; i < child.length; ++i) {
                let childResults = results.addKey(key + '.' + i);
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

function _mapResults(results, errors) {
    if (errors) {
        errors.forEach(error => {
            results.addKey(error.attribute).addError(error.validator, {
                message: error.error,
                value:   error.value 
            });
        });
    }
}

function _buildConstraints(target, nested) {
    const meta        = target[Metadata],
          descriptors = meta && meta.getDescriptor(VALIDATABLE);
    let  constraints;
    if (descriptors) {
        for (let key in descriptors) {
            const descriptor = descriptors[key],
                  validate   = descriptor.validate;
            (constraints || (constraints = {}))[key] = validate;
            for (let name in validate) {
                if (name === 'nested') {
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
                        return validator.validate(...args);
                    };
                }
            }
        }
        return constraints;
    }
}
