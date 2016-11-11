'use strict';

System.register(['validate.js', 'miruken-core', 'miruken-callback'], function (_export, _context) {
    "use strict";

    var validatejs, True, Invoking, Metadata, inject, isDescriptor, $isFunction, $use, Variance, decorate, Base, pcopy, $isPlainObject, $isPromise, emptyArray, $flatten, Protocol, StrictProtocol, $isNothing, $classOf, Undefined, addDefinition, $define, $composer, Handler, $handle, _typeof, _desc, _value, _obj, validateThatMetadataKey, validateThat, $validate, ValidationResult, IGNORE, constraintMetadataKey, constraint, applyConstraints, Validation, validatorsCount, validators, email, length, number, required, url, Validating, Validator, ValidationHandler, detailed, validatable, ValidateJsHandler;

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

    function _defineProperty(obj, key, value) {
        if (key in obj) {
            Object.defineProperty(obj, key, {
                value: value,
                enumerable: true,
                configurable: true,
                writable: true
            });
        } else {
            obj[key] = value;
        }

        return obj;
    }

    function validate() {
        for (var _len = arguments.length, types = Array(_len), _key = 0; _key < _len; _key++) {
            types[_key] = arguments[_key];
        }

        return decorate(addDefinition("validate", $validate), types);
    }

    _export('validate', validate);

    function _isReservedKey(key) {
        return IGNORE.indexOf(key) >= 0;
    }

    function _mergeConstraints(target, source) {
        Reflect.ownKeys(source).forEach(function (key) {
            var newValue = source[key],
                curValue = target[key];
            if ($isPlainObject(curValue) && !Array.isArray(curValue)) {
                _mergeConstraints(curValue, newValue);
            } else {
                target[key] = Array.isArray(newValue) ? newValue.slice() : newValue;
            }
        });
    }

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

    _export('customValidator', customValidator);

    function _isCustomValidator(key, descriptor) {
        if (key === "constructor" || key.startsWith("_")) {
            return false;
        }
        var value = descriptor.value;

        return $isFunction(value) && value.length > 0;
    }

    function _assignStaticValidator(target, key, descriptor) {
        var value = descriptor.value;
        var dependencies = inject.get(target, key);
        if (dependencies && dependencies.length > 0) {
            descriptor.value = function () {
                if (!$composer) {
                    throw new Error('@customValidator unable to invoke static method \'' + key + '\' on ' + target.name);
                }

                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                var deps = dependencies.concat(args.map($use));
                return Invoking($composer).invoke(value, deps, target);
            };
        };
        _assignCustomValidator(target, key, descriptor.value);
    }

    function _assignInstanceValidator(target, prototype, key, descriptor) {
        var dependencies = inject.get(prototype, key);
        if (dependencies && dependencies.length > 0) {
            throw new SyntaxError('@customValidator can\'t have dependencies for instance method \'' + key + '\' on ' + target.name);
        }
        descriptor.value = function () {
            var validator = $composer && $composer.resolve(target) || Reflect.construct(target, emptyArray);

            for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                args[_key3] = arguments[_key3];
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
            for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                args[_key4] = arguments[_key4];
            }

            if (args.length === 3 && isDescriptor(args[2])) {
                return decorate(function (t, k, d, options) {
                    return constraint(_defineProperty({}, tag, options))(t, k, d);
                }, args);
            }
            if ($isFunction(method)) {
                return method.apply(target, args);
            }
        };
    }

    function matches(pattern, flags) {
        var criteria = { format: pattern };
        if (flags) {
            criteria.flags = flags;
        }
        return constraint(criteria);
    }

    _export('matches', matches);

    function includes() {
        for (var _len5 = arguments.length, members = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
            members[_key5] = arguments[_key5];
        }

        members = $flatten(members, true);
        return constraint({ inclusion: members });
    }

    _export('includes', includes);

    function excludes() {
        for (var _len6 = arguments.length, members = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
            members[_key6] = arguments[_key6];
        }

        members = $flatten(members, true);
        return constraint({ exclusion: members });
    }

    _export('excludes', excludes);

    function _validateThat(validation, asyncResults, composer) {
        var object = validation.object;
        validateThat.getKeys(object, function (_, key) {
            var validator = object[key],
                returnValue = validator.call(object, validation, composer);
            if (asyncResults && $isPromise(returnValue)) {
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
                } else if (!(_name2 in validatejs.validators)) {
                    validatejs.validators[_name2] = function () {
                        var validator = $composer && $composer.resolve(_name2);
                        if (!validator) {
                            throw new Error('Unable to resolve validator \'' + _name2 + '\'.');
                        }
                        if (!$isFunction(validator.validate)) {
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
    return {
        setters: [function (_validateJs) {
            validatejs = _validateJs.default;
        }, function (_mirukenCore) {
            True = _mirukenCore.True;
            Invoking = _mirukenCore.Invoking;
            Metadata = _mirukenCore.Metadata;
            inject = _mirukenCore.inject;
            isDescriptor = _mirukenCore.isDescriptor;
            $isFunction = _mirukenCore.$isFunction;
            $use = _mirukenCore.$use;
            Variance = _mirukenCore.Variance;
            decorate = _mirukenCore.decorate;
            Base = _mirukenCore.Base;
            pcopy = _mirukenCore.pcopy;
            $isPlainObject = _mirukenCore.$isPlainObject;
            $isPromise = _mirukenCore.$isPromise;
            emptyArray = _mirukenCore.emptyArray;
            $flatten = _mirukenCore.$flatten;
            Protocol = _mirukenCore.Protocol;
            StrictProtocol = _mirukenCore.StrictProtocol;
            $isNothing = _mirukenCore.$isNothing;
            $classOf = _mirukenCore.$classOf;
            Undefined = _mirukenCore.Undefined;
        }, function (_mirukenCallback) {
            addDefinition = _mirukenCallback.addDefinition;
            $define = _mirukenCallback.$define;
            $composer = _mirukenCallback.$composer;
            Handler = _mirukenCallback.Handler;
            $handle = _mirukenCallback.$handle;
        }],
        execute: function () {
            _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
                return typeof obj;
            } : function (obj) {
                return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
            };
            validateThatMetadataKey = Symbol();

            _export('validateThat', validateThat = Metadata.decorator(validateThatMetadataKey, function (target, key, descriptor) {
                if (!isDescriptor(descriptor)) {
                    throw new SyntaxError("@validateThat cannot be applied to classes");
                }
                if (key === "constructor") {
                    throw new SyntaxError("@validateThat cannot be applied to constructors");
                }
                var value = descriptor.value;

                if (!$isFunction(value)) {
                    throw new SyntaxError("@validateThat cannot be applied to methods");
                }
                Metadata.getOrCreateOwn(validateThatMetadataKey, target, key, True);
                var dependencies = inject.get(target, key);
                if (dependencies && dependencies.length > 0) {
                    descriptor.value = function (validation, composer) {
                        var args = Array.prototype.slice.call(arguments),
                            deps = dependencies.concat(args.map($use));
                        return Invoking(composer).invoke(value, deps, this);
                    };
                }
            }));

            _export('validateThat', validateThat);

            _export('$validate', $validate = $define(Variance.Contravariant));

            _export('$validate', $validate);

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

            IGNORE = ["valid", "errors", "addKey", "addError", "reset"];
            constraintMetadataKey = Symbol();

            _export('constraint', constraint = Metadata.decorator(constraintMetadataKey, function (target, key, descriptor, constraints) {
                if (constraints.length === 0 || key === "constructor") return;
                var get = descriptor.get;
                var value = descriptor.value;
                var initializer = descriptor.initializer;

                if (!get && !value && !initializer) return;
                var current = Metadata.getOrCreateOwn(constraintMetadataKey, target, key, function () {
                    return {};
                });
                constraints.forEach(function (constraint) {
                    return _mergeConstraints(current, constraint);
                });
            }));

            _export('constraint', constraint);

            _export('applyConstraints', applyConstraints = constraint({ nested: true }));

            _export('applyConstraints', applyConstraints);

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

            validatorsCount = 0;
            validators = validatejs.validators;

            _export('email', email = constraint({ email: true }));

            _export('email', email);

            _export('length', length = {
                is: function is(len) {
                    return constraint({ length: { is: len } });
                },
                atLeast: function atLeast(len) {
                    return constraint({ length: { minimum: len } });
                },
                atMost: function atMost(len) {
                    return constraint({ length: { maximum: len } });
                }
            });

            _export('length', length);

            _export('number', number = constraint({ numericality: { noStrings: true } }));

            _export('number', number);

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

            _export('required', required = constraint({ presence: true }));

            _export('required', required);

            _export('url', url = constraint({ url: true }));

            _export('url', url);

            Object.assign(url, {
                schemes: function schemes(_schemes) {
                    return constraint({ url: { schemes: _schemes } });
                },
                allowLocal: function allowLocal(_allowLocal) {
                    return constraint({ url: { allowLocal: _allowLocal } });
                }
            });

            _export('Validating', Validating = Protocol.extend({
                validate: function validate(object, scope, results) {},
                validateAsync: function validateAsync(object, scope, results) {}
            }));

            _export('Validating', Validating);

            _export('Validator', Validator = StrictProtocol.extend(Validating));

            _export('Validator', Validator);

            _export('ValidationHandler', ValidationHandler = Handler.extend(Validator, {
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

            _export('ValidationHandler', ValidationHandler);

            $handle(Handler.prototype, Validation, function (validation, composer) {
                var target = validation.object,
                    source = $classOf(target);
                if ($isNothing(source)) {
                    return false;
                }
                $validate.dispatch(this, validation, source, composer, true, validation.addAsyncResult);
                var asyncResults = validation.asyncResults;
                if (asyncResults) {
                    return Promise.all(asyncResults);
                }
            });

            Handler.implement({
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
            validatejs.validators.nested = Undefined;

            detailed = { format: "detailed", cleanAttributes: false };
            validatable = { validate: undefined };

            _export('ValidateJsHandler', ValidateJsHandler = Handler.extend((_obj = {
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
                                    v: validatejs.async(target, constraints, detailed).then(function (valid) {
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
                                var errors = validatejs(target, constraints, detailed);
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
            }, (_applyDecoratedDescriptor(_obj, 'validateJS', [validate], Object.getOwnPropertyDescriptor(_obj, 'validateJS'), _obj)), _obj)));

            _export('ValidateJsHandler', ValidateJsHandler);
        }
    };
});