'use strict';

System.register(['miruken-core', 'mirukren-callback', 'miruken-callback'], function (_export, _context) {
    "use strict";

    var Protocol, StrictProtocol, $isNothing, Base, MetaMacro, $isFunction, $isPromise, CallbackHandler, $composer, $define, Validating, Validator, ValidationCallbackHandler, ValidationResult, $validate, Validation, $validateThat;


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

    function _isReservedKey(key) {
        return key in ValidationResult.prototype;
    }

    return {
        setters: [function (_mirukenCore) {
            Protocol = _mirukenCore.Protocol;
            StrictProtocol = _mirukenCore.StrictProtocol;
            $isNothing = _mirukenCore.$isNothing;
            Base = _mirukenCore.Base;
            MetaMacro = _mirukenCore.MetaMacro;
            $isFunction = _mirukenCore.$isFunction;
            $isPromise = _mirukenCore.$isPromise;
        }, function (_mirukrenCallback) {
            CallbackHandler = _mirukrenCallback.CallbackHandler;
            $composer = _mirukrenCallback.$composer;
        }, function (_mirukenCallback) {
            $define = _mirukenCallback.$define;
        }],
        execute: function () {
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
                        return asyncResults.length > 0 ? Promise.all(asyncResults).return(results) : results;
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
        }
    };
});