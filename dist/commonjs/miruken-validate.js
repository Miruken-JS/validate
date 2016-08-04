'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ValidateJsCallbackHandler = exports.ValidationRegistry = exports.$registerValidators = exports.$nested = exports.$required = exports.ValidationCallbackHandler = exports.Validator = exports.Validating = exports.$validateThat = exports.Validation = exports.$validate = exports.ValidationResult = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.validate = validate;

var _mirukenCore = require('miruken-core');

var _mirukenCallback = require('miruken-callback');

var _validate2 = require('validate.js');

var _validate3 = _interopRequireDefault(_validate2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
                                var error = (0, _mirukenCore.pcopy)(named[ii]);
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

var IGNORE = ['valid', 'errors', 'addKey', 'addError', 'reset'];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
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

(0, _mirukenCallback.$handle)(_mirukenCallback.CallbackHandler, Validation, function (validation, composer) {
    var target = validation.object,
        source = (0, _mirukenCore.$classOf)(target);
    if (source) {
        $validate.dispatch(this, validation, source, composer, true, validation.addAsyncResult);
        var asyncResults = validation.asyncResults;
        if (asyncResults) {
            return Promise.all(asyncResults);
        }
    }
});

var $validateThat = exports.$validateThat = _mirukenCore.MetaMacro.extend({
    get active() {
        return true;
    },
    get inherit() {
        return true;
    },
    execute: function execute(step, metadata, target, definition) {
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
                                var d = dependencies.concat((0, _mirukenCore.$use)(validation), (0, _mirukenCore.$use)(composer));
                                return (0, _mirukenCore.Invoking)(composer).invoke(fn, d, this);
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
            if (step == _mirukenCore.MetaStep.Extend) {
                target.extend(validators);
            } else {
                metadata.type.implement(validators);
            }
        }
    }
});

function validate() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    return (0, _mirukenCore.decorate)((0, _mirukenCallback.addDefinition)($validate), args);
}

var Validating = exports.Validating = _mirukenCore.Protocol.extend({
    validate: function validate(object, scope, results) {},
    validateAsync: function validateAsync(object, scope, results) {}
});

var Validator = exports.Validator = _mirukenCore.StrictProtocol.extend(Validating);

var ValidationCallbackHandler = exports.ValidationCallbackHandler = _mirukenCallback.CallbackHandler.extend(Validator, {
    validate: function validate(object, scope, results) {
        if ((0, _mirukenCore.$isNothing)(object)) {
            throw new TypeError("Missing object to validate.");
        }
        var validation = new Validation(object, false, scope, results);
        _mirukenCallback.$composer.handle(validation, true);
        results = validation.results;
        bindValidationResults(object, results);
        validateThat(validation, null, _mirukenCallback.$composer);
        return results;
    },
    validateAsync: function validateAsync(object, scope, results) {
        if ((0, _mirukenCore.$isNothing)(object)) {
            throw new TypeError("Missing object to validate.");
        }
        var validation = new Validation(object, true, scope, results),
            composer = _mirukenCallback.$composer;
        return composer.deferAll(validation).then(function () {
            results = validation.results;
            bindValidationResults(object, results);
            var asyncResults = [];
            validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0 ? Promise.all(asyncResults).then(function () {
                return results;
            }) : results;
        });
    }
});

function validateThat(validation, asyncResults, composer) {
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

function bindValidationResults(object, results) {
    Object.defineProperty(object, '$validation', {
        enumerable: false,
        configurable: true,
        writable: false,
        value: results
    });
}

_mirukenCallback.CallbackHandler.implement({
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

_validate3.default.Promise = Promise;

var $required = exports.$required = Object.freeze({ presence: true });

var $nested = exports.$nested = Object.freeze({ nested: true });

_validate3.default.validators.nested = _mirukenCore.Undefined;

var $registerValidators = exports.$registerValidators = _mirukenCore.MetaMacro.extend({
    get active() {
        return true;
    },
    get inherit() {
        return true;
    },
    execute: function execute(step, metadata, target, definition) {
        if (step === _mirukenCore.MetaStep.Subclass || step === _mirukenCore.MetaStep.Implement) {
            for (var _name3 in definition) {
                var validator = definition[_name3];
                if (Array.isArray(validator)) {
                    var _ret3 = function () {
                        var dependencies = validator.slice(0);
                        validator = dependencies.pop();
                        if (!(0, _mirukenCore.$isFunction)(validator)) {
                            return 'continue';
                        }
                        if (dependencies.length > 0) {
                            (function () {
                                var fn = validator;
                                validator = function validator() {
                                    if (!_mirukenCallback.$composer) {
                                        throw new Error('Unable to invoke validator \'' + nm + '\'.');
                                    }

                                    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                                        args[_key2] = arguments[_key2];
                                    }

                                    var d = dependencies.concat(args.map(_mirukenCore.$use));
                                    return (0, _mirukenCore.Invoking)(_mirukenCallback.$composer).invoke(fn, d);
                                };
                            })();
                        }
                    }();

                    if (_ret3 === 'continue') continue;
                }
                if ((0, _mirukenCore.$isFunction)(validator)) {
                    _validate3.default.validators[_name3] = validator;
                }
            }
        }
    }
});

var ValidationRegistry = exports.ValidationRegistry = _mirukenCore.Abstract.extend($registerValidators);

var DETAILED = { format: "detailed", cleanAttributes: false },
    VALIDATABLE = { validate: undefined };

var ValidateJsCallbackHandler = exports.ValidateJsCallbackHandler = _mirukenCallback.CallbackHandler.extend({
    $validate: [null, function (validation, composer) {
        var target = validation.object,
            nested = {},
            constraints = buildConstraints(target, nested);
        if (constraints) {
            var _ret5 = function () {
                var scope = validation.scope,
                    results = validation.results,
                    validator = Validator(composer);
                if (validation.isAsync) {
                    return {
                        v: _validate3.default.async(target, constraints, DETAILED).then(function (valid) {
                            return validateNestedAsync(validator, scope, results, nested);
                        }).catch(function (errors) {
                            if (errors instanceof Error) {
                                return Promise.reject(errors);
                            }
                            return validateNestedAsync(validator, scope, results, nested).then(function () {
                                return mapResults(results, errors);
                            });
                        })
                    };
                } else {
                    var errors = (0, _validate3.default)(target, constraints, DETAILED);
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
                    mapResults(results, errors);
                }
            }();

            if ((typeof _ret5 === 'undefined' ? 'undefined' : _typeof(_ret5)) === "object") return _ret5.v;
        }
    }]
});

function validateNestedAsync(validator, scope, results, nested) {
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

function mapResults(results, errors) {
    if (errors) {
        errors.forEach(function (error) {
            return results.addKey(error.attribute).addError(error.validator, {
                message: error.error,
                value: error.value
            });
        });
    }
}

function buildConstraints(target, nested) {
    var meta = (0, _mirukenCore.$meta)(target),
        descriptors = meta && meta.getMetadata(VALIDATABLE);
    var constraints = void 0;
    if (descriptors) {
        for (var key in descriptors) {
            var descriptor = descriptors[key],
                _validate = descriptor.validate;
            (constraints || (constraints = {}))[key] = _validate;

            var _loop = function _loop(_name4) {
                if (_name4 === 'nested') {
                    var child = target[key];
                    if (child) {
                        nested[key] = child;
                    }
                } else if (!(_name4 in _validate3.default.validators)) {
                    _validate3.default.validators[_name4] = function () {
                        var validator = _mirukenCallback.$composer && _mirukenCallback.$composer.resolve(_name4);
                        if (!validator) {
                            throw new Error('Unable to resolve validator \'' + _name4 + '\'.');
                        }
                        return validator.validate.apply(validator, arguments);
                    };
                }
            };

            for (var _name4 in _validate) {
                _loop(_name4);
            }
        }
        return constraints;
    }
}