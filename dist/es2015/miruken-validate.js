'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ValidateJsCallbackHandler = exports.ValidationCallbackHandler = exports.Validator = exports.Validating = exports.$validate = exports.url = exports.required = exports.number = exports.length = exports.email = exports.Validation = exports.applyConstraints = exports.constraint = exports.ValidationResult = exports.validateThat = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _desc, _value, _obj;

exports.customValidator = customValidator;
exports.matches = matches;
exports.includes = includes;
exports.excludes = excludes;
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

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var validateThatMetadataKey = Symbol();

var validateThat = exports.validateThat = _mirukenCore.Metadata.decorator(validateThatMetadataKey, function (target, key, descriptor) {
    if (!(0, _mirukenCore.isDescriptor)(descriptor)) {
        throw new SyntaxError("@validateThat cannot be applied to classes");
    }
    if (key === "constructor") {
        throw new SyntaxError("@validateThat cannot be applied to constructors");
    }
    var value = descriptor.value;

    if (!(0, _mirukenCore.$isFunction)(value)) {
        throw new SyntaxError("@validateThat cannot be applied to methods");
    }
    _mirukenCore.Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, _mirukenCore.True);
    var dependencies = _mirukenCore.inject.get(target, key);
    if (dependencies && dependencies.length > 0) {
        descriptor.value = function (validation, composer) {
            var args = Array.prototype.slice.call(arguments),
                deps = dependencies.concat(args.map(_mirukenCore.$use));
            return (0, _mirukenCore.Invoking)(composer).invoke(value, deps, this);
        };
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

var IGNORE = ["valid", "errors", "addKey", "addError", "reset"];

function _isReservedKey(key) {
    return IGNORE.indexOf(key) >= 0;
}

var constraintMetadataKey = Symbol();

var constraint = exports.constraint = _mirukenCore.Metadata.decorator(constraintMetadataKey, function (target, key, descriptor, constraints) {
    if (constraints.length === 0 || key === "constructor") return;
    var get = descriptor.get;
    var value = descriptor.value;
    var initializer = descriptor.initializer;

    if (!get && !value && !initializer) return;
    var current = _mirukenCore.Metadata.getOrCreateOwn(constraintMetadataKey, target, key, function () {
        return {};
    });
    constraints.forEach(function (constraint) {
        return _mergeConstraints(current, constraint);
    });
});

var applyConstraints = exports.applyConstraints = constraint({ nested: true });

function _mergeConstraints(target, source) {
    Reflect.ownKeys(source).forEach(function (key) {
        var newValue = source[key],
            curValue = target[key];
        if ((0, _mirukenCore.$isPlainObject)(curValue) && !Array.isArray(curValue)) {
            _mergeConstraints(curValue, newValue);
        } else {
            target[key] = Array.isArray(newValue) ? newValue.slice() : newValue;
        }
    });
}

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

var validatorsCount = 0;
var validators = _validate2.default.validators;

function customValidator(target) {
    if (arguments.length > 1) {
        throw new SyntaxError("@customValidator can only be applied to a class");
    }

    var prototype = target.prototype;
    Reflect.ownKeys(prototype).forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(prototype, key);
        if (_isCustomValidator(key, descriptor)) {
            _assignInstanceValidator(target, prototype, key, descriptor);
        }
    });

    Reflect.ownKeys(target).forEach(function (key) {
        var descriptor = Object.getOwnPropertyDescriptor(target, key);
        if (_isCustomValidator(key, descriptor)) {
            _assignStaticValidator(target, key, descriptor);
        }
    });
}

function _isCustomValidator(key, descriptor) {
    if (key === "constructor" || key.startsWith("_")) {
        return false;
    }
    var value = descriptor.value;

    return (0, _mirukenCore.$isFunction)(value) && value.length > 0;
}

function _assignStaticValidator(target, key, descriptor) {
    var value = descriptor.value;
    var dependencies = _mirukenCore.inject.get(target, key);
    if (dependencies && dependencies.length > 0) {
        descriptor.value = function () {
            if (!_mirukenCallback.$composer) {
                throw new Error('@customValidator unable to invoke static method \'' + key + '\' on ' + target.name);
            }

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            var deps = dependencies.concat(args.map(_mirukenCore.$use));
            return (0, _mirukenCore.Invoking)(_mirukenCallback.$composer).invoke(value, deps, target);
        };
    };
    _assignCustomValidator(target, key, descriptor.value);
}

function _assignInstanceValidator(target, prototype, key, descriptor) {
    var dependencies = _mirukenCore.inject.get(prototype, key);
    if (dependencies && dependencies.length > 0) {
        throw new SyntaxError('@customValidator can\'t have dependencies for instance method \'' + key + '\' on ' + target.name);
    }
    descriptor.value = function () {
        var validator = _mirukenCallback.$composer && _mirukenCallback.$composer.resolve(target) || Reflect.construct(target, _mirukenCore.emptyArray);

        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
            args[_key2] = arguments[_key2];
        }

        return validator[key].apply(validator, args);
    };
    _assignCustomValidator(target, key, descriptor.value);
}

function _assignCustomValidator(target, key, fn) {
    var tag = key;
    if (validators.hasOwnProperty(tag)) {
        tag = tag + '-' + validatorsCount++;
    }
    validators[tag] = fn;

    var method = target[key];
    target[key] = function () {
        for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            args[_key3] = arguments[_key3];
        }

        if (args.length === 3 && (0, _mirukenCore.isDescriptor)(args[2])) {
            return (0, _mirukenCore.decorate)(function (t, k, d, options) {
                return constraint(_defineProperty({}, tag, options))(t, k, d);
            }, args);
        }
        if ((0, _mirukenCore.$isFunction)(method)) {
            return method.apply(target, args);
        }
    };
}

var email = exports.email = constraint({ email: true });

var length = exports.length = {
    is: function is(len) {
        return constraint({ length: { is: len } });
    },
    atLeast: function atLeast(len) {
        return constraint({ length: { minimum: len } });
    },
    atMost: function atMost(len) {
        return constraint({ length: { maximum: len } });
    }
};

function matches(pattern, flags) {
    var criteria = { format: pattern };
    if (flags) {
        criteria.flags = flags;
    }
    return constraint(criteria);
}

function includes() {
    for (var _len4 = arguments.length, members = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        members[_key4] = arguments[_key4];
    }

    members = (0, _mirukenCore.$flatten)(members, true);
    return constraint({ inclusion: members });
}

function excludes() {
    for (var _len5 = arguments.length, members = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
        members[_key5] = arguments[_key5];
    }

    members = (0, _mirukenCore.$flatten)(members, true);
    return constraint({ exclusion: members });
}

var number = exports.number = constraint({ numericality: { noStrings: true } });

Object.assign(number, {
    strict: constraint({ numericality: { strict: true } }),
    onlyInteger: constraint({ numericality: { onlyInteger: true } }),
    equalTo: function equalTo(val) {
        return constraint({ numericality: { equalTo: val } });
    },
    greaterThan: function greaterThan(val) {
        return constraint({ numericality: { greaterThan: val } });
    },
    greaterThanOrEqualTo: function greaterThanOrEqualTo(val) {
        return constraint({ numericality: { greaterThanOrEqualTo: val } });
    },
    lessThan: function lessThan(val) {
        return constraint({ numericality: { lessThan: val } });
    },
    lessThanOrEqualTo: function lessThanOrEqualTo(val) {
        return constraint({ numericality: { lessThanOrEqualTo: val } });
    },
    divisibleBy: function divisibleBy(val) {
        return constraint({ numericality: { divisibleBy: val } });
    },

    odd: constraint({ numericality: { odd: true } }),
    even: constraint({ numericality: { even: true } })
});

var required = exports.required = constraint({ presence: true });

var url = exports.url = constraint({ url: true });

Object.assign(url, {
    schemes: function schemes(_schemes) {
        return constraint({ url: { schemes: _schemes } });
    },
    allowLocal: function allowLocal(_allowLocal) {
        return constraint({ url: { allowLocal: _allowLocal } });
    }
});

var $validate = exports.$validate = (0, _mirukenCallback.$define)(_mirukenCore.Variance.Contravariant);

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
    var object = validation.object;
    validateThat.getKeys(object, function (_, key) {
        var validator = object[key],
            returnValue = validator.call(object, validation, composer);
        if (asyncResults && (0, _mirukenCore.$isPromise)(returnValue)) {
            asyncResults.push(returnValue);
        }
    });
}

function _bindValidationResults(object, results) {
    Object.defineProperty(object, "$validation", {
        enumerable: false,
        configurable: true,
        writable: false,
        value: results
    });
}

(0, _mirukenCallback.$handle)(_mirukenCallback.CallbackHandler.prototype, Validation, function (validation, composer) {
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

function validate() {
    for (var _len6 = arguments.length, types = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
        types[_key6] = arguments[_key6];
    }

    return (0, _mirukenCore.decorate)((0, _mirukenCallback.addDefinition)("validate", $validate), types);
}

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
                                validator.validate(child[i], scope, results.addKey(key + "." + i));
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
                var childResults = results.addKey(key + "." + i);
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
    constraint.getKeys(target, function (criteria, key) {
        (constraints || (constraints = {}))[key] = criteria;

        var _loop = function _loop(_name2) {
            if (_name2 === "nested") {
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