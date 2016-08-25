import validatejs from 'validate.js';
import {Invoking,inject,metadata,$meta,$isFunction,$use,Base,pcopy,$isPromise,$classOf,decorate,Protocol,StrictProtocol,$isNothing,Undefined,Modifier} from 'miruken-core';
import {$define,$handle,CallbackHandler,$composer,addDefinition,provide} from 'miruken-callback';
import {Context} from 'miruken-context';
import {expect} from 'chai';

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
        meta.addMetadata(key,  validateThatCriteria);
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
        const { get, value } = descriptor;
        if (!get && !value) return;
        const meta = $meta(target);
        if (meta) {
            meta.addMetadata(key, { [criteria]: constraints });
        }
    };
}

constraint.get = metadata.get.bind(undefined, constraintKey, criteria);

constraint.required = function (target, key, descriptor)
{
    return constraint({presence: true})(target, key, descriptor);
}

constraint.nested = function (target, key, descriptor)
{
    return constraint({nested: true})(target, key, descriptor);
}

export { constraint as is, constraint as has };

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

function _customValidator() {
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
        return decorate(_constraint, options);
    };
    validatejs.validators[key] = descriptor.value;    
}

function _constraint(target, key, descriptor, options) {
    return constraint({[key]: options})(target, key, descriptor);    
}

export default customValidator;

constraint.length = function (len)
{
    return contraint({length: {is: len}});
}

constraint.minimumLength = function (len)
{
    return contraint({length: {minimum: len}});
}

constraint.maximumLength = function (len)
{
    return contraint({length: {maximum: len}});
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
    return contraints({numericality: {equalTo: val}});
}

constraint.greaterThan = function (val)
{
    return contraints({numericality: {greaterThan: val}});
}

constraint.greaterThanOrEqualTo = function (val)
{
    return contraints({numericality: {greaterThanOrEqualTo: val}});
}

constraint.lessThan = function (val)
{
    return contraints({numericality: {lessThan: val}});
}

constraint.lessThanOrEqualTo = function (val)
{
    return contraints({numericality: {lessThanOrEqualTo: val}});
}

constraint.divisibleBy = function (val)
{
    return contraints({numericality: {divisibleBy: val}});
}

constraint.odd = function (target, key, descriptor)
{
    return constraint({numericality: {odd: true}})(target, key, descriptor);
}

constraint.even = function (target, key, descriptor)
{
    return constraint({numericality: {even: true}})(target, key, descriptor);
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
    constraints.get(object, (criteria, key) => {
        (constraints || (constraints = {}))[key] = criteria;
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

import '../src/length';
import '../src/number';
    
const Address = Base.extend({
    @is.required
    line: '',
    @is.required    
    city: '',
    @is.required
    @has.lengh(2)
    state: '',
    @is.required
    @has.lengh(5)    
    zipcode: '' 
});

const LineItem = Base.extend({
    @is.required
    @is.length(5)
    plu: '',
    @is.onlyInteger
    @is.greaterThan(0)
    quantity: 0
});

const Order = Base.extend({
    @is.required
    @constraint.nested
    address: '',
    @is.required
    @constraint.nested    
    lineItems: [], 
});

const User = Base.extend({
    @has.uniqueUserName
    userName: undefined,
    orders: [],
    constructor(userName) {
        this.userName = userName;
    }
});      

const Database = Base.extend({
    constructor(userNames) {
        this.extend({
            hasUserName(userName) {
                return userNames.indexOf(userName) >= 0;
            }
        });
    }
});

const CustomValidators = Base.extend(customValidator, {
    mustBeUpperCase() {},
    @inject(Database)
    uniqueUserName(db, userName) {
        if (db.hasUserName(userName)) {
            return `UserName ${userName} is already taken`;
        }
    }]
});

describe("customValidator", () => {
    it("should register validators", () => {
        expect(validatejs.validators).to.have.property('mustBeUpperCase');
    });

    it("should register validators on demand", () => {
        CustomValidators.implement({
            uniqueLastName() {}
        });
        expect(validatejs.validators).to.have.property('uniqueLastName');
    });

    it("should register validators with dependencies", () => {
        expect(validatejs.validators).to.have.property('uniqueUserName');
    });
});

describe("ValidateJsCallbackHandler", () => {
    let context;
    beforeEach(() => {
        context = new Context();
        context.addHandlers(new ValidationCallbackHandler, new ValidateJsCallbackHandler);
    });

    describe("#validate", () => {
        it("should validate simple objects", () => {
            const address = new Address,
                  results = Validator(context).validate(address);
            expect(results.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   undefined
            }]);
            expect(results.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   undefined
            }]);
            expect(results.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   undefined
            }]);
            expect(results.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   undefined
            }]);
        });

        it("should validate complex objects", () => {
            const order = new Order();
            order.address   = new Address({
                line:    "100 Tulip Ln",
                city:    "Wantaugh",
                state:   "NY",
                zipcode: "11580"
            });
            order.lineItems = [new LineItem({plu: '12345', quantity: 2})];
            const results = Validator(context).validate(order);
            expect(results.valid).to.be.true;
        });

        it("should invalidate complex objects", () => {
            const order = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            const results = Validator(context).validate(order);
            expect(results.address.line.errors.presence).to.eql([{
                message: "Line can't be blank",
                value:   undefined
            }]);
            expect(results.address.city.errors.presence).to.eql([{
                message: "City can't be blank",
                value:   undefined
            }]);
            expect(results.address.state.errors.presence).to.eql([{
                message: "State can't be blank",
                value:   undefined
            }]);
            expect(results.address.zipcode.errors.presence).to.eql([{
                message: "Zipcode can't be blank",
                value:   undefined
            }]);
            expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                message: "Plu can't be blank",
                value:   undefined
            }]);
            expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                message: "Quantity must be greater than 0",
                value:   0
            }]);
            expect(results.errors.presence).to.deep.include.members([{
                key:     "address.line",
                message: "Line can't be blank",
                value:   undefined
            }, {
                key:     "address.city",
                message: "City can't be blank",
                value:   undefined
            }, {
                key:     "address.state",
                message: "State can't be blank",
                value:   undefined
            }, {
                key:     "address.zipcode",
                message: "Zipcode can't be blank",
                value:   undefined
            }, {
                key:     "lineItems.0.plu",
                message: "Plu can't be blank",
                value:   undefined
            }
            ]);
            expect(results.errors.numericality).to.deep.include.members([{
                key:     "lineItems.0.quantity",
                message: "Quantity must be greater than 0",
                value:   0
            }
            ]);
        });

        it("should pass exceptions through", () => {
            const ThrowValidators = Base.extend(customValidator, {
                  throws() {
                      throw new Error("Oh No!");
                  }}),
                  ThrowOnValidation = Base.extend({
                      @constraint.throws
                      bad: undefined
                  });                
            expect(() => {
                Validator(context).validate(new ThrowOnValidation);
            }).to.throw(Error, "Oh No!");
        });

        it("should validate with dependencies", () => {
            const user     = new User('neo'),
                  database = new Database(['hellboy', 'razor']);
            context.addHandlers(new (CallbackHandler.extend(Invoking, {
                invoke(fn, dependencies) {
                    expect(dependencies[0]).to.equal(Database);
                    dependencies[0] = database;
                    for (let i = 1; i < dependencies.length; ++i) {
                        dependencies[i] = Modifier.unwrap(dependencies[i]);
                    }
                    return fn.apply(null, dependencies);
                }
            })));
            let results = Validator(context).validate(user);
            expect(results.valid).to.be.true;
            user.userName = 'razor';
            results = Validator(context).validate(user);
            expect(results.valid).to.be.false;
        });

        it.only("should dynamically find validators", () => {
            const MissingValidator = Base.extend({
                @is.uniqueCode
                code: undefined
              });
            context.addHandlers((new CallbackHandler).extend({
                @provide("uniqueCode")
                uniqueCode() { return this; },
                validate(value, options, key, attributes) {}
            }));
            expect(Validator(context).validate(new MissingValidator).valid).to.be.true;
        });

        it("should fail if missing validator", () => {
            const MissingValidator = Base.extend({
                @is.uniqueCode
                code: undefined
              });
            expect(() => {
                Validator(context).validate(new MissingValidator);
            }).to.throw(Error, "Unable to resolve validator 'uniqueCode'.");
        });    
    });

    describe("#validateAsync", () => {
        it("should validate simple objects", () => {
            const address = new Address();
            Validator(context).validateAsync(address).then(results => {
                expect(results.line.errors.presence).to.eql([{
                    message: "Line can't be blank",
                    value:   undefined
                }]);
                expect(results.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   undefined
                }]);
                expect(results.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   undefined
                }]);
                expect(results.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   undefined
                }]);
            });
        });

        it("should invalidate complex objects", done => {
            const order = new Order();
            order.address   = new Address;
            order.lineItems = [new LineItem];
            Validator(context).validateAsync(order).then(results => {
                expect(results.address.line.errors.presence).to.eql([{
                    message: "Line can't be blank",
                    value:   undefined
                }]);
                expect(results.address.city.errors.presence).to.eql([{
                    message: "City can't be blank",
                    value:   undefined
                }]);
                expect(results.address.state.errors.presence).to.eql([{
                    message: "State can't be blank",
                    value:   undefined
                }]);
                expect(results.address.zipcode.errors.presence).to.eql([{
                    message: "Zipcode can't be blank",
                    value:   undefined
                }]);
                expect(results["lineItems.0"].plu.errors.presence).to.eql([{
                    message: "Plu can't be blank",
                    value:   undefined
                }]);
                expect(results["lineItems.0"].quantity.errors.numericality).to.eql([{
                    message: "Quantity must be greater than 0",
                    value:   0
                }]);
                expect(results.errors.presence).to.deep.include.members([{
                    key:     "address.line",
                    message: "Line can't be blank",
                    value:   undefined
                }, {
                    key:     "address.city",
                    message: "City can't be blank",
                    value:   undefined
                }, {
                    key:     "address.state",
                    message: "State can't be blank",
                    value:   undefined
                }, {
                    key:     "address.zipcode",
                    message: "Zipcode can't be blank",
                    value:   undefined
                }, {
                    key:     "lineItems.0.plu",
                    message: "Plu can't be blank",
                    value:   undefined
                }
                ]);
                expect(results.errors.numericality).to.deep.include.members([{
                    key:     "lineItems.0.quantity",
                    message: "Quantity must be greater than 0",
                    value:   0
                }
                ]);
                done();
            });
        });
        
        it("should pass exceptions through", done => {
            const ThrowValidators = Base.extend(customValidator, {
                  throwsAsync() {
                      return Promise.reject(new Error("Oh No!"));
                  }}),
                  ThrowOnValidation = Base.extend({
                      @constraint.throwsAsync
                      bad: undefined
                  });
            Validator(context).validateAsync(new ThrowOnValidation).catch(error => {
                expect(error.message).to.equal("Oh No!");
                done();
            });
        });
    });
});
