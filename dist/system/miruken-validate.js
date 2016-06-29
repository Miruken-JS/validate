'use strict';

System.register(['miruken-core', 'miruken-callback', 'validate.js'], function (_export, _context) {
    "use strict";

    var Base, pcopy, True, MetaStep, MetaMacro, Invoking, $isFunction, $isPromise, $classOf, $use, Protocol, StrictProtocol, $isNothing, Undefined, Abstract, Metadata, $define, $handle, CallbackHandler, $composer, validatejs, _typeof, ValidationResult, IGNORE, $validate, Validation, $validateThat, Validating, Validator, ValidationCallbackHandler, $required, $nested, $registerValidators, ValidationRegistry, DETAILED, VALIDATABLE, ValidateJsCallbackHandler;

    function _isReservedKey(key) {
        return IGNORE.indexOf(key) >= 0;
    }

    function _validateThat(validation, asyncResults, composer) {
        var object = validation.object;
        for (var key in object) {
            if (key.lastIndexOf('validateThat', 0) == 0) {
                var validator = object[key],
                    returnValue = validator.call(object, validation, composer);
                if (asyncResults && $isPromise(returnValue)) {
                    asyncResults.push(returnValue);
                }
            }
        }
    }

    function _bindValidationResults(object, results) {
        Object.defineProperty(object, '$validation', {
            enumerable: false,
            configurable: true,
            writable: false,
            value: results
        });
    }

    function _validateNestedAsync(validator, scope, results, nested) {
        var pending = [];
        for (var key in nested) {
            var child = nested[key];
            if (Array.isArray(child)) {
                for (var i = 0; i < child.length; ++i) {
                    var childResults = results.addKey(key + '.' + i);
                    childResults = validator.validateAsync(child[i], scope, childResults);
                    pending.push(childResults);
                }
            } else {
                var _childResults = results.addKey(key);
                _childResults = validator.validateAsync(child, scope, _childResults);
                pending.push(_childResults);
            }
        }
        return Promise.all(pending);
    }

    function _mapResults(results, errors) {
        if (errors) {
            errors.forEach(function (error) {
                results.addKey(error.attribute).addError(error.validator, {
                    message: error.error,
                    value: error.value
                });
            });
        }
    }

    function _buildConstraints(target, nested) {
        var meta = target[Metadata],
            descriptors = meta && meta.getDescriptor(VALIDATABLE);
        var constraints = void 0;
        if (descriptors) {
            for (var key in descriptors) {
                var descriptor = descriptors[key],
                    validate = descriptor.validate;
                (constraints || (constraints = {}))[key] = validate;

                var _loop = function _loop(_name4) {
                    if (_name4 === 'nested') {
                        var child = target[key];
                        if (child) {
                            nested[key] = child;
                        }
                    } else if (!(_name4 in validatejs.validators)) {
                        validatejs.validators[_name4] = function () {
                            var validator = $composer && $composer.resolve(_name4);
                            if (!validator) {
                                throw new Error('Unable to resolve validator \'' + _name4 + '\'.');
                            }
                            return validator.validate.apply(validator, arguments);
                        };
                    }
                };

                for (var _name4 in validate) {
                    _loop(_name4);
                }
            }
            return constraints;
        }
    }
    return {
        setters: [function (_mirukenCore) {
            Base = _mirukenCore.Base;
            pcopy = _mirukenCore.pcopy;
            True = _mirukenCore.True;
            MetaStep = _mirukenCore.MetaStep;
            MetaMacro = _mirukenCore.MetaMacro;
            Invoking = _mirukenCore.Invoking;
            $isFunction = _mirukenCore.$isFunction;
            $isPromise = _mirukenCore.$isPromise;
            $classOf = _mirukenCore.$classOf;
            $use = _mirukenCore.$use;
            Protocol = _mirukenCore.Protocol;
            StrictProtocol = _mirukenCore.StrictProtocol;
            $isNothing = _mirukenCore.$isNothing;
            Undefined = _mirukenCore.Undefined;
            Abstract = _mirukenCore.Abstract;
            Metadata = _mirukenCore.Metadata;
        }, function (_mirukenCallback) {
            $define = _mirukenCallback.$define;
            $handle = _mirukenCallback.$handle;
            CallbackHandler = _mirukenCallback.CallbackHandler;
            $composer = _mirukenCallback.$composer;
        }, function (_validateJs) {
            validatejs = _validateJs.default;
        }],
        execute: function () {
            _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
                return typeof obj;
            } : function (obj) {
                return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
            };

            _export('ValidationResult', ValidationResult = Base.extend({
                constructor: function constructor() {
                    var _errors = void 0,
                        _summary = void 0;
                    this.extend({
                        get valid() {
                            if (_errors || _summary) {
                                return false;
                            }
                            var ownKeys = Object.getOwnPropertyNames(this);
                            for (var i = 0; i < ownKeys.length; ++i) {
                                var key = ownKeys[i];
                                if (_isReservedKey(key)) {
                                    continue;
                                }
                                var result = this[key];
                                if (result instanceof ValidationResult && !result.valid) {
                                    return false;
                                }
                            }
                            return true;
                        },

                        get errors() {
                            if (_summary) {
                                return _summary;
                            }
                            if (_errors) {
                                _summary = {};
                                for (var _name in _errors) {
                                    _summary[_name] = _errors[_name].slice(0);
                                }
                            }
                            var ownKeys = Object.getOwnPropertyNames(this);
                            for (var i = 0; i < ownKeys.length; ++i) {
                                var key = ownKeys[i];
                                if (_isReservedKey(key)) {
                                    continue;
                                }
                                var result = this[key],
                                    errors = result instanceof ValidationResult && result.errors;
                                if (errors) {
                                    _summary = _summary || {};
                                    for (name in errors) {
                                        var named = errors[name];
                                        var existing = _summary[name];
                                        for (var ii = 0; ii < named.length; ++ii) {
                                            var error = pcopy(named[ii]);
                                            error.key = error.key ? key + "." + error.key : key;
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
                        addKey: function addKey(key) {
                            return this[key] || (this[key] = new ValidationResult());
                        },
                        addError: function addError(name, error) {
                            var errors = _errors || (_errors = {}),
                                named = errors[name];
                            if (named) {
                                named.push(error);
                            } else {
                                errors[name] = [error];
                            }
                            _summary = null;
                            return this;
                        },
                        reset: function reset() {
                            _errors = _summary = undefined;
                            var ownKeys = Object.getOwnPropertyNames(this);
                            for (var i = 0; i < ownKeys.length; ++i) {
                                var key = ownKeys[i];
                                if (_isReservedKey(key)) {
                                    continue;
                                }
                                var result = this[key];
                                if (result instanceof ValidationResult) {
                                    delete this[key];
                                }
                            }
                            return this;
                        }
                    });
                }
            }));

            _export('ValidationResult', ValidationResult);

            IGNORE = ['valid', 'errors', 'addKey', 'addError', 'reset'];

            _export('$validate', $validate = $define('$validate'));

            _export('$validate', $validate);

            _export('Validation', Validation = Base.extend({
                constructor: function constructor(object, async, scope, results) {
                    var _asyncResults = void 0;
                    async = !!async;
                    results = results || new ValidationResult();
                    this.extend({
                        get isAsync() {
                            return async;
                        },

                        get object() {
                            return object;
                        },

                        get scope() {
                            return scope;
                        },

                        get results() {
                            return results;
                        },

                        get asyncResults() {
                            return _asyncResults;
                        },
                        addAsyncResult: function addAsyncResult(result) {
                            if ($isPromise(result)) {
                                (_asyncResults || (_asyncResults = [])).push(result);
                            }
                        }
                    });
                }
            }));

            _export('Validation', Validation);

            $handle(CallbackHandler, Validation, function (validation, composer) {
                var target = validation.object,
                    source = $classOf(target);
                if (source) {
                    $validate.dispatch(this, validation, source, composer, true, validation.addAsyncResult);
                    var asyncResults = validation.asyncResults;
                    if (asyncResults) {
                        return Promise.all(asyncResults);
                    }
                }
            });

            _export('$validateThat', $validateThat = MetaMacro.extend({
                execute: function _(step, metadata, target, definition) {
                    var validateThat = this.extractProperty('$validateThat', target, definition);
                    if (!validateThat) {
                        return;
                    }
                    var validators = {};
                    for (var _name2 in validateThat) {
                        var validator = validateThat[_name2];
                        if (Array.isArray(validator)) {
                            var _ret = function () {
                                var dependencies = validator.slice(0);
                                validator = dependencies.pop();
                                if (!$isFunction(validator)) {
                                    return 'continue';
                                }
                                if (dependencies.length > 0) {
                                    (function () {
                                        var fn = validator;
                                        validator = function validator(validation, composer) {
                                            var d = dependencies.concat($use(validation), $use(composer));
                                            return Invoking(composer).invoke(fn, d, this);
                                        };
                                    })();
                                }
                            }();

                            if (_ret === 'continue') continue;
                        }
                        if ($isFunction(validator)) {
                            _name2 = 'validateThat' + _name2.charAt(0).toUpperCase() + _name2.slice(1);
                            validators[_name2] = validator;
                        }
                        if (step == MetaStep.Extend) {
                            target.extend(validators);
                        } else {
                            metadata.type.implement(validators);
                        }
                    }
                },

                shouldInherit: True,

                isActive: True
            }));

            _export('$validateThat', $validateThat);

            _export('Validating', Validating = Protocol.extend({
                validate: function validate(object, scope, results) {},
                validateAsync: function validateAsync(object, scope, results) {}
            }));

            _export('Validating', Validating);

            _export('Validator', Validator = StrictProtocol.extend(Validating));

            _export('Validator', Validator);

            _export('ValidationCallbackHandler', ValidationCallbackHandler = CallbackHandler.extend(Validator, {
                validate: function validate(object, scope, results) {
                    if ($isNothing(object)) {
                        throw new TypeError("Missing object to validate.");
                    }
                    var validation = new Validation(object, false, scope, results);
                    $composer.handle(validation, true);
                    results = validation.results;
                    _bindValidationResults(object, results);
                    _validateThat(validation, null, $composer);
                    return results;
                },
                validateAsync: function validateAsync(object, scope, results) {
                    if ($isNothing(object)) {
                        throw new TypeError("Missing object to validate.");
                    }
                    var validation = new Validation(object, true, scope, results),
                        composer = $composer;
                    return composer.deferAll(validation).then(function () {
                        results = validation.results;
                        _bindValidationResults(object, results);
                        var asyncResults = [];
                        _validateThat(validation, asyncResults, composer);
                        return asyncResults.length > 0 ? Promise.all(asyncResults).then(function () {
                            return results;
                        }) : results;
                    });
                }
            }));

            _export('ValidationCallbackHandler', ValidationCallbackHandler);

            CallbackHandler.implement({
                $valid: function $valid(target, scope) {
                    return this.aspect(function (_, composer) {
                        return Validator(composer).validate(target, scope).valid;
                    });
                },
                $validAsync: function $validAsync(target, scope) {
                    return this.aspect(function (_, composer) {
                        return Validator(composer).validateAsync(target, scope).then(function (results) {
                            return results.valid;
                        });
                    });
                }
            });

            validatejs.Promise = Promise;

            _export('$required', $required = Object.freeze({ presence: true }));

            _export('$required', $required);

            _export('$nested', $nested = Object.freeze({ nested: true }));

            _export('$nested', $nested);

            validatejs.validators.nested = Undefined;

            _export('$registerValidators', $registerValidators = MetaMacro.extend({
                execute: function execute(step, metadata, target, definition) {
                    if (step === MetaStep.Subclass || step === MetaStep.Implement) {
                        for (var _name3 in definition) {
                            var validator = definition[_name3];
                            if (Array.isArray(validator)) {
                                var _ret3 = function () {
                                    var dependencies = validator.slice(0);
                                    validator = dependencies.pop();
                                    if (!$isFunction(validator)) {
                                        return 'continue';
                                    }
                                    if (dependencies.length > 0) {
                                        (function () {
                                            var fn = validator;
                                            validator = function validator() {
                                                if (!$composer) {
                                                    throw new Error('Unable to invoke validator \'' + nm + '\'.');
                                                }

                                                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                                                    args[_key] = arguments[_key];
                                                }

                                                var d = dependencies.concat(args.map($use));
                                                return Invoking($composer).invoke(fn, d);
                                            };
                                        })();
                                    }
                                }();

                                if (_ret3 === 'continue') continue;
                            }
                            if ($isFunction(validator)) {
                                validatejs.validators[_name3] = validator;
                            }
                        }
                    }
                },

                shouldInherit: True,

                isActive: True
            }));

            _export('$registerValidators', $registerValidators);

            _export('ValidationRegistry', ValidationRegistry = Abstract.extend($registerValidators));

            _export('ValidationRegistry', ValidationRegistry);

            DETAILED = { format: "detailed", cleanAttributes: false };
            VALIDATABLE = { validate: undefined };

            _export('ValidateJsCallbackHandler', ValidateJsCallbackHandler = CallbackHandler.extend({
                $validate: [null, function (validation, composer) {
                    var target = validation.object,
                        nested = {},
                        constraints = _buildConstraints(target, nested);
                    if (constraints) {
                        var _ret5 = function () {
                            var scope = validation.scope,
                                results = validation.results,
                                validator = Validator(composer);
                            if (validation.isAsync) {
                                return {
                                    v: validatejs.async(target, constraints, DETAILED).then(function (valid) {
                                        return _validateNestedAsync(validator, scope, results, nested);
                                    }).catch(function (errors) {
                                        if (errors instanceof Error) {
                                            return Promise.reject(errors);
                                        }
                                        return _validateNestedAsync(validator, scope, results, nested).then(function () {
                                            _mapResults(results, errors);
                                        });
                                    })
                                };
                            } else {
                                var errors = validatejs(target, constraints, DETAILED);
                                for (var key in nested) {
                                    var child = nested[key];
                                    if (Array.isArray(child)) {
                                        for (var i = 0; i < child.length; ++i) {
                                            validator.validate(child[i], scope, results.addKey(key + '.' + i));
                                        }
                                    } else {
                                        validator.validate(child, scope, results.addKey(key));
                                    }
                                }
                                _mapResults(results, errors);
                            }
                        }();

                        if ((typeof _ret5 === 'undefined' ? 'undefined' : _typeof(_ret5)) === "object") return _ret5.v;
                    }
                }]
            }));

            _export('ValidateJsCallbackHandler', ValidateJsCallbackHandler);
        }
    };
});