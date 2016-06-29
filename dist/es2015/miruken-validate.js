'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.$validateThat = exports.Validation = exports.$validate = exports.ValidationResult = exports.ValidationCallbackHandler = exports.Validator = exports.Validating = undefined;

var _mirukenCore = require('miruken-core');

var _mirukrenCallback = require('mirukren-callback');

var _mirukenCallback = require('miruken-callback');

var Validating = exports.Validating = _mirukenCore.Protocol.extend({
    validate: function validate(object, scope, results) {},
    validateAsync: function validateAsync(object, scope, results) {}
});

var Validator = exports.Validator = _mirukenCore.StrictProtocol.extend(Validating);

var ValidationCallbackHandler = exports.ValidationCallbackHandler = _mirukrenCallback.CallbackHandler.extend(Validator, {
    validate: function validate(object, scope, results) {
        if ((0, _mirukenCore.$isNothing)(object)) {
            throw new TypeError("Missing object to validate.");
        }
        var validation = new Validation(object, false, scope, results);
        _mirukrenCallback.$composer.handle(validation, true);
        results = validation.results;
        _bindValidationResults(object, results);
        _validateThat(validation, null, _mirukrenCallback.$composer);
        return results;
    },
    validateAsync: function validateAsync(object, scope, results) {
        if ((0, _mirukenCore.$isNothing)(object)) {
            throw new TypeError("Missing object to validate.");
        }
        var validation = new Validation(object, true, scope, results),
            composer = _mirukrenCallback.$composer;
        return composer.deferAll(validation).then(function () {
            results = validation.results;
            _bindValidationResults(object, results);
            var asyncResults = [];
            _validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0 ? Promise.all(asyncResults).return(results) : results;
        });
    }
});

function _validateThat(validation, asyncResults, composer) {
    var object = validation.object;
    for (var key in object) {
        if (key.lastIndexOf('validateThat', 0) == 0) {
            var validator = object[key],
                returnValue = validator.call(object, validation, composer);
            if (asyncResults && (0, _mirukenCore.$isPromise)(returnValue)) {
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

_mirukrenCallback.CallbackHandler.implement({
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

var ValidationResult = exports.ValidationResult = _mirukenCore.Base.extend({
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
});

function _isReservedKey(key) {
    return key in ValidationResult.prototype;
}

var $validate = exports.$validate = (0, _mirukenCallback.$define)('$validate');

var Validation = exports.Validation = _mirukenCore.Base.extend({
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
                if ((0, _mirukenCore.$isPromise)(result)) {
                    (_asyncResults || (_asyncResults = [])).push(result);
                }
            }
        });
    }
});

$handle(_mirukrenCallback.CallbackHandler, Validation, function (validation, composer) {
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

var $validateThat = exports.$validateThat = _mirukenCore.MetaMacro.extend({
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
                    if (!(0, _mirukenCore.$isFunction)(validator)) {
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
            if ((0, _mirukenCore.$isFunction)(validator)) {
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
});