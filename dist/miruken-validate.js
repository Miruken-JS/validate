import validatejs from "validate.js";
import {True,Invoking,Metadata,inject,isDescriptor,$isFunction,$use,Base,pcopy,$isPlainObject,$isPromise,decorate,emptyArray,$flatten,Variance,Protocol,StrictProtocol,$isNothing,$classOf,Undefined} from 'miruken-core';
import {$composer,CallbackHandler,$define,$handle,addDefinition} from 'miruken-callback';

const validateThatMetadataKey = Symbol();

/**
 * Marks method as providing contextual validation.
 * @method validateThat
 */
export const validateThat = Metadata.decorator(validateThatMetadataKey,
    (target, key, descriptor) => {
        if (!isDescriptor(descriptor)) {
            throw new SyntaxError("@validateThat cannot be applied to classes");
        }
        if (key === "constructor") {
            throw new SyntaxError("@validateThat cannot be applied to constructors");
        }
        const { value } = descriptor;
        if (!$isFunction(value)) {
            throw new SyntaxError("@validateThat cannot be applied to methods");
        }
        Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, True);
        const dependencies = inject.get(target, key);
        if (dependencies && dependencies.length > 0) {
            descriptor.value = function (validation, composer) {
                const args = Array.prototype.slice.call(arguments),
                      deps = dependencies.concat(args.map($use));
                return Invoking(composer).invoke(value, deps, this);
            }
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

const IGNORE = ["valid", "errors", "addKey", "addError", "reset"];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
}


const constraintMetadataKey = Symbol();

/**
 * Specifies validation constraints on properties and methods.
 * @method constraints
 */
export const constraint = Metadata.decorator(constraintMetadataKey,
    (target, key, descriptor, constraints) => {
        if (constraints.length === 0 || key === "constructor") return;
        const { get, value, initializer } = descriptor;
        if (!get && !value && !initializer) return;
        const current = Metadata.getOrCreateOwn(
            constraintMetadataKey, target, key, () => ({}));
        constraints.forEach(constraint => _mergeConstraints(current, constraint));
    });

export const applyConstraints = constraint({nested: true});

function _mergeConstraints(target, source) {
    Reflect.ownKeys(source).forEach(key => {
        const newValue = source[key],
              curValue = target[key];
        if ($isPlainObject(curValue) && !Array.isArray(curValue)) {
            _mergeConstraints(curValue, newValue);
        } else {
            target[key] = Array.isArray(newValue)
                        ? newValue.slice()
                        : newValue;
        }
    });
}

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
    Reflect.ownKeys(prototype).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (_isCustomValidator(key, descriptor)) {        
            _assignInstanceValidator(target, prototype, key, descriptor);
        }
    });

    Reflect.ownKeys(target).forEach(key => {
        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (_isCustomValidator(key, descriptor)) {
            _assignStaticValidator(target, key, descriptor);
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

function _assignStaticValidator(target, key, descriptor) {
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

function _assignInstanceValidator(target, prototype, key, descriptor) {
    const dependencies = inject.get(prototype, key);
    if (dependencies && dependencies.length > 0) {
        throw new SyntaxError(`@customValidator can\'t have dependencies for instance method '${key}' on ${target.name}`);
    }    
    descriptor.value = function (...args) {
        const validator = ($composer && $composer.resolve(target))
                       || Reflect.construct(target, emptyArray);
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

    const method = target[key];
    target[key] = function (...args) {
        if (args.length === 3 && isDescriptor(args[2])) {
            return decorate((t, k, d, options) => constraint({[tag]: options})(t, k, d), args);
        }
        if ($isFunction(method)) {
            return method.apply(target, args);
        }
    };
}

export const email = constraint({email: true});


export const length = {
    is(len)      { return constraint({length: {is: len}}) },
    atLeast(len) { return constraint({length: {minimum: len}}) },
    atMost(len)  { return constraint({length: {maximum: len}}) } 
};

export function matches(pattern, flags) {
    const criteria = { format: pattern };
    if (flags) {
        criteria.flags = flags;
    }
    return constraint(criteria);
}

export function includes(...members) {
    members = $flatten(members, true);
    return constraint({inclusion: members});
}

export function excludes(...members) {
    members = $flatten(members, true);    
    return constraint({exclusion: members});
}

export const number = constraint({numericality: {noStrings: true}});

Object.assign(number, {
    strict:                   constraint({numericality: {strict: true}}),
    onlyInteger:              constraint({numericality: {onlyInteger: true}}),
    equalTo(val)              { return constraint({numericality: {equalTo: val}}); },
    greaterThan(val)          { return constraint({numericality: {greaterThan: val}}); },
    greaterThanOrEqualTo(val) { return constraint({numericality: {greaterThanOrEqualTo: val}}); },
    lessThan(val)             { return constraint({numericality: {lessThan: val}}) },
    lessThanOrEqualTo(val)    { return constraint({numericality: {lessThanOrEqualTo: val}}); },
    divisibleBy(val)          { return constraint({numericality: {divisibleBy: val}}); },
    odd:                      constraint({numericality: {odd: true}}),
    even:                     constraint({numericality: {even: true}})
});






export const required = constraint({presence: true});


export const url = constraint({url: true});

Object.assign(url, {
    schemes(schemes) { return constraint({url: {schemes}}); },
    allowLocal(allowLocal) { return constraint({url: {allowLocal}}); }    
});


/**
 * Validation definition group.
 * @property {Function} $validate
 */
export const $validate = $define(Variance.Contravariant);

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

$handle(CallbackHandler.prototype, Validation, function (validation, composer) {
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

/**
 * Marks method as providing validation capabilities.
 * @method validate
 * @param  {Array}  ...types  -  types that can be validated
 */ 
export function validate(...types) {
    return decorate(addDefinition("validate", $validate), types);
}


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
