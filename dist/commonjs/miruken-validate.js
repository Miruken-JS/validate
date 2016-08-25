'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ValidateJsCallbackHandler = exports.ValidationCallbackHandler = exports.Validator = exports.Validating = exports.Validation = exports.$validate = exports.has = exports.is = exports.default = exports.ValidationResult = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _desc, _value, _obj;

exports.validateThat = validateThat;
exports.constraint = constraint;
exports.applyConstraints = applyConstraints;
exports.customValidator = customValidator;
exports.validate = validate;

var _validate = require('validate.js');

var _validate2 = _interopRequireDefault(_validate);

var _mirukenCore = require('miruken-core');

var _mirukenCallback = require('miruken-callback');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var validateThatKey = Symbol(),
    validateThatCriteria = _defineProperty({}, validateThatKey, true);

function validateThat(target, key, descriptor) {
    if (key === 'constructor') return;
    var fn = descriptor.value;
    if (!(0, _mirukenCore.$isFunction)(fn)) return;
    var meta = (0, _mirukenCore.$meta)(target);
    if (meta) {
        meta.defineMetadata(key, validateThatCriteria);
        _mirukenCore.inject.get(target, key, function (dependencies) {
            if (dependencies.length > 0) {
                descriptor.value = function (validation, composer) {
                    var args = Array.prototype.slice.call(arguments),
                        deps = dependencies.concat(args.map(_mirukenCore.$use));
                    return (0, _mirukenCore.Invoking)(composer).invoke(fn, deps, this);
                };
            }
        });
    }
}

validateThat.get = _mirukenCore.metadata.get.bind(undefined, validateThatKey, validateThatCriteria);

exports.default = validateThat;
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
                        _summary[_name] = _errors[_name].slice();
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

var constraintKey = Symbol(),
    criteria = _defineProperty({}, constraintKey, undefined);

function constraint(constraints) {
    return function (target, key, descriptor) {
        if (key === 'constructor') return;
        var get = descriptor.get;
        var value = descriptor.value;
        var initializer = descriptor.initializer;

        if (!get && !value && !initializer) return;
        var meta = (0, _mirukenCore.$meta)(target);
        if (meta) {
            meta.defineMetadata(key, _defineProperty({}, constraintKey, constraints));
        }
    };
}

constraint.get = _mirukenCore.metadata.get.bind(undefined, constraintKey, criteria);

constraint.required = function (target, key, descriptor) {
    return constraint({ presence: true })(target, key, descriptor);
};

function applyConstraints(target, key, descriptor) {
    return constraint({ nested: true })(target, key, descriptor);
}

exports.default = constraint;
exports.is = constraint;
exports.has = constraint;
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

function customValidator() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
    }

    if (args.length === 0) {
        return function () {
            return _customValidator(arguments);
        };
    } else {
        return _customValidator(args);
    }
}

function _customValidator(args) {
    return args.length === 1 ? _customValidatorClass.apply(undefined, _toConsumableArray(args)) : _customValidatorMethod.apply(undefined, _toConsumableArray(args));
}

function _customValidatorClass(target) {
    if ((0, _mirukenCore.$isFunction)(target)) {
        target = target.prototype;
    }
    Reflect.ownKeys(target).forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(target, key);
        _customValidatorMethod(target, key, descriptor);
    });
}

function _customValidatorMethod(target, key, descriptor) {
    if (key === 'constructor') return;
    var fn = descriptor.value;
    if (!(0, _mirukenCore.$isFunction)(fn)) return;
    _mirukenCore.inject.get(target, key, function (dependencies) {
        if (dependencies.length > 0) {
            descriptor.value = function () {
                if (!_mirukenCallback.$composer) {
                    throw new Error('Unable to invoke validator \'' + key + '\'.');
                }

                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                var deps = dependencies.concat(args.map(_mirukenCore.$use));
                return (0, _mirukenCore.Invoking)(_mirukenCallback.$composer).invoke(fn, deps);
            };
        }
    });
    constraint[key] = function () {
        for (var _len3 = arguments.length, options = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            options[_key3] = arguments[_key3];
        }

        return (0, _mirukenCore.decorate)(function (t, k, d) {
            return constraint(_defineProperty({}, key, options))(t, k, d);
        }, options);
    };
    _validate2.default.validators[key] = descriptor.value;
}

exports.default = customValidator;


constraint.exactLength = function (len) {
    return constraint({ length: { is: len } });
};

constraint.minimumLength = function (len) {
    return constraint({ length: { minimum: len } });
};

constraint.maximumLength = function (len) {
    return constraint({ length: { maximum: len } });
};

constraint.number = function (target, key, descriptor) {
    return constraint({ numericality: { noStrings: true } })(target, key, descriptor);
};

constraint.strictNumber = function (target, key, descriptor) {
    return constraint({ numericality: { strict: true } })(target, key, descriptor);
};

constraint.onlyInteger = function (target, key, descriptor) {
    return constraint({ numericality: { onlyInteger: true } })(target, key, descriptor);
};

constraint.equalTo = function (val) {
    return constraint({ numericality: { equalTo: val } });
};

constraint.greaterThan = function (val) {
    return constraint({ numericality: { greaterThan: val } });
};

constraint.greaterThanOrEqualTo = function (val) {
    return constraint({ numericality: { greaterThanOrEqualTo: val } });
};

constraint.lessThan = function (val) {
    return constraint({ numericality: { lessThan: val } });
};

constraint.lessThanOrEqualTo = function (val) {
    return constraint({ numericality: { lessThanOrEqualTo: val } });
};

constraint.divisibleBy = function (val) {
    return constraint({ numericality: { divisibleBy: val } });
};

constraint.odd = function (target, key, descriptor) {
    return constraint({ numericality: { odd: true } })(target, key, descriptor);
};

constraint.even = function (target, key, descriptor) {
    return constraint({ numericality: { even: true } })(target, key, descriptor);
};

constraint.required = function (target, key, descriptor) {
    return constraint({ presence: true })(target, key, descriptor);
};

function validate() {
    for (var _len4 = arguments.length, types = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        types[_key4] = arguments[_key4];
    }

    return (0, _mirukenCore.decorate)((0, _mirukenCallback.addDefinition)($validate), types);
}

exports.default = validate;
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
        _bindValidationResults(object, results);
        _validateThat(validation, null, _mirukenCallback.$composer);
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
            _bindValidationResults(object, results);
            var asyncResults = [];
            _validateThat(validation, asyncResults, composer);
            return asyncResults.length > 0 ? Promise.all(asyncResults).then(function () {
                return results;
            }) : results;
        });
    }
});

function _validateThat(validation, asyncResults, composer) {
    var object = validation.object,
        matches = validateThat.get(object, function (_, key) {
        var validator = object[key],
            returnValue = validator.call(object, validation, composer);
        if (asyncResults && (0, _mirukenCore.$isPromise)(returnValue)) {
            asyncResults.push(returnValue);
        }
    });
}

function _bindValidationResults(object, results) {
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

_validate2.default.Promise = Promise;
_validate2.default.validators.nested = _mirukenCore.Undefined;

var detailed = { format: "detailed", cleanAttributes: false },
    validatable = { validate: undefined };

var ValidateJsCallbackHandler = exports.ValidateJsCallbackHandler = _mirukenCallback.CallbackHandler.extend((_obj = {
    validateJS: function validateJS(validation, composer) {
        var target = validation.object,
            nested = {},
            constraints = buildConstraints(target, nested);
        if (constraints) {
            var _ret = function () {
                var scope = validation.scope,
                    results = validation.results,
                    validator = Validator(composer);
                if (validation.isAsync) {
                    return {
                        v: _validate2.default.async(target, constraints, detailed).then(function (valid) {
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
                    var errors = (0, _validate2.default)(target, constraints, detailed);
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

            if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
        }
    }
}, (_applyDecoratedDescriptor(_obj, 'validateJS', [validate], Object.getOwnPropertyDescriptor(_obj, 'validateJS'), _obj)), _obj));

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
    var constraints = void 0;
    constraint.get(target, function (criteria, key) {
        (constraints || (constraints = {}))[key] = criteria;

        var _loop = function _loop(_name2) {
            if (_name2 === 'nested') {
                var child = target[key];
                if (child) {
                    nested[key] = child;
                }
            } else if (!(_name2 in _validate2.default.validators)) {
                _validate2.default.validators[_name2] = function () {
                    var validator = _mirukenCallback.$composer && _mirukenCallback.$composer.resolve(_name2);
                    if (!validator) {
                        throw new Error('Unable to resolve validator \'' + _name2 + '\'.');
                    }
                    if (!(0, _mirukenCore.$isFunction)(validator.validate)) {
                        throw new Error('Validator \'' + _name2 + '\' is missing \'validate\' method.');
                    }
                    return validator.validate.apply(validator, arguments);
                };
            }
        };

        for (var _name2 in criteria) {
            _loop(_name2);
        }
    });
    return constraints;
}