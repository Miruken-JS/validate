import validatejs from 'validate.js';
import {Invoking,inject,metadata,$meta,$isFunction,$use,Base,pcopy,$isPromise,$classOf,decorate,Protocol,StrictProtocol,$isNothing,Undefined} from 'miruken-core';
import {$define,$handle,CallbackHandler,$composer,addDefinition} from 'miruken-callback';

const validateThatKey      = Symbol(),
      validateThatCriteria = { [validateThatKey]: true };

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export function validateThat(target, key, descriptor) {
    if (key === 'constructor') return;
    const fn = descriptor.value;
    if (!$isFunction(fn)) return;
    const meta = $meta(target);
    if (meta) {
        meta.defineMetadata(key,  validateThatCriteria);
        inject.get(target, key, dependencies => {
            if (dependencies.length > 0) {
                descriptor.value = function (validation, composer) {
                    const args = Array.prototype.slice.call(arguments),
                          deps = dependencies.concat(args.map($use));
                    return Invoking(composer).invoke(fn, deps, this);
                }
            }
        });
    }
}

validateThat.get = metadata.get.bind(undefined, validateThatKey, validateThatCriteria);

export default validateThat;

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
                        _summary[name] = _errors[name].slice();
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
             * @results {ValidationResult} named validation results.
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
             * @returns {ValidationResult} receiving results
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

const constraintKey = Symbol(),
      criteria      = { [constraintKey]: undefined };

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export function constraint(constraints) {
    return function (target, key, descriptor) {
        if (key === 'constructor') return;
        const { get, value, initializer } = descriptor;
        if (!get && !value && !initializer) return;
        const meta = $meta(target);
        if (meta) {
            meta.defineMetadata(key, { [constraintKey]: constraints });
        }
    };
}

constraint.get = metadata.get.bind(undefined, constraintKey, criteria);

constraint.required = function (target, key, descriptor)
{
    return constraint({presence: true})(target, key, descriptor);
}

export function applyConstraints (target, key, descriptor)
{
    return constraint({nested: true})(target, key, descriptor);
}

export { constraint as default, constraint as is, constraint as has };

/**
 * Validation definition group.
 * @property {Function} $validate
 */
export const $validate = $define('$validate');

/**
 * Callback representing the validation of an object.
 * @class Validation
 * @constructor
 * @param   {Object}    object  -  object to validate
 * @param   {boolean}   async   -  true if validate asynchronously
 * @param   {Any}       scope   -  scope of validation
 * @param   {ValidationResult} results  -  results to validate to
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
             * @property {ValidationResult} results
             * @readOnly
             */                                                                
            get results() { return results; },
            /**
             * Gets the async validation results.
             * @property {ValidationResult} results
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

constraint.exactLength = function (len)
{
    return constraint({length: {is: len}});
}

constraint.minimumLength = function (len)
{
    return constraint({length: {minimum: len}});
}

constraint.maximumLength = function (len)
{
    return constraint({length: {maximum: len}});
}

constraint.number = function(target, key, descriptor)
{
    return constraint({numericality: {noStrings: true}})(target, key, descriptor);
}

constraint.strictNumber = function(target, key, descriptor)
{
    return constraint({numericality: {strict: true}})(target, key, descriptor);
}

constraint.onlyInteger = function (target, key, descriptor)
{
    return constraint({numericality: {onlyInteger: true}})(target, key, descriptor);
}

constraint.equalTo = function (val)
{
    return constraint({numericality: {equalTo: val}});
}

constraint.greaterThan = function (val)
{
    return constraint({numericality: {greaterThan: val}});
}

constraint.greaterThanOrEqualTo = function (val)
{
    return constraint({numericality: {greaterThanOrEqualTo: val}});
}

constraint.lessThan = function (val)
{
    return constraint({numericality: {lessThan: val}});
}

constraint.lessThanOrEqualTo = function (val)
{
    return constraint({numericality: {lessThanOrEqualTo: val}});
}

constraint.divisibleBy = function (val)
{
    return constraint({numericality: {divisibleBy: val}});
}

constraint.odd = function (target, key, descriptor)
{
    return constraint({numericality: {odd: true}})(target, key, descriptor);
}

constraint.even = function (target, key, descriptor)
{
    return constraint({numericality: {even: true}})(target, key, descriptor);
}





constraint.required = function (target, key, descriptor)
{
    return constraint({presence: true})(target, key, descriptor);
}

/**
 * Marks method as providing validation capabilities.
 * @method validate
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validate(...types) {
    return decorate(addDefinition($validate), types);
}

export default validate;

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
 *         @requried
 *         line:    undefined,
 *         @required
 *         city:    undefined,
 *         @length.is(2)
 *         @required
 *         state:   undefined
 *         @length.is(5)
 *         @required
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
                            validator.validate(child[i], scope, results.addKey(key + '.' + i));
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
    constraint.get(target, (criteria, key) => {
        (constraints || (constraints = {}))[key] = criteria;
        for (let name in criteria) {
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
